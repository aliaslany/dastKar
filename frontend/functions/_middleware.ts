// Cloudflare Pages Function — runs on every request to this Pages project,
// at the edge, before the SPA's static HTML is served.
//
// Why this exists: react-helmet-async (see src/components/Seo.tsx) sets
// per-page <title>/OG tags correctly for real browsers, because browsers run
// the JS that puts them there. But Telegram, WhatsApp, and most other
// chat-app link-preview bots — the dominant way links get shared in Iran —
// fetch a URL once and read whatever HTML comes back WITHOUT running any
// JavaScript. They only ever see index.html's static defaults, so every
// shared product link would show "دستکار" and the generic description
// instead of the actual item.
//
// The fix: detect known bot user-agents, and only for them, fetch the real
// listing/shop data from the Worker API and rewrite the HTML's <head> at the
// edge before it reaches the bot. Real users never hit this path — next()
// serves the normal SPA untouched, exactly as fast as before.
//
// Requires one Pages environment variable (Pages project → Settings →
// Environment variables): WORKER_API_URL, e.g.
// https://dastkar-api.YOUR-SUBDOMAIN.workers.dev/api
// If it isn't set, this fails open and serves the page normally rather than
// breaking the site.

export interface Env {
  WORKER_API_URL?: string;
}

const BOT_UA =
  /facebookexternalhit|Twitterbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Googlebot|bingbot|Applebot|Discordbot|Pinterest|vkShare|SkypeUriPreview|redditbot|Embedly|W3C_Validator/i;

const SITE_NAME = "دستکار";

export const onRequest = async (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const { request, env, next } = context;
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!BOT_UA.test(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const productMatch = url.pathname.match(/^\/product\/([^/]+)\/?$/);
  const shopMatch = url.pathname.match(/^\/shop\/([^/]+)\/?$/);

  if (!productMatch && !shopMatch) {
    return next();
  }

  const apiBase = env.WORKER_API_URL;
  if (!apiBase) {
    return next();
  }

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;

  try {
    if (productMatch) {
      const res = await fetch(`${apiBase}/listings/${productMatch[1]}`);
      if (res.ok) {
        const data: any = await res.json();
        title = data.listing?.title ?? null;
        const rawDescription: string = data.listing?.description ?? "";
        description = rawDescription ? rawDescription.slice(0, 155) : null;
        const firstImageKey = data.images?.[0]?.r2_key;
        if (firstImageKey) image = `${apiBase}/uploads/${firstImageKey}`;
      }
    } else if (shopMatch) {
      const res = await fetch(`${apiBase}/shops/${shopMatch[1]}`);
      if (res.ok) {
        const data: any = await res.json();
        title = data.shop?.name ?? null;
        description = data.shop?.tagline ?? data.shop?.about ?? null;
        if (data.shop?.logo_url) image = `${apiBase}/uploads/${data.shop.logo_url}`;
      }
    }
  } catch {
    // Worker API unreachable — serve the normal SPA shell rather than 500.
    return next();
  }

  const response = await next();
  if (!title) return response; // listing/shop not found (deleted, unpublished) — serve as-is

  const fullTitle = `${title} | ${SITE_NAME}`;

  // HTMLRewriter and Element are Cloudflare Workers/Pages runtime globals —
  // available at request time on Cloudflare's edge, not something you'd
  // `import`. Not type-checked by the frontend's own `tsc -b` (that only
  // covers src/), and not run through Vite either — Wrangler bundles this
  // file directly when you deploy the Pages project.
  class SetTitle {
    element(el: Element) {
      el.setInnerContent(fullTitle);
    }
  }
  class RemoveElement {
    element(el: Element) {
      el.remove();
    }
  }
  class InjectHeadTags {
    element(el: Element) {
      const tags = [
        `<meta property="og:title" content="${escapeHtml(fullTitle)}">`,
        description ? `<meta property="og:description" content="${escapeHtml(description)}">` : "",
        `<meta property="og:url" content="${escapeHtml(url.toString())}">`,
        image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
        `<meta name="twitter:title" content="${escapeHtml(fullTitle)}">`,
      ]
        .filter(Boolean)
        .join("\n    ");
      el.append(tags, { html: true });
    }
  }

  return new HTMLRewriter()
    .on("title", new SetTitle())
    .on('meta[property="og:title"]', new RemoveElement())
    .on('meta[property="og:description"]', new RemoveElement())
    .on('meta[property="og:url"]', new RemoveElement())
    .on('meta[name="twitter:title"]', new RemoveElement())
    .on('meta[name="twitter:card"]', new RemoveElement())
    .on("head", new InjectHeadTags())
    .transform(response);
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
