import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatToman } from "../lib/api";
import { useAuth } from "../lib/auth";
import NoIndex from "../components/NoIndex";

type Order = {
  id: string;
  shop_name: string;
  shop_slug: string;
  status: string;
  total_toman: number;
  created_at: string;
  tracking_number: string | null;
};

const STATUS_FA: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  refunded: "بازپرداخت‌شده",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [params] = useSearchParams();
  const justPlaced = params.get("justPlaced");

  useEffect(() => {
    if (user) api.get<{ orders: Order[] }>("/orders").then((d) => setOrders(d.orders));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-ink/60 mb-4">برای مشاهده سفارش‌ها ابتدا وارد شوید.</p>
        <Link to="/login" className="bg-firouzeh text-white rounded-full px-6 py-2 font-medium">ورود</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <NoIndex />
      <h1 className="text-xl font-bold mb-6">سفارش‌های من</h1>
      {justPlaced && (
        <div className="bg-firouzeh-light text-firouzeh-dark rounded-lg p-4 mb-6 text-sm">
          سفارش شما با موفقیت ثبت شد. شماره سفارش: {justPlaced}
        </div>
      )}
      {orders.length === 0 ? (
        <p className="text-ink/50">هنوز سفارشی ثبت نکرده‌اید.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="bg-white rounded-lg border border-ink/10 p-4 flex items-center justify-between">
              <div>
                <Link to={`/shop/${o.shop_slug}`} className="font-medium text-firouzeh-dark hover:underline">
                  {o.shop_name}
                </Link>
                <p className="text-xs text-ink/50 mt-1">
                  سفارش {o.id.slice(0, 12)} · {new Date(o.created_at).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <div className="text-left">
                <p className="font-semibold">{formatToman(o.total_toman)}</p>
                <p className="text-xs text-ink/60">{STATUS_FA[o.status] ?? o.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
