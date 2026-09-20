import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import NoIndex from "../components/NoIndex";

type VerifyResult = { status: string; orderId: string; refId?: string; error?: string };

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = params.get("orderId");
    const authority = params.get("Authority");
    const status = params.get("Status");
    if (!orderId || !authority) {
      setResult({ status: "error", orderId: "" });
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams({ orderId, Authority: authority, Status: status ?? "" });
    api
      .get<VerifyResult>(`/orders/verify?${qs.toString()}`)
      .then(setResult)
      .catch((err) => setResult({ status: "error", orderId, error: err.message }))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-ink/60">
        <NoIndex />
        در حال بررسی نتیجه پرداخت با زرین‌پال...
      </div>
    );
  }

  const isPaid = result?.status === "paid";

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <NoIndex />
      {isPaid ? (
        <>
          <div className="w-16 h-16 rounded-full bg-firouzeh-light text-firouzeh-dark text-3xl flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-xl font-bold mb-2">پرداخت با موفقیت انجام شد</h1>
          {result?.refId && <p className="text-sm text-ink/60 mb-6">کد پیگیری: {result.refId}</p>}
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-madder/10 text-madder text-3xl flex items-center justify-center mx-auto mb-4">
            ✕
          </div>
          <h1 className="text-xl font-bold mb-2">پرداخت انجام نشد</h1>
          <p className="text-sm text-ink/60 mb-6">
            {result?.error ?? "تراکنش توسط شما یا درگاه پرداخت لغو شد. موجودی محصولات به سبد بازگردانده شد."}
          </p>
        </>
      )}
      <Link to="/orders" className="bg-firouzeh text-white rounded-full px-6 py-2.5 font-medium hover:bg-firouzeh-dark transition-colors">
        مشاهده سفارش‌های من
      </Link>
    </div>
  );
}
