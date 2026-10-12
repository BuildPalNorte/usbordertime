"use client";

import { FEED_GROUPS, NO_DIRECT_FEED, type Feed } from "@/lib/camera-feeds";
import { CAMERA_GROUPS, NO_CAMERA_FOUND } from "@/lib/camera-candidates";
import type { SnapshotHealth } from "@/lib/camera-snapshot.server";
import { useCallback, useEffect, useRef, useState } from "react";

type BorderFilter = "All" | "Mexico" | "Canada";
type Status = "loading" | "live" | "failed";

function address(feed: Feed, src: string): string {
  return feed.proxy ? `/api/camera-proxy?u=${encodeURIComponent(src)}` : src;
}

/**
 * Asks this app whether `src` is a 404. Only a confirmed 404 with a lookup comes back as a new
 * address. The same address, or none, means the failure was something else.
 */
async function requestFeedAddress(id: string, src: string): Promise<string | null> {
  try {
    const response = await fetch("/api/camera-feeds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, src }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { src?: unknown };
    return typeof body.src === "string" ? body.src : null;
  } catch {
    return null;
  }
}

/** True while the tile is on screen. Feeds off screen are unmounted, so 60 cameras never run at once. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "200px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, visible] as const;
}

function HlsPlayer({
  src,
  attempt,
  onStatus,
}: {
  src: string;
  attempt: number;
  onStatus: (status: Status) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const media: HTMLVideoElement = video;
    let gone = false;
    let player: { destroy: () => void } | null = null;
    onStatus("loading");
    media.muted = true;

    const live = () => onStatus("live");
    const failed = () => onStatus("failed");
    media.addEventListener("playing", live);

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      media.src = src;
      media.addEventListener("error", failed);
      void media.play().catch(() => {});
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (gone) return;
        if (!Hls.isSupported()) return failed();
        const hls = new Hls({ liveSyncDurationCount: 2 });
        player = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) failed();
        });
        hls.loadSource(src);
        hls.attachMedia(media);
        void media.play().catch(() => {});
      });
    }

    return () => {
      gone = true;
      media.removeEventListener("playing", live);
      media.removeEventListener("error", failed);
      player?.destroy();
      media.removeAttribute("src");
      media.load();
    };
  }, [src, attempt, onStatus]);

  return <video ref={videoRef} muted playsInline controls className="h-full w-full object-cover" />;
}

function SnapshotImage({
  id,
  refreshSec,
  attempt,
  onStatus,
  onHealth,
}: {
  id: string;
  refreshSec: number;
  attempt: number;
  onStatus: (status: Status) => void;
  onHealth: (health: SnapshotHealth | null) => void;
}) {
  const [health, setHealth] = useState<SnapshotHealth | null>(null);

  // Ask our server how this camera is doing. It shares one upstream fetch between everyone.
  useEffect(() => {
    let gone = false;
    onStatus("loading");

    async function check() {
      try {
        const response = await fetch(`/api/camera-snapshot/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as SnapshotHealth;
        if (gone) return;
        setHealth(next);
        onHealth(next);
        if (next.status === "down") onStatus("failed");
      } catch {
        if (gone) return;
        setHealth(null);
        onHealth(null);
        onStatus("failed");
      }
    }

    void check();
    const timer = window.setInterval(check, refreshSec * 1000);
    return () => {
      gone = true;
      window.clearInterval(timer);
    };
  }, [id, refreshSec, attempt, onStatus, onHealth]);

  if (!health || health.status === "down" || !health.hash) return null;
  return (
    // A live snapshot, not an asset: next/image would cache and resize it.
    // The hash is in the address, so the picture reloads only when it changed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/camera-snapshot/${id}/image?v=${health.hash}`}
      alt=""
      onLoad={() => onStatus("live")}
      onError={() => onStatus("failed")}
      className={`h-full w-full object-cover ${health.status === "stale" ? "opacity-50 grayscale" : ""}`}
    />
  );
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "no update yet";
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 90) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}

function FeedTile({ feed, saved }: { feed: Feed; saved: string }) {
  const [ref, visible] = useOnScreen<HTMLDivElement>();
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState(saved);
  const [source, setSource] = useState(saved);
  if (source !== saved) {
    setSource(saved);
    setCurrent(saved);
  }
  const currentRef = useRef(current);
  const looked = useRef(false);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // A playlist that fails is checked on the server once. A 404 is saved for everyone, then played.
  const onStatus = useCallback(
    (next: Status) => {
      if (next !== "failed" || feed.kind !== "hls" || looked.current) {
        setStatus(next);
        return;
      }
      looked.current = true;
      void requestFeedAddress(feed.id, currentRef.current).then((address) => {
        if (address && address !== currentRef.current) setCurrent(address);
        else setStatus("failed");
      });
    },
    [feed.id, feed.kind],
  );
  const [health, setHealth] = useState<SnapshotHealth | null>(null);
  const now = useNow(15_000);
  const src = address(feed, current);

  return (
    <li className="overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
      <div ref={ref} className="relative aspect-video bg-black/80">
        {visible ? (
          feed.kind === "hls" ? (
            <HlsPlayer src={src} attempt={attempt} onStatus={onStatus} />
          ) : feed.kind === "image" ? (
            <SnapshotImage
              id={feed.id}
              refreshSec={feed.refreshSec ?? 30}
              attempt={attempt}
              onStatus={setStatus}
              onHealth={setHealth}
            />
          ) : (
            <iframe
              key={attempt}
              src={src}
              title={feed.label}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              // YouTube refuses an embed that sends no referrer (error 153).
              referrerPolicy={src.includes("youtube.com") ? "strict-origin-when-cross-origin" : "no-referrer"}
              onLoad={() => setStatus("live")}
              className="h-full w-full border-0"
            />
          )
        ) : null}

        {visible && status === "loading" ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-white/70">
            Connecting…
          </p>
        ) : null}
        {status === "failed" ? (
          <div className="absolute inset-0 grid place-items-center gap-2 bg-black/85 p-3 text-center text-xs text-white">
            <p>
              This camera is not answering right now.
              {health?.changedAt ? ` Last picture ${ago(health.changedAt, now)}.` : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                looked.current = false;
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
              className="rounded-lg border border-white/30 px-3 py-1.5 font-medium"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="min-w-0 truncate font-medium">{feed.label}</span>
        <span
          className={`shrink-0 ${health?.status === "stale" ? "text-amber-600 dark:text-amber-300" : "opacity-60"}`}
        >
          {feed.kind !== "image"
            ? "Live"
            : !health
              ? "Snapshot"
              : health.status === "down"
                ? health.changedAt
                  ? `Offline · last ${ago(health.changedAt, now)}`
                  : "Offline"
                : `${health.status === "stale" ? "Stale · " : "Updated "}${ago(health.changedAt, now)}`}
        </span>
      </div>
    </li>
  );
}

export function CameraLab({ addresses }: { addresses: Record<string, string> }) {
  const [border, setBorder] = useState<BorderFilter>("All");
  const groups = FEED_GROUPS.filter((group) => border === "All" || group.border === border);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide opacity-60">Temporary page</p>
        <h1 className="text-2xl font-semibold">Camera feeds</h1>
        <p className="mt-2 text-sm opacity-80">
          The actual video and snapshots found behind public camera pages. A tile connects only
          while it is on screen. Snapshot feeds reload on the interval shown. If a camera does not
          answer, its tile says so and offers a retry.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["All", "Mexico", "Canada"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setBorder(value)}
            aria-pressed={border === value}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              border === value
                ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 id={`group-${group.id}`} className="text-base font-semibold">
                  {group.name}
                </h2>
                <p className="text-xs opacity-60">
                  {group.border} border · CBP {group.ports.join(", ")}
                </p>
              </div>
              <a
                href={group.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
              >
                Source page ↗
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.feeds.map((feed) => (
                <FeedTile key={feed.id} feed={feed} saved={addresses[feed.id] ?? feed.src} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-base font-semibold">Could not find a live feed</h2>
        <p className="mt-1 text-sm opacity-70">
          A page exists for these, but not a proper live stream or snapshot I could use.
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {NO_DIRECT_FEED.map((item) => (
            <li key={item.name}>
              <a
                href={item.page}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                {item.name} ↗
              </a>
              <span className="opacity-70"> · {item.why}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">No camera found at all</h2>
        <p className="mt-1 text-sm opacity-80">{NO_CAMERA_FOUND.join(" · ")}</p>
      </section>

      <details className="mt-8 text-sm">
        <summary className="cursor-pointer font-medium">
          Every camera page I found (links only)
        </summary>
        <ul className="mt-3 space-y-2">
          {CAMERA_GROUPS.map((group) => (
            <li key={group.id}>
              <p className="font-medium">{group.name}</p>
              <ul className="ml-4 list-disc opacity-80">
                {group.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {source.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
