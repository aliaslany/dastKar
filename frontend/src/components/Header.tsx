import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Header() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-30 bg-parchment/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="text-2xl font-black text-firouzeh-dark tracking-tight shrink-0">
          دستکار
        </Link>

        <form onSubmit={onSearch} className="flex-1 flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="جستجوی محصولات دست‌ساز..."
            className="flex-1 rounded-s-full border border-ink/20 bg-white px-4 py-2 text-sm focus:outline-none focus:border-firouzeh"
          />
          <button
            type="submit"
            className="rounded-e-full bg-firouzeh text-white px-5 text-sm font-medium hover:bg-firouzeh-dark transition-colors"
          >
            جستجو
          </button>
        </form>

        <nav className="flex items-center gap-3 text-sm shrink-0">
          <Link to="/cart" className="hover:text-firouzeh-dark">سبد خرید</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-firouzeh-dark">
                {user.isSeller ? "پنل فروشندگی" : "باز کردن فروشگاه"}
              </Link>
              <Link to="/orders" className="hover:text-firouzeh-dark">سفارش‌های من</Link>
              <button onClick={logout} className="text-ink/60 hover:text-madder">خروج</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-firouzeh-dark">ورود</Link>
              <Link
                to="/register"
                className="bg-ink text-parchment rounded-full px-4 py-1.5 hover:bg-firouzeh-dark transition-colors"
              >
                ثبت‌نام
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
