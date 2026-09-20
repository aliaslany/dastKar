import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { imageUrl } from "../lib/api";
import Seo, { SITE_URL } from "../components/Seo";

type ShopT = {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  banner_url: string | null;
  logo_url: string | null;
  city: string | null;
  rating_avg: number;
  rating_count: number;
};
type Listing = { id: string; title: string; price_toman: number; imageKey: string | null; rating_avg: number; rating_count: number };

export default function Shop() {
  const { slug } = useParams();
  const [shop, setShop] = useState<ShopT | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!slug) return;
    api.get<{ shop: ShopT }>(`/shops/${slug}`).then((d) => {
      setShop(d.shop);
      api.get<{ listings: Listing[] }>(`/listings?shop=${d.shop.id}`).then((ld) => setListings(ld.listings));
    });
  }, [slug]);

  if (!shop) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink/50">در حال بارگذاری...</div>;

  return (
    <div>
      <Seo
        title={shop.name}
        description={shop.tagline || shop.about || undefined}
        path={`/shop/${slug}`}
        image={shop.logo_url ? imageUrl(shop.logo_url) : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: shop.name,
          description: shop.about ?? shop.tagline ?? undefined,
          url: `${SITE_URL}/shop/${slug}`,
          ...(shop.city ? { address: { "@type": "PostalAddress", addressLocality: shop.city, addressCountry: "IR" } } : {}),
          ...(shop.rating_count > 0
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: shop.rating_avg, reviewCount: shop.rating_count } }
            : {}),
        }}
      />
      <div className="h-48 bg-saffron-light overflow-hidden">
        {shop.banner_url && <img src={imageUrl(shop.banner_url)} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="max-w-6xl mx-auto px-4 -mt-10">
        <div className="bg-white rounded-lg border border-ink/10 p-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-firouzeh-light overflow-hidden flex items-center justify-center text-2xl font-bold text-firouzeh-dark shrink-0">
            {shop.logo_url ? <img src={imageUrl(shop.logo_url)} alt="" className="w-full h-full object-cover" /> : shop.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{shop.name}</h1>
            {shop.tagline && <p className="text-ink/60 text-sm">{shop.tagline}</p>}
            <div className="flex items-center gap-3 text-xs text-ink/50 mt-1">
              {shop.city && <span>{shop.city}</span>}
              {!!shop.rating_count && (
                <span className="text-saffron-dark">★ {shop.rating_avg.toFixed(1)} ({shop.rating_count})</span>
              )}
            </div>
          </div>
        </div>

        {shop.about && <p className="mt-6 text-ink/80 leading-relaxed max-w-2xl">{shop.about}</p>}

        <h2 className="text-lg font-bold mt-8 mb-4">محصولات فروشگاه</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
          {listings.map((l) => (
            <ProductCard
              key={l.id}
              id={l.id}
              title={l.title}
              priceToman={l.price_toman}
              imageKey={l.imageKey}
              ratingAvg={l.rating_avg}
              ratingCount={l.rating_count}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
