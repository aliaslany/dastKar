import { Helmet } from "react-helmet-async";

const SITE_NAME = "دستکار";
const DEFAULT_DESCRIPTION =
  "دستکار، بازار آنلاین صنایع‌دستی، آثار هنری و محصولات دست‌ساز ایرانی. مستقیم از دست هنرمند به دست شما.";

// SITE_URL must match your real production domain once you have one — it
// feeds canonical links and JSON-LD, both of which search engines treat as
// a strong signal of "this is the one true URL for this page."
const SITE_URL = (import.meta as any).env?.VITE_SITE_URL ?? "https://dastkar.pages.dev";

type Props = {
  title: string;
  description?: string;
  path?: string; // e.g. "/product/abc123" — used to build the canonical URL
  image?: string; // absolute URL to a representative image, for OG/Twitter cards
  type?: "website" | "product" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  image,
  type = "website",
  noindex = false,
  jsonLd,
}: Props) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const jsonLdList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <html lang="fa" dir="rtl" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph — this is what Telegram, WhatsApp, and most Iranian
          messaging apps read to build a link preview card. */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type === "product" ? "product" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="fa_IR" />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLdList.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}

export { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION };
