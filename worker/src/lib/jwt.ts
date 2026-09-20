// Minimal HMAC-SHA256 JWT sign/verify using Web Crypto (no npm dep, keeps Worker small).

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(base64);
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload: Record<string, unknown>, secret: string, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const headerB64 = b64url(JSON.stringify(header));
  const bodyB64 = b64url(JSON.stringify(body));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${headerB64}.${bodyB64}`));
  return `${headerB64}.${bodyB64}.${b64url(sig)}`;
}

export async function verifyJWT<T = Record<string, unknown>>(token: string, secret: string): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  const key = await hmacKey(secret);
  const sigStr = b64urlDecode(sigB64);
  const sigBytes = new Uint8Array(sigStr.length);
  for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(`${headerB64}.${bodyB64}`));
  if (!valid) return null;
  const payload = JSON.parse(b64urlDecode(bodyB64));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload as T;
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return b64url(digest);
}
