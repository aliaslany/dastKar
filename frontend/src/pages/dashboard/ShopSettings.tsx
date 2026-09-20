import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";

type ShopFull = {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  city: string | null;
  policy_shipping: string | null;
  policy_returns: string | null;
  bank_iban: string | null;
  bank_owner_name: string | null;
};

export default function ShopSettings() {
  const { shop } = useOutletContext<{ shop: { id: string } }>();
  const [form, setForm] = useState<Partial<ShopFull>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ shop: ShopFull }>(`/shops/${shop.id}`).catch(() => null);
  }, [shop.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await api.patch(`/shops/${shop.id}`, form);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-bold mb-4">تنظیمات فروشگاه</h2>
      <form onSubmit={submit} className="bg-white rounded-lg border border-ink/10 p-6 space-y-4 max-w-xl">
        <input
          placeholder="نام فروشگاه"
          defaultValue=""
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="شعار فروشگاه"
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          placeholder="درباره فروشگاه"
          onChange={(e) => setForm({ ...form, about: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={4}
        />
        <textarea
          placeholder="سیاست ارسال کالا"
          onChange={(e) => setForm({ ...form, policy_shipping: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={2}
        />
        <textarea
          placeholder="سیاست بازگشت کالا"
          onChange={(e) => setForm({ ...form, policy_returns: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={2}
        />

        <div className="border-t border-ink/10 pt-4">
          <h3 className="font-medium text-sm mb-1">اطلاعات دریافت وجه</h3>
          <p className="text-xs text-ink/50 mb-3">
            سهم شما از هر سفارش مستقیماً و خودکار توسط زرین‌پال به این شماره شبا واریز می‌شود. بدون ثبت شبا،
            فروشگاه شما نمی‌تواند سفارش دریافت کند.
          </p>
          <input
            placeholder="شماره شبا (مثال: IR820540102680020817909002)"
            dir="ltr"
            onChange={(e) => setForm({ ...form, bank_iban: e.target.value })}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm text-left mb-3"
          />
          <input
            placeholder="نام صاحب حساب (باید با نام قانونی شما یکسان باشد)"
            onChange={(e) => setForm({ ...form, bank_owner_name: e.target.value })}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          disabled={busy}
          className="bg-firouzeh text-white font-semibold rounded-full px-6 py-2.5 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
        >
          {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
        {saved && <p className="text-firouzeh-dark text-sm">تغییرات ذخیره شد.</p>}
      </form>
    </div>
  );
}
