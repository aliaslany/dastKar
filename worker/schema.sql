-- دستکار | Dastkar marketplace schema (Cloudflare D1 / SQLite)
-- Modeled on Etsy's core business logic: users -> shops -> listings -> orders

PRAGMA foreign_keys = ON;

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- uuid
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  is_seller INTEGER NOT NULL DEFAULT 0,   -- 0/1: has an open shop
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- SHOPS (sellers) ----------
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,           -- used in /shop/:slug
  name TEXT NOT NULL,
  tagline TEXT,
  about TEXT,
  banner_url TEXT,
  logo_url TEXT,
  city TEXT,
  bank_iban TEXT,                      -- seller's Sheba/IBAN for payouts, e.g. IR120170000000...
  bank_owner_name TEXT,                -- must match the seller's legal name on the bank account
  policy_shipping TEXT,
  policy_returns TEXT,
  is_vacation INTEGER NOT NULL DEFAULT 0,  -- shop paused, like Etsy "vacation mode"
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);

-- ---------- CATEGORIES ----------
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_fa TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ---------- LISTINGS (products) ----------
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_toman INTEGER NOT NULL,        -- price in Toman (integer, no decimals)
  quantity INTEGER NOT NULL DEFAULT 1, -- stock on hand
  is_made_to_order INTEGER NOT NULL DEFAULT 0,
  processing_days INTEGER NOT NULL DEFAULT 3,
  materials TEXT,                      -- comma separated
  tags TEXT,                           -- comma separated, used for search
  status TEXT NOT NULL DEFAULT 'active', -- active | draft | sold_out | archived
  favorites_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_shop ON listings(shop_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- Full text search over listings (title / description / tags / materials)
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
  listing_id UNINDEXED,
  title,
  description,
  tags,
  materials
);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,                -- object key in R2 bucket
  sort_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT
);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- Variations e.g. "رنگ: آبی", "سایز: بزرگ"
CREATE TABLE IF NOT EXISTS listing_variations (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,           -- e.g. "رنگ"
  option_value TEXT NOT NULL,          -- e.g. "آبی"
  price_delta_toman INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0
);

-- ---------- CART ----------
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  variation_id TEXT REFERENCES listing_variations(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, listing_id, variation_id)
);

-- ---------- FAVORITES / WISHLIST ----------
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, listing_id)
);

-- ---------- ORDERS ----------
-- One "order" groups items from a single shop, mirroring Etsy's per-shop checkout.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|paid|shipped|delivered|cancelled|refunded
  subtotal_toman INTEGER NOT NULL,
  shipping_toman INTEGER NOT NULL DEFAULT 0,
  platform_fee_toman INTEGER NOT NULL DEFAULT 0,
  total_toman INTEGER NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT,
  shipping_phone TEXT NOT NULL,
  zarinpal_authority TEXT,             -- returned by payment/request.json, used to build the pay URL
  zarinpal_ref_id TEXT,                -- returned by payment/verify.json once payment is confirmed
  tracking_number TEXT,
  buyer_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  variation_id TEXT REFERENCES listing_variations(id),
  title_snapshot TEXT NOT NULL,       -- listing title at time of purchase
  price_toman INTEGER NOT NULL,       -- unit price at time of purchase
  quantity INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  seller_reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_item_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);

-- ---------- SESSIONS (mirrored in KV for fast reads; table = source of truth) ----------
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Seed categories (Etsy-style top-level craft categories, in Persian) ----------
INSERT OR IGNORE INTO categories (id, slug, name_fa, sort_order) VALUES
  ('cat-jewelry',   'jewelry',   'جواهرات و اکسسوری', 1),
  ('cat-home',      'home-decor','دکوراسیون منزل',     2),
  ('cat-clothing',  'clothing',  'پوشاک دست‌دوز',       3),
  ('cat-art',       'art',       'نقاشی و آثار هنری',   4),
  ('cat-craft',     'craft-supplies', 'مواد اولیه صنایع‌دستی', 5),
  ('cat-pottery',   'pottery',   'سفال و سرامیک',       6),
  ('cat-textile',   'textile',   'بافتنی و نساجی',      7),
  ('cat-woodwork',  'woodwork',  'چوب و منبت',          8),
  ('cat-wedding',   'wedding',   'عروسی و مراسم',       9),
  ('cat-toys',      'toys',      'اسباب‌بازی دست‌ساز',   10);
