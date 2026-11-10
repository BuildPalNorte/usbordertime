import { createHmac } from "node:crypto";
import { database } from "@/lib/db.server";
import { headers } from "next/headers";

/**
 * A shared counter per client address, for requests that need no account. The count lives in the
 * database so it holds across serverless instances. The address is hashed with a server secret
 * before it is stored, so no raw IP is kept. If the database does not answer, a per-instance
 * counter takes over, and a failed check never blocks a real visit by itself.
 */

let ensuring: Promise<void> | null = null;

function ensureThrottleTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists throttle_hit (
          key text not null,
          window_start timestamptz not null,
          hits integer not null default 0,
          primary key (key, window_start)
        )
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

/** The address the platform saw. Vercel sets `x-forwarded-for`; the first entry is the client. */
export function clientAddress(list: Headers): string {
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip")?.trim() || "unknown";
}

/** A stable, non-reversible name for an address. Read the secret literally: a computed env name is empty in the bundle. */
export function hashAddress(address: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? "border-time-throttle";
  return createHmac("sha256", secret).update(address).digest("hex").slice(0, 32);
}

const local = new Map<string, { windowStart: number; hits: number }>();

function localHit(key: string, seconds: number): number {
  const now = Date.now();
  const size = seconds * 1000;
  const windowStart = Math.floor(now / size) * size;
  const entry = local.get(key);
  const next = entry && entry.windowStart === windowStart ? entry.hits + 1 : 1;
  local.set(key, { windowStart, hits: next });
  if (local.size > 5000) {
    for (const [name, value] of local) if (now - value.windowStart > size * 2) local.delete(name);
  }
  return next;
}

/**
 * Counts one request for this client in `scope` and says whether it is still within `limit` for
 * the current `seconds` window. Fixed windows: a burst across a boundary can briefly reach twice
 * the limit, which is fine for stopping a flood.
 */
export async function withinLimit(
  scope: string,
  limit: number,
  seconds: number,
  /** Count this name instead of the client address. A visitor id keeps a shared address from counting everyone together. */
  who?: string,
): Promise<boolean> {
  const name = who ?? clientAddress(await headers());
  const key = `${scope}:${hashAddress(name)}`;
  try {
    await ensureThrottleTable();
    const sql = database();
    const rows = (await sql`
      insert into throttle_hit (key, window_start, hits)
      values (
        ${key},
        to_timestamp(floor(extract(epoch from now()) / ${seconds}::int) * ${seconds}::int),
        1
      )
      on conflict (key, window_start) do update set hits = throttle_hit.hits + 1
      returning hits
    `) as { hits: unknown }[];
    const hits = Number(rows[0]?.hits ?? 0);
    // Old windows are only noise. Sweep them now and then, not on every request.
    if (Math.random() < 0.02) {
      void sql`delete from throttle_hit where window_start < now() - interval '1 day'`.catch(() => {});
    }
    return hits <= limit;
  } catch (error) {
    console.error("throttle", error);
    return localHit(key, seconds) <= limit;
  }
}

export function tooManyRequests(): Response {
  return Response.json(
    { error: "Too many requests." },
    { status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": "60" } },
  );
}

/**
 * Limits for a visit with no account. A browser the server already knows is counted by its own
 * visitor id, so a shared address (a carrier, a school, a family) never counts strangers against
 * each other. Only a browser the server has not seen is counted by address, and those caps are
 * far above a crowd arriving at once, so only a script sending thousands of requests reaches them.
 * Going over only stops the count being recorded: the app itself never depends on these answers.
 */
export const KNOWN_VISITOR_LIMIT = { scope: "visitor", limit: 300, seconds: 60 } as const;
export const NEW_VISITOR_BURST = { scope: "new-visitor-burst", limit: 1000, seconds: 60 } as const;
export const NEW_VISITOR_HOURLY = { scope: "new-visitor-hourly", limit: 1000, seconds: 3600 } as const;
