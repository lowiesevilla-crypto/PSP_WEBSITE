import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

function parseSignatureHeader(header: string) {
  const values = new Map<string, string>();
  for (const part of header.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length > 0) values.set(key, rest.join("="));
  }
  return values;
}

export function verifyPayMongoSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  nowMs?: number;
}) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim();
  if (!secret || !input.signatureHeader) return false;

  const parts = parseSignatureHeader(input.signatureHeader);
  const timestampText = parts.get("t");
  if (!timestampText) return false;

  const timestamp = Number(timestampText);
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestamp) > DEFAULT_TOLERANCE_SECONDS) return false;

  const live = process.env.PAYMONGO_SECRET_KEY?.trim().startsWith("sk_live_") ?? false;
  const received = parts.get(live ? "li" : "te");
  if (!received) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampText}.${input.rawBody}`, "utf8")
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  } catch {
    return false;
  }
}

interface JsonRecord {
  [key: string]: unknown;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parsePayMongoCheckoutPaidEvent(payload: unknown) {
  const root = record(payload);
  const data = record(root?.data);
  const eventAttributes = record(data?.attributes);
  const eventType = stringValue(eventAttributes?.type);
  if (eventType !== "checkout_session.payment.paid") return null;

  const resource = record(eventAttributes?.data);
  const resourceAttributes = record(resource?.attributes);
  const metadata = record(resourceAttributes?.metadata);
  const payments = Array.isArray(resourceAttributes?.payments)
    ? resourceAttributes?.payments
    : [];
  const firstPayment = record(payments[0]);
  const firstPaymentAttributes = record(firstPayment?.attributes);

  const eventId = stringValue(data?.id);
  const sessionId = stringValue(resource?.id);
  const referenceNumber =
    stringValue(resourceAttributes?.reference_number) ??
    stringValue(metadata?.internal_reference);
  const paymentId = stringValue(firstPayment?.id);
  const paymentStatus = stringValue(firstPaymentAttributes?.status);
  const amount =
    typeof firstPaymentAttributes?.amount === "number"
      ? firstPaymentAttributes.amount
      : null;

  if (!eventId || !sessionId || !referenceNumber) return null;

  return {
    eventId,
    eventType,
    sessionId,
    referenceNumber,
    paymentId,
    paymentStatus,
    amount,
  };
}
