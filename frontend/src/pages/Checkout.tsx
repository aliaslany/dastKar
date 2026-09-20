import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, imageUrl, formatToman } from "../lib/api";
import NoIndex from "../components/NoIndex";

type CartItem = {
  cart_item_id: string;
  quantity: number;
  listing_id: string;
  title: string;
  price_toman: number;
  shop_id: string;
  shop_name: string;
  image_key: string | null;
};

export default function Checkout() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", postalCode: "", phone: "", note: "" });

  useEffect(() => {
    api.get<{ items: CartItem[] }>("/cart").then((d) => setItems(d.items.filter((i) => i.shop_id === shopId)));
  }, [shopId]);

  const subtotal = items.reduce((sum, i) => sum + i.price_toman * i.quantity, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.address || !form.city || !form.phone) {
      setError("لطفاً همه فیلدهای الزامی را پر کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ orderId: string; total: number; paymentUrl?: string; error?: string }>(
        "/orders/checkout",
        {
          shopId,
          items: items.map((i) => ({ listingId: i.listing_id, quantity: i.quantity })),
          shipping: form,
        }
      );
      if (res.paymentUrl) {
        // Redirect the whole page to ZarinPal's gateway — this isn't an
        // embedded widget like Stripe Elements, it's a full navigation away
        // and ZarinPal sends the buyer back to /orders/verify afterwards.
        window.location.href = res.paymentUrl;
      } else {
        navigate(`/orders?justPlaced=${res.orderId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-ink/50">سبد خرید این فروشگاه خالی است.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <NoIndex />
      <h1 className="text-xl font-bold mb-6">تکمیل خرید — فروشگاه {items[0].shop_name}</h1>

      <div className="bg-white rounded-lg border border-ink/10 p-4 mb-6">
        <ul className="divide-y divide-ink/10">
          {items.map((item) => (
            <li key={item.cart_item_id} className="py-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-md bg-firouzeh-light overflow-hidden shrink-0">
                {item.image_key && <img src={imageUrl(item.image_key)} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-ink/60">
                  {new Intl.NumberFormat("fa-IR").format(item.quantity)} عدد × {formatToman(item.price_toman)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between pt-3 border-t border-ink/10 font-semibold">
          <span>جمع کل</span>
          <span>{formatToman(subtotal)}</span>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-lg border border-ink/10 p-4 space-y-4">
        <h2 className="font-medium">آدرس ارسال</h2>
        <input
          placeholder="نام و نام خانوادگی گیرنده"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          placeholder="آدرس کامل"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="شهر"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="کد پستی (اختیاری)"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            className="border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="شماره تماس"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          placeholder="یادداشت برای فروشنده (اختیاری)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={2}
        />

        {error && <p className="text-madder text-sm">{error}</p>}

        <button
          disabled={busy}
          className="w-full bg-firouzeh text-white font-semibold rounded-full py-3 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
        >
          {busy ? "در حال ثبت سفارش..." : `پرداخت ${formatToman(subtotal)}`}
        </button>
      </form>
    </div>
  );
}
