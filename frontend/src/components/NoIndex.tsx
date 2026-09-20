import { Helmet } from "react-helmet-async";

// Drop this into any account/cart/checkout/dashboard page. These pages have
// no SEO value and letting them get indexed just dilutes the site's
// authority on the pages that actually matter (products, shops, categories).
export default function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
