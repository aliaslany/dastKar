import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, formatToman } from "../../lib/api";

type Order = {
  id: string;
  status: string;
  total_toman: number;
  shipping_name: string;
  shipping_city: string;
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

export default function ShopOrders() {
  const { shop } = useOutletContext<{ shop: { id: string } }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  function load() {
    api.get<{ orders: Order[] }>(`/shops/${shop.id}/orders`).then((d) => setOrders(d.orders));
  }

  useEffect(load, [shop.id]);

  async function setStatus(orderId: string, status: string) {
    await api.patch(`/orders/${orderId}/status`, { status, trackingNumber: tracking[orderId] });
    load();
  }

  return (
    <div>
      <h2 className="font-bold mb-4">سفارش‌های دریافتی</h2>
      {orders.length === 0 ? (
        <p className="text-ink/50">هنوز سفارشی دریافت نکرده‌اید.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-lg border border-ink/10 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{o.shipping_name} — {o.shipping_city}</p>
                  <p className="text-xs text-ink/50">
                    سفارش {o.id.slice(0, 12)} · {new Date(o.created_at).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-semibold">{formatToman(o.total_toman)}</p>
                  <p className="text-xs text-ink/60">{STATUS_FA[o.status] ?? o.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  placeholder="کد رهگیری پستی"
                  value={tracking[o.id] ?? o.tracking_number ?? ""}
                  onChange={(e) => setTracking({ ...tracking, [o.id]: e.target.value })}
                  className="border border-ink/20 rounded-lg px-3 py-1.5 text-sm flex-1"
                />
                <select
                  onChange={(e) => e.target.value && setStatus(o.id, e.target.value)}
                  defaultValue=""
                  className="border border-ink/20 rounded-lg px-3 py-1.5 text-sm bg-white"
                >
                  <option value="" disabled>تغییر وضعیت</option>
                  <option value="paid">پرداخت‌شده</option>
                  <option value="shipped">ارسال‌شده</option>
                  <option value="delivered">تحویل‌شده</option>
                  <option value="cancelled">لغو سفارش</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
