import { Hono } from "hono";
import type { AppEnv } from "../types";

const sitemap = new Hono<AppEnv>();

// GET /api/sitemap.xml — a real sitemap generated from live data, not a
// static file that goes stale the moment a new listing is added. The
// frontend's Pages project proxies its own /sitemap.xml to this route (see
// frontend/public/_redirects) so it appears under your actual domain, which
// is what search engines expect.
sitemap.get("/", async (c) => {
  const siteUrl = c.env.FRONTEND_URL;

  const [{ results: listings }, { results: shops }, { results: categories }] = await Promise.all([
    c.env.DB.prepare("SELECT id, updated_at FROM listings WHERE status = 'active'").all<any>(),
    c.env.DB.prepare("SELECT slug, updated_at FROM shops WHERE is_vacation = 0").all<any>(),
    c.env.DB.prepare("SELECT slug FROM categories").all<any>(),
  ]);

  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: `${siteUrl}/`, priority: "1.0" },
    { loc: `${siteUrl}/search`, priority: "0.8" },
    ...categories.map((cat) => ({ loc: `${siteUrl}/search?category=${cat.slug}`, priority: "0.7" })),
    ...shops.map((s) => ({ loc: `${siteUrl}/shop/${s.slug}`, lastmod: toIsoDate(s.updated_at), priority: "0.6" })),
    ...listings.map((l) => ({ loc: `${siteUrl}/product/${l.id}`, lastmod: toIsoDate(l.updated_at), priority: "0.9" })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
          `    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return c.body(body, 200, { "Content-Type": "application/xml; charset=UTF-8" });
});

function toIsoDate(sqliteDatetime: string | null): string | undefined {
  if (!sqliteDatetime) return undefined;
  // D1's datetime('now') format is "YYYY-MM-DD HH:MM:SS" (UTC, no 'T'/'Z')
  return `${sqliteDatetime.replace(" ", "T")}Z`.slice(0, 20);
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

export default sitemap;
