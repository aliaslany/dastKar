import { Link } from "react-router-dom";
import { imageUrl } from "../lib/api";

type Props = { slug: string; name: string; tagline?: string | null; logoUrl?: string | null; ratingAvg?: number };

export default function ShopCard({ slug, name, tagline, logoUrl, ratingAvg }: Props) {
  return (
    <Link
      to={`/shop/${slug}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ink/10 hover:border-firouzeh/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-saffron-light overflow-hidden flex items-center justify-center text-saffron-dark font-bold shrink-0">
        {logoUrl ? <img src={imageUrl(logoUrl)} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-ink truncate">{name}</div>
        {tagline && <div className="text-xs text-ink/60 truncate">{tagline}</div>}
        {!!ratingAvg && <div className="text-xs text-saffron-dark">★ {ratingAvg.toFixed(1)}</div>}
      </div>
    </Link>
  );
}
