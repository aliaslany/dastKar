import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, imageUrl, formatToman } from "../lib/api";
import { useAuth } from "../lib/auth";
import Seo, { SITE_URL } from "../components/Seo";

type Listing = {
  id: string;
  title: string;
  description: string;
  price_toman: number;
  quantity: number;
  materials: string | null;
  processing_days: number;
  rating_avg: number;
  rating_count: number;
};
type Image = { id: string; r2_key: string; alt_text: string | null };
type Shop = { id: string; slug: string; name: string; logo_url: string | null; rating_avg: number };
type Review = { id: string; rating: number; comment: string | null; display_name: string; created_at: string };

export default function Product() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ listing: Listing; images: Image[]; shop: Shop }>(`/listings/${id}`)
      .then((d) => {
        setListing(d.listing);
        setImages(d.images);
        setShop(d.shop);
      });
    api.get<{ reviews: Review[] }>(`/reviews/listing/${id}`).then((d) => setReviews(d.reviews));
  }, [id]);

  async function addToCart() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!listing) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post("/cart", { listingId: listing.id, quantity: qty });
      setMessage("به سبد خرید افزوده شد.");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!listing) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink/50">در حال بارگذاری...</div>;

  const mainImage = images[0] ? imageUrl(images[0].r2_key) : undefined;
  const shortDescription =
    listing.description.length > 155 ? `${listing.description.slice(0, 155)}…` : listing.description;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
      <Seo
        title={listing.title}
        description={shortDescription}
        path={`/product/${listing.id}`}
        image={mainImage}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: listing.title,
          description: listing.description,
          image: images.map((img) => imageUrl(img.r2_key)),
          ...(shop ? { brand: { "@type": "Brand", name: shop.name } } : {}),
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/product/${listing.id}`,
            priceCurrency: "IRR",
            price: listing.price_toman * 10, // schema.org wants an ISO currency; Toman has none, Rial does
            availability:
              listing.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
          ...(listing.rating_count > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: listing.rating_avg,
                  reviewCount: listing.rating_count,
                },
              }
            : {}),
        }}
      />
      <div>
        <div className="aspect-square rounded-lg overflow-hidden bg-firouzeh-light mb-3">
          {images[activeImg] ? (
            <img src={imageUrl(images[activeImg].r2_key)} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-firouzeh/40">بدون تصویر</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 ${i === activeImg ? "border-firouzeh" : "border-transparent"}`}
              >
                <img src={imageUrl(img.r2_key)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {shop && (
          <Link to={`/shop/${shop.slug}`} className="text-sm text-firouzeh-dark font-medium hover:underline">
            فروشگاه {shop.name}
          </Link>
        )}
        <h1 className="text-2xl font-bold mt-2 mb-3">{listing.title}</h1>
        {!!listing.rating_count && (
          <div className="flex items-center gap-1 text-sm text-ink/60 mb-3">
            <span className="text-saffron">★</span>
            <span>{listing.rating_avg.toFixed(1)}</span>
            <span>({new Intl.NumberFormat("fa-IR").format(listing.rating_count)} نظر)</span>
          </div>
        )}
        <div className="text-2xl font-bold text-ink mb-4">{formatToman(listing.price_toman)}</div>

        <p className="text-ink/80 leading-relaxed whitespace-pre-line mb-6">{listing.description}</p>

        {listing.materials && (
          <p className="text-sm text-ink/60 mb-2">
            <span className="font-medium">مواد اولیه: </span>
            {listing.materials}
          </p>
        )}
        <p className="text-sm text-ink/60 mb-6">
          <span className="font-medium">زمان آماده‌سازی: </span>
          {new Intl.NumberFormat("fa-IR").format(listing.processing_days)} روز
        </p>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-ink/70">تعداد:</label>
          <input
            type="number"
            min={1}
            max={listing.quantity}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="w-20 border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-xs text-ink/50">
            {listing.quantity > 0 ? `${new Intl.NumberFormat("fa-IR").format(listing.quantity)} عدد موجود` : "ناموجود"}
          </span>
        </div>

        <button
          onClick={addToCart}
          disabled={busy || listing.quantity < 1}
          className="w-full bg-firouzeh text-white font-semibold rounded-full py-3 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
        >
          {listing.quantity < 1 ? "ناموجود" : "افزودن به سبد خرید"}
        </button>
        {message && <p className="text-sm text-firouzeh-dark mt-2">{message}</p>}

        {reviews.length > 0 && (
          <div className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-bold mb-4">نظرات خریداران</h2>
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{r.display_name}</span>
                    <span className="text-saffron">{"★".repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-ink/70">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
