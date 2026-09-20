import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";
import { requestPayment, verifyPayment } from "../lib/zarinpal";

const orders = new Hono<AppEnv>();

// POST /api/orders/checkout
// Body: { shopId, shipping: {...}, items: [{ listingId, variationId?, quantity }] }
// Splits cart into one order per shop, like Etsy. Creates a ZarinPal payment
// request for the order total, with the seller's share routed to their IBAN
// via ZarinPal's wage-split feature — the platform fee simply stays
// unallocated in the platform's own ZarinPal merchant account.
orders.post("/checkout", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "برای پرداخت وارد شوید." }, 401);

  const body = await c.req.json<{
    shopId: string;
    items: { listingId: string; variationId?: string; quantity: number }[];
    shipping: { name: string; address: string; city: string; postalCode?: string; phone: string; note?: string };
  }>();

  if (!body.items?.length) return c.json({ error: "سبد خرید خالی است." }, 400);

  const shop = await c.env.DB.prepare("SELECT id, name, bank_iban, bank_owner_name FROM shops WHERE id = ?")
    .bind(body.shopId).first<any>();
  if (!shop) return c.json({ error: "فروشگاه یافت نشد." }, 404);
  if (!shop.bank_iban) {
    return c.json({ error: "این فروشگاه هنوز شماره شبا ثبت نکرده و امکان دریافت سفارش را ندارد." }, 409);
  }

  let subtotal = 0;
  const lineItems: any[] = [];
  for (const item of body.items) {
    const listing = await c.env.DB.prepare("SELECT id, title, price_toman, quantity, shop_id FROM listings WHERE id = ?")
      .bind(item.listingId).first<any>();
    if (!listing || listing.shop_id !== body.shopId) {
      return c.json({ error: `محصول ${item.listingId} متعلق به این فروشگاه نیست.` }, 400);
    }
    if (listing.quantity < item.quantity) {
      return c.json({ error: `موجودی «${listing.title}» کافی نیست.` }, 409);
    }
    let unitPrice = listing.price_toman;
    if (item.variationId) {
      const variation = await c.env.DB.prepare("SELECT price_delta_toman FROM listing_variations WHERE id = ?")
        .bind(item.variationId).first<any>();
      if (variation) unitPrice += variation.price_delta_toman;
    }
    subtotal += unitPrice * item.quantity;
    lineItems.push({ ...item, unitPrice, title: listing.title });
  }

  const feePercent = Number(c.env.PLATFORM_FEE_PERCENT ?? "8");
  const platformFee = Math.round((subtotal * feePercent) / 100);
  const shipping = 0; // plug in a real shipping rate calculation here
  const total = subtotal + shipping;
  const sellerShare = total - platformFee;

  const orderId = uid("order");
  const stmts = [
    c.env.DB.prepare(
      `INSERT INTO orders (id, buyer_id, shop_id, status, subtotal_toman, shipping_toman, platform_fee_toman, total_toman,
        shipping_name, shipping_address, shipping_city, shipping_postal_code, shipping_phone, buyer_note)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId, userId, body.shopId, subtotal, shipping, platformFee, total,
      body.shipping.name, body.shipping.address, body.shipping.city,
      body.shipping.postalCode ?? null, body.shipping.phone, body.shipping.note ?? null
    ),
  ];
  for (const item of lineItems) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO order_items (id, order_id, listing_id, variation_id, title_snapshot, price_toman, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(uid("oi"), orderId, item.listingId, item.variationId ?? null, item.title, item.unitPrice, item.quantity)
    );
    // Reserve stock immediately so two buyers can't oversell the same item
    // while payment is pending. A scheduled cleanup job should release stock
    // back if an order stays 'pending' for too long (e.g. abandoned checkout).
    stmts.push(
      c.env.DB.prepare("UPDATE listings SET quantity = quantity - ? WHERE id = ?").bind(item.quantity, item.listingId)
    );
    stmts.push(
      c.env.DB.prepare("DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?").bind(userId, item.listingId)
    );
  }
  await c.env.DB.batch(stmts);

  const payment = await requestPayment({
    merchantId: c.env.ZARINPAL_MERCHANT_ID,
    amount: total,
    callbackUrl: `${c.env.FRONTEND_URL}/orders/verify?orderId=${orderId}`,
    description: `سفارش از فروشگاه ${shop.name}`,
    mobile: body.shipping.phone,
    wages: [
      {
        iban: shop.bank_iban,
        amount: sellerShare,
        description: `سهم فروشنده — سفارش ${orderId}`,
      },
    ],
  });

  if (!payment.ok) {
    // Order stays 'pending' — the buyer can retry payment for the same order
    // without us re-reserving stock or re-creating order rows.
    return c.json({ orderId, total, error: `اتصال به درگاه پرداخت ناموفق بود: ${payment.message}` }, 502);
  }

  await c.env.DB.prepare("UPDATE orders SET zarinpal_authority = ? WHERE id = ?")
    .bind(payment.authority, orderId).run();

  return c.json({ orderId, total, paymentUrl: payment.paymentUrl }, 201);
});

// GET /api/orders/verify — ZarinPal redirects the buyer's browser here (via the
// frontend callback page, which forwards Authority/Status/orderId) after payment.
orders.get("/verify", async (c) => {
  const orderId = c.req.query("orderId");
  const authority = c.req.query("Authority");
  const status = c.req.query("Status"); // "OK" or "NOK"

  if (!orderId || !authority) return c.json({ error: "پارامترهای بازگشت از درگاه ناقص است." }, 400);

  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<any>();
  if (!order) return c.json({ error: "سفارش یافت نشد." }, 404);
  if (order.zarinpal_authority !== authority) return c.json({ error: "کد پیگیری با سفارش مطابقت ندارد." }, 400);

  if (order.status !== "pending") {
    // Already verified (buyer refreshed the callback page, etc.)
    return c.json({ status: order.status, orderId, refId: order.zarinpal_ref_id });
  }

  if (status !== "OK") {
    await restoreStockAndCancel(c.env.DB, orderId);
    return c.json({ status: "cancelled", orderId });
  }

  const verify = await verifyPayment({ merchantId: c.env.ZARINPAL_MERCHANT_ID, amount: order.total_toman, authority });
  if (!verify.ok) {
    await restoreStockAndCancel(c.env.DB, orderId);
    return c.json({ status: "cancelled", orderId, error: verify.message });
  }

  await c.env.DB.prepare("UPDATE orders SET status = 'paid', zarinpal_ref_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(verify.refId, orderId).run();

  return c.json({ status: "paid", orderId, refId: verify.refId });
});

export async function restoreStockAndCancel(db: D1Database, orderId: string) {
  const { results: items } = await db.prepare("SELECT listing_id, quantity FROM order_items WHERE order_id = ?")
    .bind(orderId).all<any>();
  const stmts = items.map((i) =>
    db.prepare("UPDATE listings SET quantity = quantity + ? WHERE id = ?").bind(i.quantity, i.listing_id)
  );
  stmts.push(db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(orderId));
  await db.batch(stmts);
}

// GET /api/orders/:id
orders.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const order = await c.env.DB.prepare(
    `SELECT o.*, s.name as shop_name, s.owner_id as shop_owner_id FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = ?`
  ).bind(id).first<any>();
  if (!order) return c.json({ error: "سفارش یافت نشد." }, 404);
  if (order.buyer_id !== userId && order.shop_owner_id !== userId) {
    return c.json({ error: "دسترسی غیرمجاز." }, 403);
  }
  const { results: items } = await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(id).all();
  return c.json({ order, items });
});

// GET /api/orders — buyer's own order history
orders.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "وارد نشده‌اید." }, 401);
  const { results } = await c.env.DB.prepare(
    `SELECT o.*, s.name as shop_name, s.slug as shop_slug FROM orders o JOIN shops s ON s.id = o.shop_id
     WHERE o.buyer_id = ? ORDER BY o.created_at DESC LIMIT 100`
  ).bind(userId).all();
  return c.json({ orders: results });
});

// PATCH /api/orders/:id/status — seller updates status (shipped/delivered/cancelled)
orders.patch("/:id/status", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ status: string; trackingNumber?: string }>();

  const order = await c.env.DB.prepare(
    `SELECT o.id, s.owner_id FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = ?`
  ).bind(id).first<any>();
  if (!order) return c.json({ error: "سفارش یافت نشد." }, 404);
  if (order.owner_id !== userId) return c.json({ error: "دسترسی غیرمجاز." }, 403);

  const allowedStatuses = ["shipped", "delivered", "cancelled", "refunded"];
  if (!allowedStatuses.includes(body.status)) return c.json({ error: "وضعیت نامعتبر است." }, 400);

  await c.env.DB.prepare(
    "UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = datetime('now') WHERE id = ?"
  ).bind(body.status, body.trackingNumber ?? null, id).run();

  return c.json({ ok: true });
});

export default orders;
