import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv, Bindings } from "./types";
import { attachUser } from "./middleware/auth";
import { handleScheduled } from "./scheduled";

import auth from "./routes/auth";
import shops from "./routes/shops";
import listings from "./routes/listings";
import cart from "./routes/cart";
import orders from "./routes/orders";
import categories from "./routes/categories";
import reviews from "./routes/reviews";
import uploads from "./routes/uploads";
import sitemap from "./routes/sitemap";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    // Replace with your Cloudflare Pages domain in production.
    origin: (origin) => origin ?? "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use("*", attachUser);

app.get("/api/health", (c) => c.json({ ok: true, service: "dastkar-api" }));

app.route("/api/auth", auth);
app.route("/api/shops", shops);
app.route("/api/listings", listings);
app.route("/api/cart", cart);
app.route("/api/orders", orders);
app.route("/api/categories", categories);
app.route("/api/reviews", reviews);
app.route("/api/uploads", uploads);
app.route("/api/sitemap.xml", sitemap);

app.notFound((c) => c.json({ error: "یافت نشد." }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید." }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
    await handleScheduled(env);
  },
};
