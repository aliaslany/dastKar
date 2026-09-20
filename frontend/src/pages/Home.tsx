import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import GirihDivider from "../components/GirihDivider";
import Seo, { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION } from "../components/Seo";

type Category = { id: string; slug: string; name_fa: string };
type Listing = {
  id: string;
  title: string;
  price_toman: number;
  imageKey: string | null;
  rating_avg: number;
  rating_count: number;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ categories: Category[] }>("/categories"),
      api.get<{ listings: Listing[] }>("/listings?sort=newest"),
    ])
      .then(([catData, listData]) => {
        setCategories(catData.categories);
        setListings(listData.listings);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Seo
        title={SITE_NAME}
        description={DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      {/* Hero: the thesis of the marketplace — handmade goods, made by name-able people */}
      <section className="relative overflow-hidden bg-firouzeh-dark text-parchment">
        <div className="absolute inset-0 bg-girih opacity-30" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-saffron-light text-sm tracking-widest mb-4">بازار صنایع‌دستی و آثار هنری</p>
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-6">
            هر اثر، دست یک هنرمند را <br className="hidden md:block" /> روی خودش دارد
          </h1>
          <p className="max-w-xl mx-auto text-parchment/80 mb-8 leading-relaxed">
            دستکار محلی است برای صنعتگران ایرانی تا کارهای دست‌ساز، سفال، بافتنی، جواهرات و آثار هنری‌شان
            را مستقیم به دست شما برسانند.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/search"
              className="bg-saffron text-ink font-semibold rounded-full px-6 py-3 hover:bg-saffron-dark hover:text-parchment transition-colors"
            >
              گشت‌وگذار در محصولات
            </Link>
            <Link
              to="/register"
              className="border border-parchment/40 rounded-full px-6 py-3 hover:bg-parchment/10 transition-colors"
            >
              شروع فروش
            </Link>
          </div>
        </div>
      </section>

      <GirihDivider className="text-saffron my-2" />

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold mb-5">دسته‌بندی‌ها</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${cat.slug}`}
              className="bg-white border border-ink/10 rounded-lg p-4 text-center text-sm font-medium hover:border-firouzeh hover:text-firouzeh-dark transition-colors"
            >
              {cat.name_fa}
            </Link>
          ))}
        </div>
      </section>

      {/* Newest listings */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold mb-5">تازه‌ترین محصولات</h2>
        {loading ? (
          <p className="text-ink/50">در حال بارگذاری...</p>
        ) : listings.length === 0 ? (
          <p className="text-ink/50">هنوز محصولی ثبت نشده است. اولین فروشنده باشید!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        )}
      </section>
    </div>
  );
}
