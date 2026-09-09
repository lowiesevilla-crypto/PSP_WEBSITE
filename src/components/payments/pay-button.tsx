"use client";

import { SplitPaymentAction, type PaymentMethod } from "@/components/payments/split-payment-action";

export function PayButton({
  assessmentId,
  outstanding,
  category,
  availableMethods,
  disabledReason,
}: {
  assessmentId: string;
  outstanding: string;
  category: "DUES" | "CONTRIBUTION" | "OTHER";
  availableMethods: PaymentMethod[];
  disabledReason?: string;
}) {
  return (
    <SplitPaymentAction
      category={category}
      chapterAmount={outstanding}
      assessmentId={assessmentId}
      availableMethods={availableMethods}
      disabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
    />
  );
}
