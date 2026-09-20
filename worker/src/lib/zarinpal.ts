// ZarinPal payment gateway client (REST API v4) — Iran's most widely used IPG,
// settles directly to Iranian bank accounts (Sheba/IBAN). Docs:
// https://www.zarinpal.com/docs/paymentGateway/
//
// Flow (redirect-based, not an embedded widget like Stripe Elements):
//   1. requestPayment() -> get an `authority` token
//   2. redirect the buyer's browser to getStartPayUrl(authority)
//   3. ZarinPal redirects back to your callback_url with ?Authority=...&Status=OK|NOK
//   4. verifyPayment() confirms the charge actually succeeded and returns ref_id
//
// Marketplace split (تسهیم): the `wages` array sends part of the payment
// straight to a seller's IBAN at settlement time. Any amount NOT covered by
// `wages` stays in the platform's own ZarinPal merchant account — that's how
// the platform fee is collected, with no separate transfer step needed.

const ZARINPAL_BASE = "https://payment.zarinpal.com/pg/v4/payment";
const ZARINPAL_STARTPAY = "https://payment.zarinpal.com/pg/StartPay";

export type ZarinpalWage = {
  iban: string; // seller's Sheba/IBAN, format IR + 24 digits
  amount: number; // in the same currency unit as the top-level `amount`
  description: string;
};

export type PaymentRequestResult =
  | { ok: true; authority: string; paymentUrl: string }
  | { ok: false; code: number; message: string };

// amount unit is controlled by `currency`: "IRT" = Toman, "IRR" = Rial.
// We use Toman throughout since that's what `price_toman` stores and what
// Iranian buyers expect to read.
export async function requestPayment(opts: {
  merchantId: string;
  amount: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  email?: string;
  wages?: ZarinpalWage[];
}): Promise<PaymentRequestResult> {
  const res = await fetch(`${ZARINPAL_BASE}/request.json`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      merchant_id: opts.merchantId,
      amount: opts.amount,
      currency: "IRT",
      callback_url: opts.callbackUrl,
      description: opts.description,
      metadata: {
        ...(opts.mobile ? { mobile: opts.mobile } : {}),
        ...(opts.email ? { email: opts.email } : {}),
      },
      ...(opts.wages?.length ? { wages: opts.wages } : {}),
    }),
  });
  const data: any = await res.json();

  if (data?.data?.code === 100 && data.data.authority) {
    return { ok: true, authority: data.data.authority, paymentUrl: `${ZARINPAL_STARTPAY}/${data.data.authority}` };
  }
  const err = data?.errors ?? {};
  return { ok: false, code: err.code ?? data?.data?.code ?? -1, message: err.message ?? "درخواست پرداخت ناموفق بود." };
}

export type VerifyResult =
  | { ok: true; refId: string; cardPan?: string }
  | { ok: false; code: number; message: string };

export async function verifyPayment(opts: {
  merchantId: string;
  amount: number;
  authority: string;
}): Promise<VerifyResult> {
  const res = await fetch(`${ZARINPAL_BASE}/verify.json`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      merchant_id: opts.merchantId,
      amount: opts.amount,
      currency: "IRT",
      authority: opts.authority,
    }),
  });
  const data: any = await res.json();

  // code 100 = freshly verified now; 101 = already verified earlier (also a success)
  if (data?.data?.code === 100 || data?.data?.code === 101) {
    return { ok: true, refId: String(data.data.ref_id), cardPan: data.data.card_pan };
  }
  const err = data?.errors ?? {};
  return { ok: false, code: err.code ?? data?.data?.code ?? -1, message: err.message ?? "تایید پرداخت ناموفق بود." };
}

// Basic structural check for an Iranian IBAN/Sheba number: IR + 24 digits.
export function isValidIban(iban: string): boolean {
  return /^IR\d{24}$/.test(iban.trim().toUpperCase());
}
