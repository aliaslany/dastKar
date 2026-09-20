import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api, formatToman } from "../../lib/api";

type Listing = { id: string; title: string; price_toman: number; quantity: number; status: string };

const STATUS_FA: Record<string, string> = {
  active: "فعال",
  draft: "پیش‌نویس",
  sold_out: "ناموجود",
  archived: "بایگانی‌شده",
};

export default function Listings() {
  const { shop } = useOutletContext<{ shop: { id: string } }>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ listings: Listing[] }>(`/listings?shop=${shop.id}&sort=newest`).then((d) => setListings(d.listings)).finally(() => setLoading(false));
  }, [shop.id]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">محصولات فروشگاه</h2>
        <Link to="/dashboard/listings/new" className="bg-firouzeh text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-firouzeh-dark">
          + افزودن محصول
        </Link>
      </div>
      {loading ? (
        <p className="text-ink/50">در حال بارگذاری...</p>
      ) : listings.length === 0 ? (
        <p className="text-ink/50">هنوز محصولی اضافه نکرده‌اید.</p>
      ) : (
        <div className="bg-white rounded-lg border border-ink/10 divide-y divide-ink/10">
          {listings.map((l) => (
            <div key={l.id} className="p-4 flex items-center justify-between">
              <span className="font-medium">{l.title}</span>
              <div className="flex items-center gap-4 text-sm text-ink/60">
                <span>{formatToman(l.price_toman)}</span>
                <span>{new Intl.NumberFormat("fa-IR").format(l.quantity)} عدد</span>
                <span className="px-2 py-0.5 rounded-full bg-firouzeh-light text-firouzeh-dark text-xs">
                  {STATUS_FA[l.status] ?? l.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
