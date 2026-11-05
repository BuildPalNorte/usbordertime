import { createHash } from "node:crypto";
import { getCameraFeeds } from "@/lib/camera-feeds.server";
import { database } from "@/lib/db.server";
import { FEED_GROUPS, PROXY_HOSTS, type Feed } from "@/lib/camera-feeds";

/**
 * One shared fetch per snapshot camera, however many people look.
 *
 * - A camera is re-fetched at most every `CHECK_EVERY_MS`; concurrent opens share one request.
 * - How old the picture is comes from the source's `Last-Modified` when it sends one. Otherwise it is
 *   the last time the bytes' hash changed, so a frozen camera or a static placeholder goes stale.
 * - Health is saved to `camera_snapshot` when its status changes, and otherwise every 30 minutes,
 *   so a restart or another instance keeps the history without holding the database open.
 * - The picture bytes are only kept in memory. Nothing is stored in the database but the hash.
 */

const CHECK_EVERY_MS = 45_000;
const STALE_AFTER_MS = 10 * 60_000;
const SAVE_EVERY_MS = 30 * 60_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type SnapshotStatus = "live" | "stale" | "down";

export type SnapshotHealth = {
  id: string;
  status: SnapshotStatus;
  /** When the picture last changed, as far as we can tell. */
  changedAt: string | null;
  checkedAt: string;
  /** Short hash of the current picture. The image URL carries it, so it reloads only on change. */
  hash: string | null;
};

type Entry = {
  bytes: Uint8Array | null;
  type: string;
  health: SnapshotHealth;
  checkedMs: number;
  /** When the saved row was last written, and the status it holds. */
  savedMs: number;
  savedStatus: SnapshotStatus | null;
};

const store = globalThis as typeof globalThis & {
  __snapshotCache?: Map<string, Entry>;
  __snapshotInflight?: Map<string, Promise<Entry>>;
  __snapshotTable?: Promise<void>;
};
const cache = (store.__snapshotCache ??= new Map());
const inflight = (store.__snapshotInflight ??= new Map());

function snapshotFeed(id: string): Feed | null {
  for (const group of FEED_GROUPS) {
    const feed = group.feeds.find((item) => item.id === id && item.kind === "image");
    if (feed) return feed;
  }
  return null;
}

function ensureTable(): Promise<void> {
  store.__snapshotTable ??= (async () => {
    const sql = database();
    await sql`
      create table if not exists camera_snapshot (
        id text primary key,
        hash text,
        changed_at timestamptz,
        checked_at timestamptz not null default now(),
        status text not null
      )
    `;
  })().catch((error) => {
    store.__snapshotTable = undefined;
    throw error;
  });
  return store.__snapshotTable;
}

type Saved = {
  hash: string | null;
  changed_at: string | null;
  checked_at: string | null;
  status: string | null;
};

async function readSaved(id: string): Promise<Saved | null> {
  try {
    await ensureTable();
    const rows = (await database()`
      select hash, changed_at, checked_at, status from camera_snapshot where id = ${id}
    `) as Saved[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function writeSaved(health: SnapshotHealth): Promise<void> {
  try {
    await ensureTable();
    await database()`
      insert into camera_snapshot (id, hash, changed_at, checked_at, status)
      values (${health.id}, ${health.hash}, ${health.changedAt}, ${health.checkedAt}, ${health.status})
      on conflict (id) do update
      set hash = excluded.hash,
          changed_at = excluded.changed_at,
          checked_at = excluded.checked_at,
          status = excluded.status
    `;
  } catch {
    // Health history is a bonus. A database hiccup must not hide a working picture.
  }
}

/**
 * The row only helps a cold server remember when the picture last changed. Writing it on every
 * check kept Neon awake for as long as a camera was on screen, so it is saved when the status
 * changes and otherwise at most every `SAVE_EVERY_MS`. The memory copy is what viewers see.
 */
async function persist(
  health: SnapshotHealth,
  now: number,
  savedMs: number,
  savedStatus: SnapshotStatus | null,
): Promise<{ savedMs: number; savedStatus: SnapshotStatus | null }> {
  if (savedStatus === health.status && now - savedMs < SAVE_EVERY_MS) {
    return { savedMs, savedStatus };
  }
  await writeSaved(health);
  return { savedMs: now, savedStatus: health.status };
}

function isStatus(value: string | null | undefined): value is SnapshotStatus {
  return value === "live" || value === "stale" || value === "down";
}

async function refresh(feed: Feed, previous: Entry | undefined): Promise<Entry> {
  const now = Date.now();
  // The shared address wins over the one in code, like the saved camera streams.
  const addresses = await getCameraFeeds().catch(() => null);
  const target = new URL(addresses?.[feed.id] ?? feed.src);
  const referer = PROXY_HOSTS[target.hostname];

  const saved = previous ? null : await readSaved(feed.id);
  const knownHash = previous?.health.hash ?? saved?.hash ?? null;
  const knownChanged = previous?.health.changedAt ?? saved?.changed_at ?? null;
  const savedAt = saved?.checked_at ? Date.parse(String(saved.checked_at)) : NaN;
  const savedMs = previous?.savedMs ?? (Number.isFinite(savedAt) ? savedAt : 0);
  const savedStatus = previous?.savedStatus ?? (isStatus(saved?.status) ? saved.status : null);

  let upstream: Response | null = null;
  try {
    upstream = await fetch(target, {
      headers: { "user-agent": UA, ...(referer ? { referer } : {}) },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    upstream = null;
  }

  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream || !upstream.ok || !type.startsWith("image/")) {
    const entry: Entry = {
      bytes: previous?.bytes ?? null,
      type: previous?.type ?? "image/jpeg",
      checkedMs: now,
      savedMs,
      savedStatus,
      health: {
        id: feed.id,
        status: "down",
        changedAt: knownChanged ? new Date(knownChanged).toISOString() : null,
        checkedAt: new Date(now).toISOString(),
        hash: knownHash,
      },
    };
    Object.assign(entry, await persist(entry.health, now, savedMs, savedStatus));
    return entry;
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 16);

  const modified = Date.parse(upstream.headers.get("last-modified") ?? "");
  const changedMs = Number.isFinite(modified)
    ? modified
    : hash !== knownHash || !knownChanged
      ? now
      : Date.parse(knownChanged);

  const entry: Entry = {
    bytes,
    type,
    checkedMs: now,
    savedMs,
    savedStatus,
    health: {
      id: feed.id,
      status: now - changedMs > STALE_AFTER_MS ? "stale" : "live",
      changedAt: new Date(changedMs).toISOString(),
      checkedAt: new Date(now).toISOString(),
      hash,
    },
  };
  Object.assign(entry, await persist(entry.health, now, savedMs, savedStatus));
  return entry;
}

/** Current picture and health for one snapshot camera, or null when the id is not a snapshot feed. */
export async function getSnapshot(id: string): Promise<Entry | null> {
  const feed = snapshotFeed(id);
  if (!feed) return null;

  const cached = cache.get(id);
  if (cached && Date.now() - cached.checkedMs < CHECK_EVERY_MS) return cached;

  let pending = inflight.get(id);
  if (!pending) {
    pending = refresh(feed, cached)
      .then((entry) => {
        cache.set(id, entry);
        return entry;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, pending);
  }
  return pending;
}
