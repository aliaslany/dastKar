import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";

const listings = new Hono<AppEnv>();

// GET /api/listings — browse / search with basic filtering
// Query params: q, category, minPrice, maxPrice, sort (newest|price_asc|price_desc|popular), page
listings.get("/", async (c) => {
  const q = c.req.query("q")?.trim();
  const category = c.req.query("category");
  const shopId = c.req.query("shop");
  const minPrice = c.req.query("minPrice");
  const maxPrice = c.req.query("maxPrice");
  const sort = c.req.query("sort") ?? "newest";
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const pageSize = 24;
  const offset = (page - 1) * pageSize;

  let listingIds: string[] | null = null;
  if (q) {
    // Full text search via FTS5, falls back to LIKE if FTS has no hits
    const ftsQuery = q.split(/\s+/).filter(Boolean).map((t) => `${t}*`).join(" ");
    const { results } = await c.env.DB.prepare(
      "SELECT listing_id FROM listings_fts WHERE listings_fts MATCH ? LIMIT 500"
    ).bind(ftsQuery).all<any>();
    listingIds = results.map((r) => r.listing_id);
  }

  const clauses: string[] = ["status = 'active'"];
  const params: any[] = [];

  if (listingIds) {
    if (listingIds.length === 0) return c.json({ listings: [], page, pageSize, total: 0 });
    clauses.push(`id IN (${listingIds.map(() => "?").join(",")})`);
    params.push(...listingIds);
  }
  if (category) {
    clauses.push("category_id = (SELECT id FROM categories WHERE slug = ?)");
    params.push(category);
  }
  if (shopId) {
    clauses.push("shop_id = ?");
    params.push(shopId);
  }
  if (minPrice) {
    clauses.push("price_toman >= ?");
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    clauses.push("price_toman <= ?");
    params.push(Number(maxPrice));
  }

  const orderBy =
    sort === "price_asc" ? "price_toman ASC" :
    sort === "price_desc" ? "price_toman DESC" :
    sort === "popular" ? "favorites_count DESC" :
    "created_at DESC";

  const where = clauses.join(" AND ");
  const { results } = await c.env.DB.prepare(
    `SELECT id, shop_id, title, price_toman, quantity, status, favorites_count, rating_avg, rating_count, created_at
     FROM listings WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all();

  // attach primary image
  const listingsWithImages = await Promise.all(
    (results as any[]).map(async (l) => {
      const img = await c.env.DB.prepare(
        "SELECT r2_key FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC LIMIT 1"
      ).bind(l.id).first<any>();
      return { ...l, imageKey: img?.r2_key ?? null };
    })
  );

  return c.json({ listings: listingsWithImages, page, pageSize });
});

// GET /api/listings/:id — full listing detail
listings.get("/:id", async (c) => {
  const id = c.req.param("id");
  const listing = await c.env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first<any>();
  if (!listing) return c.json({ error: "این محصول یافت نشد." }, 404);

  await c.env.DB.prepare("UPDATE listings SET views_count = views_count + 1 WHERE id = ?").bind(id).run();

  const { results: images } = await c.env.DB.prepare(
    "SELECT id, r2_key, alt_text FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC"
  ).bind(id).all();
  const { results: variations } = await c.env.DB.prepare(
    "SELECT * FROM listing_variations WHERE listing_id = ?"
  ).bind(id).all();
  const shop = await c.env.DB.prepare("SELECT id, slug, name, logo_url, rating_avg FROM shops WHERE id = ?")
    .bind(listing.shop_id).first();

  return c.json({ listing, images, variations, shop });
});

// POST /api/listings — create (seller only, must own the shop)
listings.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای افزودن محصول وارد شوید." }, 401);

  const body = await c.req.json<any>();
  const shop = await c.env.DB.prepare("SELECT owner_id FROM shops WHERE id = ?").bind(body.shopId).first<any>();
  if (!shop) return c.json({ error: "فروشگاه یافت نشد." }, 404);
  if (shop.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  if (!body.title || !body.description || !body.priceToman) {
    return c.json({ error: "عنوان، توضیحات و قیمت الزامی هستند." }, 400);
  }

  const id = uid("listing");
  await c.env.DB.prepare(
    `INSERT INTO listings (id, shop_id, category_id, title, description, price_toman, quantity,
      is_made_to_order, processing_days, materials, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.shopId, body.categoryId ?? null, body.title, body.description, body.priceToman,
    body.quantity ?? 1, body.isMadeToOrder ? 1 : 0, body.processingDays ?? 3,
    body.materials ?? null, body.tags ?? null, body.status ?? "active"
  ).run();

  await c.env.DB.prepare(
    `INSERT INTO listings_fts (listing_id, title, description, tags, materials) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, body.title, body.description, body.tags ?? "", body.materials ?? "").run();

  const listing = await c.env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();
  return c.json({ listing }, 201);
});

// PATCH /api/listings/:id — update (owner only)
listings.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const listing = await c.env.DB.prepare(
    `SELECT l.*, s.owner_id FROM listings l JOIN shops s ON s.id = l.shop_id WHERE l.id = ?`
  ).bind(id).first<any>();
  if (!listing) return c.json({ error: "محصول یافت نشد." }, 404);
  if (listing.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ["title", "description", "price_toman", "quantity", "status", "category_id", "materials", "tags", "processing_days", "is_made_to_order"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (fields.length === 0) return c.json({ error: "فیلد معتبری ارسال نشده." }, 400);

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await c.env.DB.prepare(`UPDATE listings SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...fields.map((f) => (body as any)[f]), id)
    .run();

  if (body.title || body.description || body.tags || body.materials) {
    await c.env.DB.prepare(
      `UPDATE listings_fts SET title = ?, description = ?, tags = ?, materials = ? WHERE listing_id = ?`
    ).bind(
      body.title ?? listing.title,
      body.description ?? listing.description,
      body.tags ?? listing.tags ?? "",
      body.materials ?? listing.materials ?? "",
      id
    ).run();
  }

  const updated = await c.env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();
  return c.json({ listing: updated });
});

// DELETE /api/listings/:id
listings.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const listing = await c.env.DB.prepare(
    `SELECT l.id, s.owner_id FROM listings l JOIN shops s ON s.id = l.shop_id WHERE l.id = ?`
  ).bind(id).first<any>();
  if (!listing) return c.json({ error: "محصول یافت نشد." }, 404);
  if (listing.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM listings_fts WHERE listing_id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});

// POST /api/listings/:id/favorite — toggle
listings.post("/:id/favorite", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای علاقه‌مندی وارد شوید." }, 401);
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?"
  ).bind(userId, id).first();

  if (existing) {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND listing_id = ?").bind(userId, id),
      c.env.DB.prepare("UPDATE listings SET favorites_count = MAX(0, favorites_count - 1) WHERE id = ?").bind(id),
    ]);
    return c.json({ favorited: false });
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)").bind(userId, id),
      c.env.DB.prepare("UPDATE listings SET favorites_count = favorites_count + 1 WHERE id = ?").bind(id),
    ]);
    return c.json({ favorited: true });
  }
});

export default listings;
