import { PaymentReturnStatus } from "@/components/payments/payment-return-status";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref = "" } = await searchParams;
  return (
    <main className="app-shell">
      <div className="container app-main" style={{ paddingTop: 56 }}>
        <PaymentReturnStatus reference={ref} />
      </div>
    </main>
  );
}
