/**
 * The dollar-peso rate. Client-safe: the browser calls the feed itself, no key.
 * Without a key the feed is free, shows the rate about 15 minutes late, and is capped per
 * IP address, so the last good rate is kept in `rate-store.ts` for when a call fails.
 */

export const RATE_URL = "https://api.exchangerate.dev/v1/latest?base=USD&symbols=MXN";
/** Where the feed asks to be credited. Free use requires a visible link to it. */
export const RATE_CREDIT_URL = "https://exchangerate.dev";
/** Refetch cadence while the tab is open. The feed itself moves about once a minute. */
export const RATE_REFRESH_MS = 10 * 60_000;

export type Currency = "USD" | "MXN";

export type Rate = {
  /** Pesos for one dollar. */
  mxn: number;
  /** ISO time the rate was observed, or the UTC day a daily reference belongs to. */
  asOf: string;
  /** A live quote moves through the day. Anything else is a once-a-day reference. */
  live: boolean;
};

export function otherCurrency(currency: Currency): Currency {
  return currency === "USD" ? "MXN" : "USD";
}

export function isRate(value: unknown): value is Rate {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.mxn === "number" &&
    Number.isFinite(record.mxn) &&
    record.mxn > 0 &&
    typeof record.asOf === "string" &&
    typeof record.live === "boolean"
  );
}

function recordAt(value: unknown, key: string): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const inner = (value as Record<string, unknown>)[key];
  return typeof inner === "object" && inner !== null ? (inner as Record<string, unknown>) : null;
}

/** Reads the feed's answer. Null when it is not a usable rate. */
export function parseRate(body: unknown): Rate | null {
  const mxn = recordAt(body, "rates")?.MXN;
  // A peso outside this band is bad data, not a market move.
  if (typeof mxn !== "number" || !Number.isFinite(mxn) || mxn < 1 || mxn > 1000) return null;
  const record = body as Record<string, unknown>;
  const effective = recordAt(body, "effective_at")?.MXN;
  const asOf =
    typeof effective === "string"
      ? effective
      : typeof record.data_updated_at === "string"
        ? record.data_updated_at
        : typeof record.timestamp === "string"
          ? record.timestamp
          : "";
  const live = recordAt(body, "sources")?.MXN === "live";
  return { mxn, asOf, live };
}

export async function fetchRate(signal?: AbortSignal): Promise<Rate> {
  const response = await fetch(RATE_URL, { signal });
  if (!response.ok) throw new Error(`Rate request failed (${response.status})`);
  const rate = parseRate(await response.json());
  if (!rate) throw new Error("The rate was not usable.");
  return rate;
}

const MAX_WHOLE_DIGITS = 9;

/** What was typed, kept to digits and one dot, two decimals, no leading zeros. */
export function cleanAmount(raw: string): string {
  let text = raw.replace(/[^\d.]/g, "");
  const dot = text.indexOf(".");
  if (dot !== -1) text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, "");
  const [whole, fraction] = text.split(".");
  const head = whole.replace(/^0+(?=\d)/, "").slice(0, MAX_WHOLE_DIGITS);
  return fraction === undefined ? head : `${head}.${fraction.slice(0, 2)}`;
}

/**
 * What a tap-to-edit leaves behind. Typing replaces the amount; deleting edits it.
 * The phone shows its edit menu when the text is selected, so a tap never selects.
 */
export function freshAmount(previous: string, next: string): string {
  if (next.length <= previous.length) return next;
  let start = 0;
  while (start < previous.length && previous[start] === next[start]) start += 1;
  let end = 0;
  while (
    end < previous.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end += 1;
  }
  const added = next.slice(start, next.length - end);
  const around = next.slice(0, start) + next.slice(next.length - end);
  return around === previous && added !== "" ? added : next;
}

/** The number behind a cleaned amount. Null while nothing usable is typed. */
export function parseAmount(clean: string): number | null {
  if (clean === "" || clean === ".") return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

export function convert(amount: number, mxn: number, from: Currency): number {
  return from === "USD" ? amount * mxn : amount / mxn;
}

/**
 * A result put back into the field: cents, no grouping, no trailing zeros. Not cut to the
 * typing limit, because a large dollar amount is more digits as pesos.
 */
export function amountField(value: number): string {
  return String(Math.round(value * 100) / 100);
}
