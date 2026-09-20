import { createMiddleware } from "hono/factory";
import { verifyJWT } from "../lib/jwt";
import type { AppEnv } from "../types";

// Populates c.var.userId when a valid Bearer token / session cookie is present.
// Does NOT reject the request — routes that require auth call requireAuth() themselves.
export const attachUser = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const payload = await verifyJWT<{ sub: string }>(token, c.env.JWT_SECRET);
    c.set("userId", payload?.sub ?? null);
  } else {
    c.set("userId", null);
  }
  await next();
});

export function requireAuth(c: any): string | null {
  const userId = c.get("userId");
  return userId ?? null;
}
