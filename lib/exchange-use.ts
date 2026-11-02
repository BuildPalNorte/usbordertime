/** Client-safe. No server imports here. */

import type { Currency } from "@/lib/rate";

/** Largest amount worth recording; anything above is a typo or a paste. */
export const EXCHANGE_MAX_AMOUNT = 1_000_000_000;

/**
 * Tells the server what a signed-in rider settled on in the converter: the currency they hold,
 * the amount, and its worth in dollars. Best effort, nothing waits on it.
 */
export function trackExchange(from: Currency, amount: number, usd: number): void {
  void fetch("/api/exchange-use", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, amount, usd }),
    keepalive: true,
  }).catch(() => {});
}
