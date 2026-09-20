import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import NoIndex from "../../components/NoIndex";

type Shop = { id: string; name: string; slug: string };

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [shopForm, setShopForm] = useState({ name: "", tagline: "", city: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (!user?.isSeller) {
      setShop(null);
      return;
    }
    // In a fuller build this would fetch "my shop" directly; for the MVP we
    // store the shop id in localStorage right after creation.
    const cached = localStorage.getItem("dastkar_shop");
    if (cached) setShop(JSON.parse(cached));
  }, [user]);

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.post<{ shop: any }>("/shops", shopForm);
      localStorage.setItem("dastkar_shop", JSON.stringify({ id: data.shop.id, name: data.shop.name, slug: data.shop.slug }));
      setShop({ id: data.shop.id, name: data.shop.name, slug: data.shop.slug });
    } finally {
      setBusy(false);
    }
  }

  if (loading || shop === undefined) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/50">در حال بارگذاری...</div>;

  if (!shop) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <NoIndex />
        <h1 className="text-xl font-bold mb-2">فروشگاه خود را باز کنید</h1>
        <p className="text-ink/60 text-sm mb-6">در چند ثانیه فروشگاه‌تان را بسازید و شروع به فروش کنید.</p>
        <form onSubmit={createShop} className="bg-white rounded-lg border border-ink/10 p-6 space-y-4">
          <input
            placeholder="نام فروشگاه"
            value={shopForm.name}
            onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="شعار فروشگاه (اختیاری)"
            value={shopForm.tagline}
            onChange={(e) => setShopForm({ ...shopForm, tagline: e.target.value })}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="شهر"
            value={shopForm.city}
            onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="w-full bg-firouzeh text-white font-semibold rounded-full py-2.5 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
          >
            {busy ? "..." : "باز کردن فروشگاه"}
          </button>
        </form>
      </div>
    );
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-full text-sm font-medium ${isActive ? "bg-firouzeh text-white" : "hover:bg-firouzeh-light"}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <NoIndex />
      <h1 className="text-xl font-bold mb-1">پنل فروشگاه {shop.name}</h1>
      <p className="text-sm text-ink/50 mb-6">دستکار.com/shop/{shop.slug}</p>
      <nav className="flex gap-2 mb-6 flex-wrap">
        <NavLink to="/dashboard" end className={tabClass}>خلاصه</NavLink>
        <NavLink to="/dashboard/listings" className={tabClass}>محصولات</NavLink>
        <NavLink to="/dashboard/orders" className={tabClass}>سفارش‌ها</NavLink>
        <NavLink to="/dashboard/settings" className={tabClass}>تنظیمات فروشگاه</NavLink>
      </nav>
      <Outlet context={{ shop }} />
    </div>
  );
}
