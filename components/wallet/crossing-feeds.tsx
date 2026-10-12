"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { fallbackFeedAddresses, feedsForPort, type CrossingFeed } from "@/lib/camera-feeds";
import type { SnapshotHealth } from "@/lib/camera-snapshot.server";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { reportCameraExpanded, videoIsExpanded } from "@/lib/screen-orientation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CameraBar } from "./camera-bar";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

type Status = "loading" | "live" | "failed";

/**
 * The cameras for one CBP port (`feedsForPort`): Nogales, Laredo, the Ambassador Bridge and so on.
 * One view plays at a time, so a card never holds more than one stream open. Video plays live,
 * snapshots reload when the server sees a new picture, and the bar under the picture says how old
 * it is and where it comes from. Renders nothing for a crossing without cameras.
 */
export function CrossingFeeds({ port, name }: { port: PortWaitTime; name: string }) {
  const feeds = feedsForPort(port.portNumber);
  if (feeds.length === 0) return null;
  return <FeedViewer key={port.portNumber} feeds={feeds} name={name} />;
}

async function fetchFeedAddresses(): Promise<Record<string, string>> {
  const response = await fetch("/api/camera-feeds", { cache: "no-store" });
  if (!response.ok) throw new Error(`Camera feeds request failed (${response.status})`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") throw new Error("Camera feeds were empty.");
  const addresses: Record<string, string> = {};
  for (const [id, src] of Object.entries(body)) {
    if (typeof src === "string") addresses[id] = src;
  }
  return addresses;
}

/** Asks this app whether `src` is a 404. Only a confirmed 404 with a lookup comes back as a new address. */
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

function FeedViewer({ feeds, name }: { feeds: CrossingFeed[]; name: string }) {
  const { copy } = useLocale();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(feeds[0].id);
  const index = Math.max(
    0,
    feeds.findIndex((item) => item.id === activeId),
  );
  const feed = feeds[index];
  // Which way the new view arrives from, and how fast it was already moving when the
  // swipe handed off — so it keeps travelling at the same speed instead of restarting cold.
  const [enter, setEnter] = useState<{ dir: 1 | -1 | 0; velocity: number }>({
    dir: 0,
    velocity: 0,
  });

  const show = useCallback(
    (to: number, opts?: { silent?: boolean; velocity?: number }) => {
      const next = feeds[to];
      if (!next || to === index) return;
      if (!opts?.silent) haptic("selection");
      setEnter({ dir: to > index ? 1 : -1, velocity: opts?.velocity ?? 0 });
      setActiveId(next.id);
    },
    [feeds, index],
  );

  // Starts from the addresses in code, then the saved ones replace them.
  const { data: addresses } = useQuery({
    queryKey: ["camera-feeds"],
    queryFn: fetchFeedAddresses,
    initialData: fallbackFeedAddresses(),
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
  });

  const replace = useCallback(
    (id: string, src: string) => {
      queryClient.setQueryData<Record<string, string>>(["camera-feeds"], (current) => ({
        ...(current ?? fallbackFeedAddresses()),
        [id]: src,
      }));
    },
    [queryClient],
  );

  const activeChip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeChip.current?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const picker =
    feeds.length > 1 ? (
      <div
        role="group"
        aria-label={copy.cameraViews}
        className={cn(
          "flex snap-x snap-proximity gap-1.5 overflow-x-auto overscroll-x-contain px-3.5 pt-3 [scrollbar-width:none]",
          "[mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-14px),transparent)]",
        )}
      >
        {feeds.map((item) => {
          const active = item.id === feed.id;
          return (
            <button
              key={item.id}
              type="button"
              ref={active ? activeChip : undefined}
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                show(feeds.indexOf(item));
              }}
              className={cn(
                "relative shrink-0 snap-start scroll-mx-3.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap select-none",
                "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none",
                active ? "bg-accent text-accent-ink" : "bg-surface-strong text-muted",
              )}
            >
              {!active && <HapticPad />}
              {item.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <FeedStage
      key={feed.id}
      feed={feed}
      saved={addresses[feed.id] ?? feed.src}
      name={name}
      replace={replace}
      picker={picker}
      enter={enter}
      // The swipe already ticked its own haptic as it crossed the commit line (or on
      // release, if a fast flick never crossed it) — don't tick a second time here.
      onStep={(dir, velocity) => show(index + dir, { silent: true, velocity })}
      canStep={{ prev: index > 0, next: index < feeds.length - 1 }}
    />
  );
}

/** How far a view travels as it leaves or arrives, as a share of the width. Short keeps it tight. */
const HOP = 0.28;

/** Apple's rubber band: the further past the edge, the less the picture follows. */
function rubberBand(distance: number, size: number): number {
  const c = 0.55;
  const d = Math.abs(distance);
  return Math.sign(distance) * ((d * size * c) / (size + c * d));
}

/** How far across the picture a drag has to travel before it ticks "this will switch". */
const ARM_RATIO = 0.3;
/** Slack before an armed drag disarms, so a hand that wavers near the line doesn't chatter. */
const ARM_HYSTERESIS = 0.08;

/**
 * Drag the picture sideways to move to the next or previous view. It follows the finger 1:1,
 * resists at the ends, and decides from where the flick is heading, not where it let go. This
 * is the same spring the wallet cards use (`SPRING.release`), handed the finger's own velocity,
 * so a slow drag settles gently and a flick throws it, instead of every release playing the same
 * fixed-length animation. The old view leaves at that speed, the new one arrives carrying it, and
 * a grab mid-flight — settling home, or still arriving — picks the picture up from where it is,
 * because the spring is a motion value, not a fire-and-forget keyframe. The bottom strip is left
 * alone so the player's own scrubber still works.
 *
 * The drag ticks once it has travelled far enough that letting go now would switch views, ticks
 * again if it comes back out of that zone, and ticks softer when it bumps the resisted edge.
 * A flick that commits without ever crossing the line still ticks, at release.
 */
function useSwipe(
  onStep: (dir: 1 | -1, velocity: number) => void,
  canStep: { prev: boolean; next: boolean },
  enter: { dir: 1 | -1 | 0; velocity: number },
) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const flight = useRef<{ stop: () => void } | null>(null);
  const leaving = useRef(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    base: number;
    dx: number;
    shown: number;
    vx: number;
    live: boolean;
    armed: boolean;
    bumped: boolean;
  } | null>(null);

  // Runs before paint, so the view's first visible frame is already the arrival position —
  // never a flash of the rest position it is about to leave again.
  useLayoutEffect(() => {
    if (enter.dir === 0) return;
    const width = ref.current?.offsetWidth ?? 0;
    if (reduce || width === 0) {
      x.set(0);
      opacity.set(1);
      return;
    }
    x.set(enter.dir * width * HOP);
    opacity.set(0);
    const move = animate(
      x,
      0,
      enter.velocity ? { ...SPRING.release, velocity: enter.velocity } : SPRING.move,
    );
    const fade = animate(opacity, 1, { duration: 0.2, ease: [0.23, 1, 0.32, 1] });
    flight.current = {
      stop() {
        move.stop();
        fade.stop();
      },
    };
    return () => {
      move.stop();
      fade.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter.dir, enter.velocity, reduce]);

  function settleHome(velocity: number) {
    flight.current?.stop();
    if (reduce) {
      x.set(0);
      flight.current = null;
      return;
    }
    const controls = animate(x, 0, { ...SPRING.release, velocity });
    flight.current = controls;
    void controls.finished.then(
      () => {
        if (flight.current === controls) flight.current = null;
      },
      () => {},
    );
  }

  function leaveTo(dir: 1 | -1, width: number, velocity: number) {
    if (reduce) {
      x.set(0);
      opacity.set(1);
      onStep(dir, velocity);
      return;
    }
    leaving.current = true;
    const dest = -dir * width * HOP;
    // Hand off once the view is most of the way through its hop, so the switch lands with
    // the motion instead of waiting out the spring's last, barely-visible settle.
    const threshold = Math.abs(dest) * 0.85;
    const move = animate(x, dest, { ...SPRING.release, velocity });
    const fade = animate(opacity, 0, { duration: 0.16, ease: [0.4, 0, 1, 1] });
    let sent = false;
    const unwatch = x.on("change", (latest) => {
      if (Math.abs(latest) >= threshold) send();
    });
    function send() {
      if (sent) return;
      sent = true;
      unwatch();
      move.stop();
      fade.stop();
      leaving.current = false;
      if (flight.current === move) flight.current = null;
      onStep(dir, velocity);
    }
    flight.current = move;
    void move.finished.then(send, () => {});
  }

  const handlers = {
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (leaving.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientY > box.bottom - 56) return;
      // Grabbing a picture that is still settling or arriving: pick it up from where it is.
      flight.current?.stop();
      flight.current = null;
      if (opacity.get() < 1) void animate(opacity, 1, { duration: 0.12 });
      const base = x.get();
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        base,
        dx: 0,
        shown: base,
        vx: 0,
        live: base !== 0,
        armed: false,
        bumped: false,
      };
      if (base !== 0) event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (!state.live) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        state.live = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const now = performance.now();
      const dt = Math.max(1, now - state.t);
      state.vx = state.vx * 0.7 + ((dx - state.dx) / dt) * 0.3;
      state.t = now;
      state.dx = dx;
      const total = state.base + dx;
      const width = event.currentTarget.clientWidth;
      const blocked = total > 0 ? !canStep.prev : !canStep.next;
      state.shown = blocked ? rubberBand(total, width) : total;
      x.set(state.shown);

      if (blocked) {
        state.armed = false;
        if (!state.bumped && Math.abs(total) > 14) {
          state.bumped = true;
          haptic("soft");
        }
        return;
      }
      state.bumped = false;
      const line = width * ARM_RATIO;
      const past = Math.abs(state.shown) >= line;
      if (past && !state.armed) {
        state.armed = true;
        haptic("selection");
      } else if (state.armed && Math.abs(state.shown) < line - width * ARM_HYSTERESIS) {
        state.armed = false;
      }
    },
    onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
      const state = drag.current;
      drag.current = null;
      if (!state || !state.live) return;
      const width = event.currentTarget.clientWidth;
      // Motion's springs take velocity in units/second; the drag tracked px/ms.
      const velocity = state.vx * 1000;
      // Where the flick would come to rest if it kept coasting.
      const projected = state.shown + state.vx * 99;
      const dir: 1 | -1 = projected < 0 ? 1 : -1;
      const allowed = dir === 1 ? canStep.next : canStep.prev;
      if (!allowed || Math.abs(projected) < width * 0.35) {
        settleHome(velocity);
        return;
      }
      // The drag already ticked when it crossed the line. A quick flick that commits
      // without ever crossing it still needs a tick, right as it commits.
      if (!state.armed) haptic("medium");
      leaveTo(dir, width, velocity);
    },
    onPointerCancel() {
      const state = drag.current;
      drag.current = null;
      if (state) settleHome(state.vx * 1000);
    },
  };

  return { ref, handlers, x, opacity };
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}

function relativeAge(iso: string | null, now: number, locale: string): string | null {
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  const format = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "narrow",
  });
  if (seconds < 60) return format.format(0, "second");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return format.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return format.format(-hours, "hour");
  return format.format(-Math.round(hours / 24), "day");
}

function FeedStage({
  feed,
  saved,
  name,
  replace,
  picker,
  enter,
  onStep,
  canStep,
}: {
  feed: CrossingFeed;
  saved: string;
  name: string;
  replace: (id: string, src: string) => void;
  picker: ReactNode;
  enter: { dir: 1 | -1 | 0; velocity: number };
  onStep: (dir: 1 | -1, velocity: number) => void;
  canStep: { prev: boolean; next: boolean };
}) {
  const { locale, copy } = useLocale();
  const {
    ref: swipeRef,
    handlers: swipeHandlers,
    x: swipeX,
    opacity: swipeOpacity,
  } = useSwipe(onStep, canStep, enter);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [health, setHealth] = useState<SnapshotHealth | null>(null);
  const now = useNow(15_000);

  const [current, setCurrent] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
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
        if (address && address !== currentRef.current) {
          replace(feed.id, address);
          setCurrent(address);
        } else {
          setStatus("failed");
        }
      });
    },
    [feed.id, feed.kind, replace],
  );

  const age = relativeAge(health?.changedAt ?? null, now, locale);
  const isImage = feed.kind === "image";
  const offline = status === "failed" || health?.status === "down";
  const stale = isImage && health?.status === "stale";

  let caption: string = isImage ? "" : copy.live;
  if (offline) caption = copy.cameraOffline;
  else if (isImage && health && age) {
    caption = stale ? copy.cameraStale(age) : copy.cameraUpdated(age);
  }

  const showLive = !isImage && status !== "failed";

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div
        {...swipeHandlers}
        className="relative aspect-video touch-pan-y overflow-hidden bg-[#10131a]"
      >
        <motion.div
          ref={swipeRef}
          style={{ x: swipeX, opacity: swipeOpacity }}
          className="absolute inset-0 will-change-transform"
        >
          {status !== "failed" &&
            (feed.kind === "hls" ? (
              <FeedVideo
                src={current}
                proxied={`/api/camera-proxy?u=${encodeURIComponent(current)}`}
                label={copy.cameraLabel(`${name}, ${feed.label}`)}
                attempt={attempt}
                onStatus={onStatus}
              />
            ) : isImage ? (
              <FeedSnapshot
                id={feed.id}
                refreshSec={feed.refreshSec ?? 30}
                label={copy.cameraLabel(`${name}, ${feed.label}`)}
                stale={stale}
                attempt={attempt}
                onStatus={onStatus}
                onHealth={setHealth}
              />
            ) : (
              <iframe
                key={attempt}
                src={current}
                title={copy.cameraLabel(`${name}, ${feed.label}`)}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                onLoad={() => setStatus("live")}
                className="absolute inset-0 size-full border-0"
              />
            ))}

          {showLive && status === "live" && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white"
            >
              <span className="size-1.5 rounded-full bg-[#ff453a]" />
              {copy.live}
            </span>
          )}

          <div
            aria-hidden={status !== "loading"}
            className={cn(
              "pointer-events-none absolute inset-0 grid place-items-center overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
              status === "loading" && !offline ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="camera-shimmer absolute inset-0" />
            <div className="relative flex flex-col items-center gap-2.5 text-white/75">
              <svg
                viewBox="0 0 24 24"
                className="size-7 animate-spin motion-reduce:animate-pulse"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="9" className="opacity-25" />
                <path d="M21 12a9 9 0 0 0-9-9" />
              </svg>
              <span role="status" className="text-[12px] font-medium tracking-[0.01em]">
                {status === "loading" && !offline ? copy.cameraLoading : ""}
              </span>
            </div>
          </div>

          {offline && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
              <p className="text-[13px] font-medium text-white/70">{copy.cameraUnavailable}</p>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  looked.current = false;
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white active:bg-white/20"
              >
                {copy.cameraRetry}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {picker}

      <CameraBar
        title={feed.label}
        caption={caption}
        tone={offline ? "offline" : stale ? "stale" : caption ? "fresh" : "idle"}
        source={{
          provider: feed.provider,
          page: feed.page,
          official: feed.official,
        }}
      />
    </div>
  );
}

/** WebKit does not apply CORS to a video element, so it can play a source that only allows its own site. */
function playsSourceDirectly(): boolean {
  const agent = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(agent)) return true;
  return /AppleWebKit/.test(agent) && !/Chrome|Chromium|CriOS|Edg|Android/.test(agent);
}

/**
 * Safari plays the source straight from its host, which costs this app no bandwidth. If that fails,
 * or in any other browser, the stream comes through `/api/camera-proxy`.
 */
function FeedVideo({
  src,
  proxied,
  label,
  attempt,
  onStatus,
}: {
  src: string;
  proxied: string;
  label: string;
  attempt: number;
  onStatus: (status: Status) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [directFailed, setDirectFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const media: HTMLVideoElement = video;
    const viaProxy = directFailed || !playsSourceDirectly();
    const address = viaProxy ? proxied : src;
    let gone = false;
    let player: { destroy: () => void } | null = null;
    onStatus("loading");
    media.muted = true;

    const live = () => onStatus("live");
    const failed = () => {
      if (gone) return;
      if (!viaProxy) setDirectFailed(true);
      else onStatus("failed");
    };
    media.addEventListener("playing", live);

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      media.src = address;
      media.addEventListener("error", failed);
      void media.play().catch(() => {});
    } else {
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (gone) return;
          if (!Hls.isSupported()) return failed();
          const next = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 15,
            maxBufferLength: 20,
          });
          player = next;
          next.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) failed();
          });
          next.on(Hls.Events.MANIFEST_PARSED, () => {
            void media.play().catch(() => {});
          });
          next.loadSource(address);
          next.attachMedia(media);
        })
        .catch(failed);
    }

    return () => {
      gone = true;
      media.removeEventListener("playing", live);
      media.removeEventListener("error", failed);
      player?.destroy();
      media.removeAttribute("src");
      media.load();
    };
  }, [src, proxied, directFailed, attempt, onStatus]);

  // The expanded camera may turn a phone sideways, like the Brownsville cameras.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => reportCameraExpanded(video, videoIsExpanded(video));
    const expand = () => reportCameraExpanded(video, true);
    const inline = () => reportCameraExpanded(video, false);

    video.addEventListener("webkitbeginfullscreen", expand);
    video.addEventListener("webkitendfullscreen", inline);
    video.addEventListener("webkitpresentationmodechanged", sync);
    document.addEventListener("fullscreenchange", sync);
    return () => {
      video.removeEventListener("webkitbeginfullscreen", expand);
      video.removeEventListener("webkitendfullscreen", inline);
      video.removeEventListener("webkitpresentationmodechanged", sync);
      document.removeEventListener("fullscreenchange", sync);
      reportCameraExpanded(video, false);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      controls
      aria-label={label}
      className="aspect-video w-full bg-[#10131a] object-contain"
    />
  );
}

/** Asks the server how this camera is doing, and loads the picture only when its hash changes. */
function FeedSnapshot({
  id,
  refreshSec,
  label,
  stale,
  attempt,
  onStatus,
  onHealth,
}: {
  id: string;
  refreshSec: number;
  label: string;
  stale: boolean;
  attempt: number;
  onStatus: (status: Status) => void;
  onHealth: (health: SnapshotHealth | null) => void;
}) {
  const [health, setHealth] = useState<SnapshotHealth | null>(null);

  useEffect(() => {
    let gone = false;
    onStatus("loading");

    async function check() {
      try {
        const response = await fetch(`/api/camera-snapshot/${id}`, {
          cache: "no-store",
        });
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
    // A live snapshot, not an asset: next/image would cache and resize it. The hash is in the
    // address, so the picture reloads only when it changed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/camera-snapshot/${id}/image?v=${health.hash}`}
      alt={label}
      onLoad={() => onStatus("live")}
      onError={() => onStatus("failed")}
      className={cn(
        "aspect-video w-full object-cover transition-opacity",
        stale && "opacity-50 grayscale",
      )}
    />
  );
}
