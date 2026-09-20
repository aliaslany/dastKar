import { Link } from "react-router-dom";
import { imageUrl, formatToman } from "../lib/api";

type Props = {
  id: string;
  title: string;
  priceToman: number;
  imageKey?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

export default function ProductCard({ id, title, priceToman, imageKey, ratingAvg, ratingCount }: Props) {
  return (
    <Link
      to={`/product/${id}`}
      className="group flex flex-col rounded-lg overflow-hidden bg-white border border-ink/10 hover:border-firouzeh/50 hover:shadow-lg transition-all duration-200"
    >
      <div className="aspect-square bg-firouzeh-light overflow-hidden">
        {imageKey ? (
          <img
            src={imageUrl(imageKey)}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-firouzeh/40 text-sm">بدون تصویر</div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="text-sm text-ink font-medium line-clamp-2 leading-relaxed">{title}</h3>
        {!!ratingCount && (
          <div className="flex items-center gap-1 text-xs text-ink/60">
            <span className="text-saffron">★</span>
            <span>{ratingAvg?.toFixed(1)}</span>
            <span>({new Intl.NumberFormat("fa-IR").format(ratingCount)})</span>
          </div>
        )}
        <div className="mt-auto pt-1 font-semibold text-ink">{formatToman(priceToman)}</div>
      </div>
    </Link>
  );
}
