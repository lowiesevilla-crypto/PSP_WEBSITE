"use client";

import { SplitPaymentAction } from "@/components/payments/split-payment-action";

export function PayButton({
  assessmentId,
  outstanding,
  category,
}: {
  assessmentId: string;
  outstanding: string;
  category: "DUES" | "CONTRIBUTION" | "OTHER";
}) {
  return (
    <SplitPaymentAction
      category={category}
      chapterAmount={outstanding}
      assessmentId={assessmentId}
    />
  );
}
