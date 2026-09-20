import type { Bindings } from "./types";
import { restoreStockAndCancel } from "./routes/orders";

// Abandoned-checkout cleanup: an order reserves stock the moment checkout
// starts (see orders.ts POST /checkout), before the buyer has actually paid.
// If the buyer closes the tab, gets a failed card, or just never finishes at
// ZarinPal, that order is stuck 'pending' forever and the stock stays locked
// away from other buyers unless something releases it.
//
// This runs on a Cron Trigger (see wrangler.toml [triggers]) and cancels any
// order still 'pending' after ABANDONED_ORDER_MINUTES, restoring its stock —
// reusing the exact same restoreStockAndCancel() the payment-failure path
// uses, so there's one code path for "this order didn't happen."
const ABANDONED_ORDER_MINUTES = 60;

export async function handleScheduled(env: Bindings): Promise<void> {
  const { results: stale } = await env.DB.prepare(
    `SELECT id FROM orders
     WHERE status = 'pending'
       AND created_at < datetime('now', ?)`
  ).bind(`-${ABANDONED_ORDER_MINUTES} minutes`).all<{ id: string }>();

  for (const order of stale) {
    await restoreStockAndCancel(env.DB, order.id);
  }

  if (stale.length > 0) {
    console.log(`Cleaned up ${stale.length} abandoned order(s) older than ${ABANDONED_ORDER_MINUTES} minutes.`);
  }
}
