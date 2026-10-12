import { allFeeds, fallbackFeedAddresses, PROXY_HOSTS, type Feed } from "@/lib/camera-feeds";
import { database } from "@/lib/db.server";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";

/**
 * Same shape as `lib/camera-streams.ts`: each feed has a stable `id`
 * (the alias), the address in `lib/camera-feeds.ts` is the fallback, and a row in `camera_feed` wins
 * once it exists. A 404 address is looked up again and saved for everyone.
 */

const CAMERA_FEEDS_TAG = "camera-feeds";
/** Embed players are not proxied, so they are not in `PROXY_HOSTS`. */
const EMBED_HOSTS = new Set(["rtsp.me"]);

type FeedRow = { id: string; src: string };

function feedById(id: string): Feed | undefined {
  return allFeeds().find((feed) => feed.id === id);
}

export function isFeedId(id: string): boolean {
  return feedById(id) !== undefined;
}

/** A saved address is trusted only if it is https, on a known host, and the right kind of file. */
function savedAddress(feed: Feed, src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    if (!(url.hostname in PROXY_HOSTS) && !EMBED_HOSTS.has(url.hostname)) return null;
    if (feed.kind === "hls" && !url.pathname.endsWith(".m3u8")) return null;
    if (feed.kind === "image" && !/\.jpe?g$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function ensureCameraFeedTable() {
  const sql = database();
  await sql`
    create table if not exists camera_feed (
      id text primary key,
      src text not null,
      updated_at timestamptz not null default now()
    )
  `;
}

/** First read puts every feed in the table. An existing row is never overwritten here. */
async function seedCameraFeeds() {
  const sql = database();
  await Promise.all(
    allFeeds().map(
      (feed) => sql`
        insert into camera_feed (id, src)
        values (${feed.id}, ${feed.src})
        on conflict (id) do nothing
      `,
    ),
  );
}

function mergeFeedAddresses(rows: FeedRow[]): Record<string, string> {
  const saved = new Map(rows.map((row) => [row.id, row.src]));
  const addresses = fallbackFeedAddresses();
  for (const feed of allFeeds()) {
    const src = saved.get(feed.id);
    const valid = src ? savedAddress(feed, src) : null;
    if (valid) addresses[feed.id] = valid;
  }
  return addresses;
}

/** True only when the address itself is gone. The browser cannot see this 404. */
async function addressIsGone(feed: Feed, src: string): Promise<boolean> {
  if (!savedAddress(feed, src)) return false;
  try {
    const referer = PROXY_HOSTS[new URL(src).hostname];
    const response = await fetch(src, {
      headers: referer ? { referer } : {},
      redirect: "manual",
      cache: "no-store",
    });
    return response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Nogales lists every playlist in one script. A camera keeps its path under `/{crossing}/{name}/`
 * while the host can move, so the id finds it again. Other sources have no lookup.
 */
async function lookupFeedAddress(feed: Feed): Promise<string | null> {
  const match = /^nogales-(deconcini|mariposa)-(.+)$/.exec(feed.id);
  if (!match) return null;
  const suffix = `/${match[1]}/${match[2]}/index.m3u8`;

  let script: string;
  try {
    const response = await fetch("https://heroicanogales.gob.mx/garita_assets/js/script.js", {
      cache: "no-store",
    });
    if (!response.ok) return null;
    script = await response.text();
  } catch {
    return null;
  }

  for (const found of script.match(/https:\/\/[A-Za-z0-9.-]+\/[^"'\s]+\.m3u8/g) ?? []) {
    if (found.endsWith(suffix)) return savedAddress(feed, found);
  }
  return null;
}

/** Shared feed addresses. A 404 refresh drops this tag, so the next read is the new row. */
export async function getCameraFeeds(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("days");
  cacheTag(CAMERA_FEEDS_TAG);

  await ensureCameraFeedTable();
  await seedCameraFeeds();
  const sql = database();
  const rows = (await sql`select id, src from camera_feed`) as FeedRow[];
  return mergeFeedAddresses(rows);
}

/**
 * Looks the feed up when `current` is a 404, saves that address, and expires the shared cache.
 * An address that is still there is returned unchanged.
 */
export async function refreshCameraFeed(id: string, current?: string): Promise<string | null> {
  const feed = feedById(id);
  if (!feed) return null;
  if (current && !(await addressIsGone(feed, current))) return current;

  const src = await lookupFeedAddress(feed);
  if (!src) return null;

  await ensureCameraFeedTable();
  const sql = database();
  await sql`
    insert into camera_feed (id, src)
    values (${id}, ${src})
    on conflict (id) do update
    set src = excluded.src,
        updated_at = now()
  `;
  revalidateTag(CAMERA_FEEDS_TAG, { expire: 0 });
  return src;
}
