import { Hono } from "hono";
import type { AppEnv } from "../types";

const categories = new Hono<AppEnv>();

// GET /api/categories
categories.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC"
  ).all();
  return c.json({ categories: results });
});

export default categories;
