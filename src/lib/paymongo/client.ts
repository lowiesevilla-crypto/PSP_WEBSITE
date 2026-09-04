import { Prisma } from "@prisma/client";

const PAYMONGO_V1_API = "https://api.paymongo.com/v1";

export function amountToCentavos(amount: Prisma.Decimal) {
  if (amount.lte(0)) throw new Error("Payment amount must be greater than zero.");
  const cents = amount.mul(100);
  if (!cents.isInteger()) throw new Error("Payment amount has unsupported fractional centavos.");
  const number = cents.toNumber();
  if (!Number.isSafeInteger(number)) throw new Error("Payment amount is outside the supported range.");
  return number;
}

function authHeaders(secretKey: string, accountId: string, idempotencyKey?: string) {
  return {
    Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    "Account-Id": accountId,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
}

type PayMongoErrorPayload = {
  errors?: Array<{ detail?: string; code?: string }>;
};

async function readPayload<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as (T & PayMongoErrorPayload) | null;
  if (!response.ok) {
    throw new Error(payload?.errors?.[0]?.detail ?? `PayMongo request failed with HTTP ${response.status}.`);
  }
  return payload;
}

export type LinkedPaymentMethod = "qrph" | "gcash" | "paymaya";

export async function createLinkedSplitPaymentIntent(input: {
  secretKey: string;
  childAccountId: string;
  platformAccountId: string;
  baseCentavos: number;
  platformFeeCentavos: number;
  grossCentavos: number;
  description: string;
  referenceNumber: string;
  memberId: string;
  chapterId: string;
  paymentCategory: "DUES" | "CONTRIBUTION" | "OTHER";
  paymentMethod: LinkedPaymentMethod;
  idempotencyKey: string;
}) {
  const response = await fetch(`${PAYMONGO_V1_API}/payment_intents`, {
    method: "POST",
    headers: authHeaders(input.secretKey, input.childAccountId, input.idempotencyKey),
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.grossCentavos,
          currency: "PHP",
          capture_type: "automatic",
          payment_method_allowed: [input.paymentMethod],
          split_payment: {
            recipients: [
              {
                merchant_id: input.platformAccountId,
                split_type: "fixed",
                value: input.platformFeeCentavos,
              },
            ],
            transfer_to: input.childAccountId,
          },
          description: input.description.slice(0, 255),
          metadata: {
            internal_reference: input.referenceNumber,
            member_id: input.memberId,
            chapter_id: input.chapterId,
            payment_category: input.paymentCategory,
            chapter_amount_centavos: String(input.baseCentavos),
            platform_fee_centavos: String(input.platformFeeCentavos),
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = await readPayload<{
    data?: { id?: string; attributes?: { client_key?: string; status?: string } };
  }>(response);
  const id = payload?.data?.id;
  const clientKey = payload?.data?.attributes?.client_key;
  if (!id || !clientKey) throw new Error("PayMongo did not return a usable Payment Intent.");
  return { id, clientKey, status: payload?.data?.attributes?.status ?? "awaiting_payment_method" };
}

export async function createLinkedPaymentMethod(input: {
  secretKey: string;
  childAccountId: string;
  method: LinkedPaymentMethod;
  billing?: { name?: string; email?: string; phone?: string | null };
}) {
  const response = await fetch(`${PAYMONGO_V1_API}/payment_methods`, {
    method: "POST",
    headers: authHeaders(input.secretKey, input.childAccountId),
    body: JSON.stringify({
      data: {
        attributes: {
          type: input.method,
          ...(input.method === "qrph" ? { expiry_seconds: 1800 } : {}),
          billing: {
            name: input.billing?.name || undefined,
            email: input.billing?.email || undefined,
            phone: input.billing?.phone || undefined,
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = await readPayload<{ data?: { id?: string } }>(response);
  const id = payload?.data?.id;
  if (!id) throw new Error("PayMongo did not return a usable Payment Method.");
  return { id };
}

export async function attachLinkedPaymentMethod(input: {
  secretKey: string;
  childAccountId: string;
  paymentIntentId: string;
  paymentMethodId: string;
  clientKey: string;
  returnUrl: string;
}) {
  const response = await fetch(`${PAYMONGO_V1_API}/payment_intents/${encodeURIComponent(input.paymentIntentId)}/attach`, {
    method: "POST",
    headers: authHeaders(input.secretKey, input.childAccountId),
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: input.paymentMethodId,
          client_key: input.clientKey,
          return_url: input.returnUrl,
        },
      },
    }),
    cache: "no-store",
  });

  const payload = await readPayload<{
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        next_action?: {
          redirect?: { url?: string; return_url?: string };
          code?: { image_url?: string; test_url?: string };
        } | null;
      };
    };
  }>(response);
  const attributes = payload?.data?.attributes;
  if (!payload?.data?.id || !attributes) throw new Error("PayMongo returned an invalid Payment Intent attachment response.");

  const redirectUrl = attributes.next_action?.redirect?.url;
  const qrImageUrl = attributes.next_action?.code?.image_url;
  const testUrl = attributes.next_action?.code?.test_url;

  return {
    paymentIntentId: payload.data.id,
    status: attributes.status ?? "processing",
    actionType: redirectUrl ? ("redirect" as const) : qrImageUrl ? ("qr" as const) : ("none" as const),
    actionUrl: redirectUrl ?? null,
    qrImageUrl: qrImageUrl ?? null,
    testUrl: testUrl ?? null,
  };
}

export async function createLinkedWebhook(input: {
  secretKey: string;
  childAccountId: string;
  url: string;
}) {
  const response = await fetch(`${PAYMONGO_V1_API}/webhooks`, {
    method: "POST",
    headers: authHeaders(input.secretKey, input.childAccountId),
    body: JSON.stringify({
      data: {
        attributes: {
          url: input.url,
          events: ["payment.paid", "payment.failed"],
        },
      },
    }),
    cache: "no-store",
  });

  const payload = await readPayload<{
    data?: { id?: string; attributes?: { secret_key?: string; status?: string } };
  }>(response);
  const id = payload?.data?.id;
  const secret = payload?.data?.attributes?.secret_key;
  if (!id || !secret) throw new Error("PayMongo did not return the child webhook signing secret.");
  return { id, secret, status: payload?.data?.attributes?.status ?? "enabled" };
}
