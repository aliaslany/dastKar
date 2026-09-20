import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, imageUrl, formatToman } from "../lib/api";
import { useAuth } from "../lib/auth";
import NoIndex from "../components/NoIndex";

type CartItem = {
  cart_item_id: string;
  quantity: number;
  listing_id: string;
  title: string;
  price_toman: number;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  image_key: string | null;
};

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get<{ items: CartItem[] }>("/cart").then((d) => setItems(d.items)).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  async function updateQty(itemId: string, quantity: number) {
    if (quantity < 1) return;
    await api.patch(`/cart/${itemId}`, { quantity });
    load();
  }

  async function removeItem(itemId: string) {
    await api.delete(`/cart/${itemId}`);
    load();
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-ink/60 mb-4">برای مشاهده سبد خرید ابتدا وارد شوید.</p>
        <Link to="/login" className="bg-firouzeh text-white rounded-full px-6 py-2 font-medium">ورود</Link>
      </div>
    );
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink/50">در حال بارگذاری...</div>;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-ink/60 mb-4">سبد خرید شما خالی است.</p>
        <Link to="/search" className="bg-firouzeh text-white rounded-full px-6 py-2 font-medium">مشاهده محصولات</Link>
      </div>
    );
  }

  // Group by shop — checkout happens per-shop, like Etsy
  const groups = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.shop_id] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <NoIndex />
      <h1 className="text-xl font-bold mb-6">سبد خرید</h1>
      <div className="space-y-8">
        {Object.entries(groups).map(([shopId, groupItems]) => {
          const subtotal = groupItems.reduce((sum, i) => sum + i.price_toman * i.quantity, 0);
          return (
            <div key={shopId} className="bg-white rounded-lg border border-ink/10 p-4">
              <Link to={`/shop/${groupItems[0].shop_slug}`} className="font-medium text-firouzeh-dark hover:underline">
                فروشگاه {groupItems[0].shop_name}
              </Link>
              <ul className="divide-y divide-ink/10 mt-3">
                {groupItems.map((item) => (
                  <li key={item.cart_item_id} className="py-3 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md bg-firouzeh-light overflow-hidden shrink-0">
                      {item.image_key && <img src={imageUrl(item.image_key)} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-sm text-ink/60">{formatToman(item.price_toman)}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.cart_item_id, Number(e.target.value))}
                      className="w-16 border border-ink/20 rounded-lg px-2 py-1 text-sm text-center"
                    />
                    <button onClick={() => removeItem(item.cart_item_id)} className="text-madder text-sm hover:underline">
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
                <span className="font-semibold">جمع: {formatToman(subtotal)}</span>
                <button
                  onClick={() => navigate(`/checkout/${shopId}`)}
                  className="bg-firouzeh text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-firouzeh-dark transition-colors"
                >
                  ادامه به پرداخت
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
