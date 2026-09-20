import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";

const cart = new Hono<AppEnv>();

// GET /api/cart — items grouped by shop (Etsy checks out per-shop)
cart.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "وارد نشده‌اید." }, 401);

  const { results } = await c.env.DB.prepare(
    `SELECT ci.id as cart_item_id, ci.quantity, l.id as listing_id, l.title, l.price_toman, l.shop_id,
            s.name as shop_name, s.slug as shop_slug,
            (SELECT r2_key FROM listing_images WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) as image_key
     FROM cart_items ci
     JOIN listings l ON l.id = ci.listing_id
     JOIN shops s ON s.id = l.shop_id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`
  ).bind(userId).all();

  return c.json({ items: results });
});

// POST /api/cart — add item
cart.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای افزودن به سبد خرید وارد شوید." }, 401);
  const body = await c.req.json<{ listingId: string; variationId?: string; quantity?: number }>();

  const listing = await c.env.DB.prepare("SELECT quantity, status FROM listings WHERE id = ?")
    .bind(body.listingId).first<any>();
  if (!listing || listing.status !== "active") return c.json({ error: "محصول موجود نیست." }, 404);

  const id = uid("cart");
  await c.env.DB.prepare(
    `INSERT INTO cart_items (id, user_id, listing_id, variation_id, quantity)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, listing_id, variation_id) DO UPDATE SET quantity = quantity + excluded.quantity`
  ).bind(id, userId, body.listingId, body.variationId ?? null, body.quantity ?? 1).run();

  return c.json({ ok: true }, 201);
});

// PATCH /api/cart/:itemId — update quantity
cart.patch("/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const body = await c.req.json<{ quantity: number }>();
  if (body.quantity < 1) return c.json({ error: "تعداد باید حداقل ۱ باشد." }, 400);

  await c.env.DB.prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?")
    .bind(body.quantity, itemId, userId).run();
  return c.json({ ok: true });
});

// DELETE /api/cart/:itemId
cart.delete("/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  await c.env.DB.prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?").bind(itemId, userId).run();
  return c.json({ ok: true });
});

export default cart;
