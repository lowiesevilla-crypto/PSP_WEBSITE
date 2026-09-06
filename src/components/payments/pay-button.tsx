"use client";

import { SplitPaymentAction } from "@/components/payments/split-payment-action";

export function PayButton({
  assessmentId,
  outstanding,
  category,
  disabledReason,
}: {
  assessmentId: string;
  outstanding: string;
  category: "DUES" | "CONTRIBUTION" | "OTHER";
  disabledReason?: string;
}) {
  return (
    <SplitPaymentAction
      category={category}
      chapterAmount={outstanding}
      assessmentId={assessmentId}
      disabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
    />
  );
}
