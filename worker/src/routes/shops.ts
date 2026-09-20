import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid, slugify } from "../lib/db";
import { isValidIban } from "../lib/zarinpal";

const shops = new Hono<AppEnv>();

// POST /api/shops  — open a new shop (becomes a seller, like Etsy "Open your shop")
shops.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای باز کردن فروشگاه ابتدا وارد شوید." }, 401);

  const body = await c.req.json<{ name: string; tagline?: string; about?: string; city?: string }>();
  if (!body.name) return c.json({ error: "نام فروشگاه الزامی است." }, 400);

  const baseSlug = slugify(body.name) || uid();
  let slug = baseSlug;
  let n = 1;
  while (await c.env.DB.prepare("SELECT id FROM shops WHERE slug = ?").bind(slug).first()) {
    slug = `${baseSlug}-${++n}`;
  }

  const id = uid("shop");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO shops (id, owner_id, slug, name, tagline, about, city) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, slug, body.name, body.tagline ?? null, body.about ?? null, body.city ?? null),
    c.env.DB.prepare(`UPDATE users SET is_seller = 1 WHERE id = ?`).bind(userId),
  ]);

  const shop = await c.env.DB.prepare("SELECT * FROM shops WHERE id = ?").bind(id).first();
  return c.json({ shop }, 201);
});

// GET /api/shops/:slug — public shop page
shops.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const shop = await c.env.DB.prepare("SELECT * FROM shops WHERE slug = ?").bind(slug).first();
  if (!shop) return c.json({ error: "فروشگاه یافت نشد." }, 404);
  return c.json({ shop });
});

// PATCH /api/shops/:id — owner-only edit
shops.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const shop = await c.env.DB.prepare("SELECT owner_id FROM shops WHERE id = ?").bind(id).first<any>();
  if (!shop) return c.json({ error: "فروشگاه یافت نشد." }, 404);
  if (shop.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const allowed = [
    "name", "tagline", "about", "banner_url", "logo_url", "city",
    "policy_shipping", "policy_returns", "is_vacation",
    "bank_iban", "bank_owner_name",
  ];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (fields.length === 0) return c.json({ error: "فیلد معتبری برای بروزرسانی ارسال نشده." }, 400);

  if (fields.includes("bank_iban")) {
    const iban = String(body.bank_iban ?? "").trim().toUpperCase();
    if (iban && !isValidIban(iban)) {
      return c.json({ error: "شماره شبا نامعتبر است. فرمت صحیح: IR به همراه ۲۴ رقم." }, 400);
    }
    (body as any).bank_iban = iban || null;
  }

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await c.env.DB.prepare(`UPDATE shops SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...fields.map((f) => (body as any)[f]), id)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM shops WHERE id = ?").bind(id).first();
  return c.json({ shop: updated });
});

// GET /api/shops/:id/orders — seller order queue
shops.get("/:id/orders", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const shop = await c.env.DB.prepare("SELECT owner_id FROM shops WHERE id = ?").bind(id).first<any>();
  if (!shop) return c.json({ error: "فروشگاه یافت نشد." }, 404);
  if (shop.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM orders WHERE shop_id = ? ORDER BY created_at DESC LIMIT 100"
  ).bind(id).all();
  return c.json({ orders: results });
});

export default shops;
