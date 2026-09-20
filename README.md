# دستکار (Dastkar) — a Persian marketplace on Cloudflare's free tier

A Persian-language, Etsy-style handmade-goods marketplace, built for Iran: prices
in Toman, payments through ZarinPal, seller payouts straight to Iranian bank
accounts (Sheba/IBAN). One seller owns a shop, a shop lists products, buyers
add to cart per-shop and check out per-shop — same core business logic as
Etsy, on a $0-to-start Cloudflare stack:

- **Cloudflare Pages** — hosts the React frontend (`frontend/`)
- **Cloudflare Workers + Hono** — the API (`worker/`)
- **Cloudflare D1** — SQL database (users, shops, listings, orders, reviews...)
- **Cloudflare R2** — product images, zero egress fees
- **Cloudflare KV** — reserved for sessions/caching (binding is wired, unused by default since auth is JWT-only)
- **ZarinPal** — Iran's IPG, handles the actual payment and splits each order's
  proceeds between the platform and the seller automatically

Both projects were built and type-checked in this environment (`tsc` clean,
`vite build` clean, `wrangler deploy --dry-run` bundles at ~122 KiB). You still
need to create the actual Cloudflare resources and a ZarinPal merchant account,
and fill in the IDs below — that step can't be done from here.

## 1. Prerequisites

```bash
npm install -g wrangler
wrangler login
```

You'll also need a **ZarinPal merchant account** (زرین‌پال پذیرنده) — sign up
at zarinpal.com with your business's national ID / company registration, and
get a `merchant_id` from your panel. New accounts start in sandbox mode; you
apply for a live merchant ID once you're ready to accept real payments.

## 2. Set up the Worker (API)

```bash
cd worker
npm install

# Create the D1 database, then copy the returned database_id into wrangler.toml
wrangler d1 create dastkar-db

# Create the R2 bucket for product images
wrangler r2 bucket create dastkar-images

# Create the KV namespace, then copy the returned id into wrangler.toml
wrangler kv namespace create SESSIONS
```

Open `worker/wrangler.toml` and replace:
- `REPLACE_WITH_YOUR_D1_DATABASE_ID`
- `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`
- `FRONTEND_URL` — your real Cloudflare Pages domain, once you have it (ZarinPal
  redirects buyers back to `${FRONTEND_URL}/orders/verify` after payment)

Load the schema (categories, tables, indexes):

```bash
npm run db:init:remote   # applies schema.sql to the live D1 database
```

Set secrets:

```bash
wrangler secret put JWT_SECRET
# paste any long random string, e.g. `openssl rand -hex 32`

wrangler secret put ZARINPAL_MERCHANT_ID
# your merchant_id from the ZarinPal panel
```

Deploy:

```bash
npm run deploy
```

Wrangler prints your Worker URL, e.g. `https://dastkar-api.<you>.workers.dev`.

## 3. Set up the frontend (Pages)

```bash
cd ../frontend
npm install
```

Create `frontend/.env.production`:

```
VITE_API_BASE=https://dastkar-api.<you>.workers.dev/api
```

Build and deploy:

```bash
npm run build
wrangler pages deploy dist --project-name=dastkar
```

For local development, `npm run dev` (frontend) + `wrangler dev` (worker, in a
second terminal) — `vite.config.ts` already proxies `/api` to `localhost:8787`.

## 4. SEO setup — two things to configure after deploying

The codebase handles SEO in three layers; two of them need a config value
from you once you have real URLs:

1. **Per-page meta tags & JSON-LD** (`src/components/Seo.tsx`) — works
   automatically once you set `VITE_SITE_URL` in `frontend/.env.production`
   to your real domain (defaults to `https://dastkar.pages.dev` otherwise).
   This covers real browsers and JS-executing crawlers (Googlebot included).

2. **Sitemap** — the Worker generates it live from D1 at `GET /api/sitemap.xml`.
   To make it appear at `https://<your-domain>/sitemap.xml` (not the
   `workers.dev` subdomain), edit `frontend/public/_redirects` and replace
   the placeholder with your real Worker URL, then redeploy the frontend.

3. **Social/chat-app link previews** (`frontend/functions/_middleware.ts`) —
   this is the one that matters most in Iran, since Telegram and WhatsApp
   don't execute JavaScript and would otherwise show the same generic title
   on every shared product or shop link. It's a Cloudflare Pages Function
   that detects known bot user-agents and rewrites the HTML `<head>` at the
   edge with the real listing/shop data before the bot sees it. To activate
   it: in your Pages project → **Settings → Environment variables**, add
   `WORKER_API_URL` = `https://dastkar-api.<you>.workers.dev/api`, then
   redeploy. Without this variable set, the function fails open (serves the
   page normally) rather than breaking anything.

You can sanity-check #3 after deploying with:

```bash
curl -A "TelegramBot (like TwitterBot)" https://<your-domain>/product/<some-listing-id>
```

— the `<title>` and `og:*` tags in the response should show that listing's
real title/description, not the site defaults.

## 5. How payment actually works

`worker/src/lib/zarinpal.ts` wraps ZarinPal's REST API v4. Unlike Stripe's
embedded Elements widget, ZarinPal is **redirect-based**:

1. Buyer clicks "پرداخت" at checkout → the Worker calls ZarinPal's
   `payment/request.json` with the order total and a `wages` array that tells
   ZarinPal to send the seller's share directly to their **Sheba/IBAN** at
   settlement. Whatever isn't covered by `wages` (the platform fee) simply
   stays in your own ZarinPal merchant account — no separate transfer needed.
2. The buyer's whole browser tab is redirected to ZarinPal's payment page
   (`getStartPayUrl`) — this is a full navigation, not a popup.
3. After the buyer pays (or cancels), ZarinPal redirects back to
   `/orders/verify` on your frontend, with `Authority` and `Status=OK|NOK` as
   query params.
4. The frontend's `PaymentCallback` page forwards those to the Worker, which
   calls `payment/verify.json` to confirm the charge really went through
   before marking the order `paid`. This double-check matters — never trust
   the redirect alone, since a buyer could hand-edit the URL.

Amounts are sent with `currency: "IRT"` (Toman) so no Rial/Toman ×10 conversion
is needed anywhere — `price_toman` in the database is exactly what gets sent
to ZarinPal.

**Sellers must add their Sheba (IBAN) in شبا دستکار → پنل فروشندگی → تنظیمات
فروشگاه before they can receive orders** — checkout is blocked with a clear
error otherwise (`worker/src/routes/orders.ts`, the `bank_iban` check).

## 6. Where you'll hit the free tier's real limits

| Resource | Free tier | You'll feel it when... |
|---|---|---|
| Workers requests | 100K/day | you have real daily traffic, not just testing |
| Workers CPU | 10ms/request | search/filter logic gets complex — current FTS5 queries are fine |
| D1 reads/writes | 5M reads, 100K writes /day | real order volume, not MVP testing |
| R2 storage | 10 GB | sellers bulk-uploading many product photos |
| KV | 100K reads, 1K writes /day | not used yet (auth is stateless JWT) |

Cloudflare's dashboard shows per-product usage against these limits, so you'll
see the warning before you get cut off, not after.

Separately: Cloudflare itself (Pages/Workers/D1/R2) has no Iran-specific
restriction on the hosting side — this is purely a US company serving your
frontend/API/database/images, which is unrelated to the payments question.

## 7. What's implemented vs. what's a stub

**Implemented and working end to end:**
- Register / login (JWT via Web Crypto, no external auth dependency)
- Open a shop, add/edit/delete listings with images (stored in R2)
- Browse, full-text search (SQLite FTS5), filter by category/price, sort
- Cart (grouped per shop), checkout (one ZarinPal payment request per shop's order)
- Real payment: redirect to ZarinPal, server-side `verify.json` confirmation,
  automatic split payout to the seller's Sheba via `wages`
- Stock is reserved at checkout and restored automatically if payment fails or
  is cancelled — either immediately (buyer cancels/fails at ZarinPal) or, if
  they just abandon the tab, via a Cron Trigger that sweeps `pending` orders
  older than 1 hour every 15 minutes (`worker/src/scheduled.ts`)
- Order status updates (shipped/delivered/cancelled) from the seller dashboard
- Reviews after delivery, shop ratings
- Persian RTL UI throughout, Toman formatting, Persian category names
- SEO: per-page meta tags + JSON-LD (Product/Store/Organization schema), a
  live sitemap generated from D1, `noindex` on private/transactional pages,
  and edge-side OG tag injection so Telegram/WhatsApp link previews show the
  real listing/shop instead of a generic title (see section 4)

**Deliberately left as a seam, not a guess:**
- Shipping rate calculation (currently hardcoded to 0 — plug in a real carrier
  rate, e.g. Post/Tipax/Snapp Box pricing, or a flat per-shop rate)
- Direct-to-R2 presigned uploads (current uploads proxy through the Worker,
  which is simpler for an MVP but adds Worker CPU time — swap to presigned
  PUT URLs once upload volume grows)
- KV is bound but unused; add session caching there if you move off pure JWT
- IBAN validation is structural only (`IR` + 24 digits) — it doesn't verify
  the account actually exists or belongs to the seller. For real fraud
  protection you'd want Shahkar/name-matching verification, which ZarinPal
  and most Iranian PSPs offer as an add-on KYC step during merchant onboarding.

## 8. Project structure

```
worker/
  schema.sql              D1 schema + seed categories
  wrangler.toml            bindings (D1, R2, KV) — fill in the IDs
  src/
    index.ts               Hono app, route wiring, CORS
    scheduled.ts            Cron Trigger: releases stock on abandoned pending orders
    lib/jwt.ts              JWT sign/verify (Web Crypto, zero deps)
    lib/zarinpal.ts         ZarinPal REST client (request/verify, wage split)
    routes/                 auth, shops, listings, cart, orders, categories, reviews, uploads, sitemap

frontend/
  public/
    robots.txt              disallows private routes, points at the sitemap
    _redirects              proxies /sitemap.xml to the Worker's dynamic route
    favicon.svg
  functions/
    _middleware.ts          Pages Function: edge-side OG tag injection for social/chat-app bots
  src/
    lib/api.ts               typed fetch client
    lib/auth.tsx              auth context/provider
    components/               Header, Footer, ProductCard, ShopCard, GirihDivider, Seo, NoIndex
    pages/                    Home, Search, Product, Shop, Cart, Checkout, PaymentCallback, Login, Register, Orders
    pages/dashboard/          seller: shop creation, listings, orders, settings (incl. Sheba/IBAN)
```

## 9. Optional: a quick static preview on GitHub Pages

If you just want a shareable link to click through the UI — without setting
up Cloudflare resources first — `.github/workflows/deploy-gh-pages.yml` builds
the frontend and publishes it to GitHub Pages automatically on every push to
`main`.

To turn it on: repo **Settings → Pages → Source → GitHub Actions**. That's it;
the next push builds and deploys.

Two things to know about this version:

1. **It's UI-only by default** — with no `VITE_API_BASE` set, every screen
   renders but nothing loads (empty listings, login fails, etc.), since
   there's no API to call yet. Once you've deployed the Worker (section 2),
   add a repo **Settings → Secrets and variables → Actions → Variable** named
   `VITE_API_BASE` set to `https://dastkar-api.<you>.workers.dev/api`, and
   the GitHub Pages copy becomes a fully working mirror of the real site.
2. **The SEO edge middleware doesn't run here.** `frontend/functions/_middleware.ts`
   is a Cloudflare Pages Function — GitHub Pages only serves static files, so
   Telegram/WhatsApp link previews on a GitHub Pages URL will show the
   generic site defaults, not per-listing data. That's expected; it's a
   preview link, not the production domain you'd actually share.

Cloudflare Pages (section 3) is still the one you deploy for real — this is
just the fastest way to get something clickable in front of someone today.

