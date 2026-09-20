import { Hono } from "hono";
import type { AppEnv } from "../types";
import { uid } from "../lib/db";
import { hashPassword, signJWT } from "../lib/jwt";

const auth = new Hono<AppEnv>();

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json<{ email: string; password: string; displayName: string }>();
  if (!body.email || !body.password || body.password.length < 8 || !body.displayName) {
    return c.json({ error: "ایمیل، نام و رمز عبور (حداقل ۸ کاراکتر) الزامی است." }, 400);
  }
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
  if (existing) return c.json({ error: "این ایمیل قبلاً ثبت شده است." }, 409);

  const id = uid("user");
  const passwordHash = await hashPassword(body.password);
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`
  ).bind(id, body.email, passwordHash, body.displayName).run();

  const token = await signJWT({ sub: id }, c.env.JWT_SECRET);
  return c.json({ token, user: { id, email: body.email, displayName: body.displayName } }, 201);
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const passwordHash = await hashPassword(body.password ?? "");
  const user = await c.env.DB.prepare(
    "SELECT id, email, display_name, password_hash, is_seller FROM users WHERE email = ?"
  ).bind(body.email).first<any>();

  if (!user || user.password_hash !== passwordHash) {
    return c.json({ error: "ایمیل یا رمز عبور اشتباه است." }, 401);
  }
  const token = await signJWT({ sub: user.id }, c.env.JWT_SECRET);
  return c.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.display_name, isSeller: !!user.is_seller },
  });
});

// GET /api/auth/me
auth.get("/me", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ error: "وارد نشده‌اید." }, 401);
  const user = await c.env.DB.prepare(
    "SELECT id, email, display_name, avatar_url, is_seller FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) return c.json({ error: "کاربر یافت نشد." }, 404);
  return c.json({ user });
});

export default auth;
