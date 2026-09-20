import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";

const uploads = new Hono<AppEnv>();

// POST /api/uploads/listing-image?listingId=...
// multipart/form-data with a single "file" field. Stores the image in R2 and
// records it against the listing. Keeping uploads on the Worker (rather than
// presigned direct-to-R2 URLs) keeps the MVP simple; swap for presigned PUTs
// once upload volume grows.
uploads.post("/listing-image", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "وارد نشده‌اید." }, 401);

  const listingId = c.req.query("listingId");
  if (!listingId) return c.json({ error: "شناسه محصول الزامی است." }, 400);

  const owner = await c.env.DB.prepare(
    `SELECT s.owner_id FROM listings l JOIN shops s ON s.id = l.shop_id WHERE l.id = ?`
  ).bind(listingId).first<any>();
  if (!owner || owner.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  const form = await c.req.formData();
  const file = form.get("file") as unknown as { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } | null;
  if (!file || typeof file.arrayBuffer !== "function") {
    return c.json({ error: "فایلی ارسال نشده است." }, 400);
  }
  if (!file.type.startsWith("image/")) return c.json({ error: "فقط فایل تصویر مجاز است." }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ error: "حجم تصویر نباید بیش از ۸ مگابایت باشد." }, 400);

  const ext = file.type.split("/")[1] ?? "jpg";
  const key = `listings/${listingId}/${uid()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

  const id = uid("img");
  const { results } = await c.env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM listing_images WHERE listing_id = ?"
  ).bind(listingId).all<any>();
  const sortOrder = results[0]?.next ?? 0;

  await c.env.DB.prepare(
    "INSERT INTO listing_images (id, listing_id, r2_key, sort_order) VALUES (?, ?, ?, ?)"
  ).bind(id, listingId, key, sortOrder).run();

  return c.json({ id, key }, 201);
});

// GET /api/uploads/:key{.+} — serve an image straight out of R2
uploads.get("/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/uploads\//, "");
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.json({ error: "تصویر یافت نشد." }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default uploads;
