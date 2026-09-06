export const PENDING_LINKED_WEBHOOK_SECRET = "__PSP_PENDING_LINKED_WEBHOOK__";

export type ChapterPaymentConfigurationState =
  | "NOT_CONFIGURED"
  | "DRAFT"
  | "READY"
  | "ENABLED"
  | "BLOCKED";

export function isPendingLinkedWebhookSecret(value: string | null | undefined) {
  return !value || value === PENDING_LINKED_WEBHOOK_SECRET;
}
