export type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  ZARINPAL_MERCHANT_ID: string;
  FRONTEND_URL: string;               // e.g. https://dastkar.pages.dev — used to build ZarinPal's callback_url
  PLATFORM_FEE_PERCENT: string;
  ENVIRONMENT: string;
};

export type Variables = {
  userId: string | null;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
