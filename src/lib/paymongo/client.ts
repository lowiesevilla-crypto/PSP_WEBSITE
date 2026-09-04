import { Prisma } from "@prisma/client";

const PAYMONGO_API = "https://api.paymongo.com/v2";

function livePaymentsEnabled() {
  return process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true";
}

function getSecretKey() {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  if (!key) throw new Error("PayMongo is not configured.");
  if (key.startsWith("sk_live_") && !livePaymentsEnabled()) {
    throw new Error("PayMongo live processing is disabled until production approval.");
  }
  return key;
}

export function configuredPaymentMethods() {
  const raw =
    process.env.PAYMONGO_PAYMENT_METHODS ??
    process.env.PAYMONGO_CHECKOUT_METHODS ??
    "qrph";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function amountToCentavos(amount: Prisma.Decimal) {
  if (amount.lte(0)) throw new Error("Payment amount must be greater than zero.");
  const cents = amount.mul(100);
  if (!cents.isInteger()) throw new Error("Payment amount has unsupported fractional centavos.");
  const number = cents.toNumber();
  if (!Number.isSafeInteger(number)) throw new Error("Payment amount is outside the supported range.");
  return number;
}

interface CreateCheckoutInput {
  amount: Prisma.Decimal;
  description: string;
  referenceNumber: string;
  memberId: string;
  assessmentId?: string | null;
  chapterId: string;
  paymentCategory?: "DUES" | "CONTRIBUTION" | "OTHER";
  idempotencyKey: string;
  gatewayConfig?: {
    secretKey: string;
    paymentMethods: string[];
  };
}

export async function createPayMongoCheckout(input: CreateCheckoutInput) {
  const secret = input.gatewayConfig?.secretKey ?? getSecretKey();
  const methods = input.gatewayConfig?.paymentMethods?.length
    ? input.gatewayConfig.paymentMethods
    : configuredPaymentMethods();
  if (secret.startsWith("sk_live_") && !livePaymentsEnabled()) {
    throw new Error("PayMongo live processing is disabled until production approval.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) throw new Error("Application URL is not configured.");

  const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: undefined,
          cancel_url: `${appUrl}/payments/cancelled?ref=${encodeURIComponent(input.referenceNumber)}`,
          success_url: `${appUrl}/payments/success?ref=${encodeURIComponent(input.referenceNumber)}`,
          description: input.description.slice(0, 255),
          line_items: [
            {
              currency: "PHP",
              amount: amountToCentavos(input.amount),
              description: input.description.slice(0, 255),
              name: input.description.slice(0, 127),
              quantity: 1,
            },
          ],
          payment_method_types: methods,
          reference_number: input.referenceNumber,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          metadata: {
            internal_reference: input.referenceNumber,
            member_id: input.memberId,
            chapter_id: input.chapterId,
            assessment_id: input.assessmentId ?? "",
            payment_category: input.paymentCategory ?? "OTHER",
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          id?: string;
          attributes?: { checkout_url?: string };
        };
        errors?: Array<{ detail?: string; code?: string }>;
      }
    | null;

  if (!response.ok || !payload?.data?.id || !payload.data.attributes?.checkout_url) {
    const detail = payload?.errors?.[0]?.detail ?? "PayMongo checkout creation failed.";
    throw new Error(detail);
  }

  return {
    sessionId: payload.data.id,
    checkoutUrl: payload.data.attributes.checkout_url,
  };
}
