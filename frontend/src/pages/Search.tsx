import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import Seo from "../components/Seo";

type Listing = {
  id: string;
  title: string;
  price_toman: number;
  imageKey: string | null;
  rating_avg: number;
  rating_count: number;
};

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (category) qs.set("category", category);
    qs.set("sort", sort);
    api
      .get<{ listings: Listing[] }>(`/listings?${qs.toString()}`)
      .then((d) => setListings(d.listings))
      .finally(() => setLoading(false));
  }, [q, category, sort]);

  function updateSort(newSort: string) {
    const next = new URLSearchParams(params);
    next.set("sort", newSort);
    navigate(`/search?${next.toString()}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Seo
        title={q ? `جستجو: ${q}` : category ? `دسته‌بندی ${category}` : "همه محصولات"}
        path={`/search${q ? `?q=${encodeURIComponent(q)}` : category ? `?category=${category}` : ""}`}
        // Free-text keyword searches produce thin, duplicate-ish pages that
        // aren't worth indexing individually; category browse pages are
        // stable, useful landing pages and should be indexed normally.
        noindex={!!q}
      />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold">
          {q ? `نتایج جستجو برای «${q}»` : category ? "محصولات این دسته" : "همه محصولات"}
        </h1>
        <select
          value={sort}
          onChange={(e) => updateSort(e.target.value)}
          className="border border-ink/20 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="newest">جدیدترین</option>
          <option value="popular">محبوب‌ترین</option>
          <option value="price_asc">ارزان‌ترین</option>
          <option value="price_desc">گران‌ترین</option>
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">در حال جستجو...</p>
      ) : listings.length === 0 ? (
        <p className="text-ink/50">محصولی با این مشخصات پیدا نشد.</p>
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
    </div>
  );
}
