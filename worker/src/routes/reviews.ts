import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";

const reviews = new Hono<AppEnv>();

// GET /api/reviews/listing/:listingId
reviews.get("/listing/:listingId", async (c) => {
  const listingId = c.req.param("listingId");
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, u.display_name, u.avatar_url FROM reviews r JOIN users u ON u.id = r.buyer_id
     WHERE r.listing_id = ? ORDER BY r.created_at DESC`
  ).bind(listingId).all();
  return c.json({ reviews: results });
});

// POST /api/reviews — buyer leaves a review after delivery, one per purchased line item
reviews.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای ثبت نظر وارد شوید." }, 401);
  const body = await c.req.json<{ orderItemId: string; rating: number; comment?: string }>();

  const orderItem = await c.env.DB.prepare(
    `SELECT oi.id, oi.listing_id, o.buyer_id, o.status FROM order_items oi
     JOIN orders o ON o.id = oi.order_id WHERE oi.id = ?`
  ).bind(body.orderItemId).first<any>();
  if (!orderItem) return c.json({ error: "خرید یافت نشد." }, 404);
  if (orderItem.buyer_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);
  if (orderItem.status !== "delivered") return c.json({ error: "پس از تحویل سفارش می‌توانید نظر ثبت کنید." }, 400);

  const id = uid("review");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO reviews (id, order_item_id, listing_id, buyer_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, body.orderItemId, orderItem.listing_id, userId, body.rating, body.comment ?? null),
    c.env.DB.prepare(
      `UPDATE listings SET
         rating_count = rating_count + 1,
         rating_avg = ((rating_avg * rating_count) + ?) / (rating_count + 1)
       WHERE id = ?`
    ).bind(body.rating, orderItem.listing_id),
  ]);

  return c.json({ ok: true }, 201);
});

export default reviews;
