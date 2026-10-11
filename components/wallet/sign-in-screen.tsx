"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { haptic, type Haptic } from "@/lib/haptics";
import { currentCallbackURL } from "@/lib/routes";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { HapticPad } from "./haptic-pad";
import { LanguageSwitch } from "./language-switch";
import { cn } from "@/lib/cn";
import { cardBackground, PALETTES, project, TONE_DOT } from "@/lib/ports";
import type { CSSProperties } from "react";
import { CARD_H, PEEK, REDUCED, SPRING, stackHeight } from "./motion";
import { ThemeSwitch } from "./theme-switch";
import { WaitDuration } from "./wait-duration";

/** Upward travel that arms sign-in. A flick can still project past it. */
const COMMIT = 108;
/** Drag back through this gap before the detent can tick again. */
const RELEASE_GAP = 28;
/** How far the card follows before it resists. */
const LIMIT = 164;
/** Movement before a touch becomes a swipe, so a tap still lands. */
const SLOP = 10;

export function SignInScreen({ problem }: { problem?: "profile" }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("sign-in") !== "failed") return;
    setFailed(true);
    url.searchParams.delete("sign-in");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const busyRef = useRef(false);
  const signIn = async (tick: Haptic | null = "selection") => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (tick) haptic(tick);
    setBusy(true);
    setFailed(false);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: currentCallbackURL(),
      errorCallbackURL: `${window.location.pathname}?sign-in=failed`,
    });
    if (error) {
      busyRef.current = false;
      setFailed(true);
      setBusy(false);
      haptic("error");
    }
  };

  const error =
    failed || problem === "profile"
      ? problem === "profile" && !failed
        ? copy.profileError
        : copy.signInFailed
      : null;

  const swipe = usePageSwipe({ busy, failed, reduce: !!reduce, onSignIn: signIn });

  const pal = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
  // Same anatomy as the wallet: earlier cards peek above, the last one is the front card.
  const cards = [
    { name: "Nuevo", sub: "Brownsville", wait: 10, tone: "clear" as const, palette: pal("pine") },
    { name: "Viejo", sub: "Brownsville", wait: 60, tone: "busy" as const, palette: pal("clay") },
    { name: "De los tomates", sub: "Brownsville", wait: 160, tone: "slow" as const, palette: pal("cobalt") },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] max-lg:pb-[calc(var(--sign-card-h)+0.5rem)] sm:px-6">
        <div
          aria-hidden
          className="relative select-none max-lg:origin-top max-lg:scale-[0.7] max-lg:mb-[calc(var(--stack-h)*-0.3)]"
          style={{ height: stackHeight(cards.length), "--stack-h": `${stackHeight(cards.length)}px` } as CSSProperties}
        >
          {cards.map((c, i) => {
            const front = i === cards.length - 1;
            return (
              <motion.div
                key={c.name}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? REDUCED : { ...SPRING.move, delay: i * 0.07 }}
                className="absolute inset-x-0 overflow-hidden rounded-3xl p-[18px] text-white"
                style={{
                  top: i * PEEK,
                  height: CARD_H,
                  zIndex: i,
                  background: cardBackground(c.palette),
                  boxShadow: `0 -14px 28px -18px ${c.palette.to}cc, 0 22px 40px -22px ${c.palette.to}, inset 0 1px 0 rgb(255 255 255 / 0.22)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 7px)",
                  }}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[19px] leading-[1.15] font-semibold tracking-[-0.02em]">{c.name}</p>
                    <p className="mt-1 truncate text-[13px] leading-none opacity-[0.72]">{c.sub}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-baseline justify-end">
                      <WaitDuration
                        minutes={c.wait}
                        numberClassName="text-[36px] leading-none font-semibold tracking-[-0.045em]"
                        unitClassName="text-[13px] font-medium opacity-[0.72]"
                      />
                    </p>
                    <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] leading-none font-medium opacity-[0.85]">
                      <span className={cn("size-1.5 rounded-full", TONE_DOT[c.tone])} />
                      {copy.tone[c.tone]}
                    </p>
                  </div>
                </div>
                {front && (
                  <p className="absolute inset-x-[18px] bottom-[18px] text-[12px] leading-none font-medium opacity-[0.72]">
                    {copy.signInSample}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="rise mt-10 flex flex-col items-center text-center max-lg:mt-7" style={{ "--i": 4 } as CSSProperties}>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
            {copy.signInHeadline}
          </h1>
          <p className="mx-auto mt-3 max-w-[30ch] text-[15px] leading-relaxed text-muted">{copy.signInBody}</p>

          <motion.button
            type="button"
            onClick={() => void signIn()}
            disabled={busy}
            aria-busy={busy}
            whileTap={reduce || busy ? undefined : { scale: 0.97 }}
            transition={SPRING.snap}
            className="relative mt-6 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-surface px-6 text-[16px] font-semibold text-foreground disabled:opacity-70 max-lg:hidden"
          >
            <HapticPad />
            <GoogleMark />
            {copy.signInWithGoogle}
          </motion.button>

          <Link href="/privacy" className="mt-4 inline-block text-[13px] font-medium text-muted">
            {copy.privacyPolicy}
          </Link>

          {error && (
            <p className="mx-auto mt-4 max-w-[18rem] text-[13px] leading-snug text-danger" role="status">
              {error}
            </p>
          )}
        </div>
      </main>

      <SignInCard swipe={swipe} busy={busy} onTap={() => void signIn()} />
      <SignInHandoff busy={busy} reduce={!!reduce} />
    </div>
  );
}

function usePageSwipe({
  busy,
  failed,
  reduce,
  onSignIn,
}: {
  busy: boolean;
  failed: boolean;
  reduce: boolean;
  onSignIn: (tick: Haptic | null) => void;
}) {
  const y = useMotionValue(0);
  const veil = useMotionValue(1);
  const armedRef = useRef(false);
  const armedAt = useRef(0);
  const locked = useRef(false);
  const tracking = useRef(false);
  const suppressClick = useRef(false);
  const flight = useRef<ReturnType<typeof animate> | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const releaseTick = useRef(0);
  const [held, setHeld] = useState(false);

  useMotionValueEvent(y, "change", (value) => {
    const next = value < -0.5;
    setHeld((current) => (current === next ? current : next));
  });

  useEffect(
    () => () => {
      stopListen.current?.();
      window.clearTimeout(releaseTick.current);
    },
    [],
  );

  useEffect(() => {
    if (!failed) return;
    locked.current = false;
    armedRef.current = false;
    flight.current?.stop();
    flight.current = animate(y, 0, reduce ? REDUCED : SPRING.move);
    animate(veil, 1, reduce ? REDUCED : SPRING.move);
  }, [failed, reduce, veil, y]);

  function tickAfterDetent(kind: Haptic) {
    const wait = Math.max(0, 56 - (performance.now() - armedAt.current));
    window.clearTimeout(releaseTick.current);
    if (wait === 0) {
      haptic(kind);
      return;
    }
    releaseTick.current = window.setTimeout(() => haptic(kind), wait);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || busy || locked.current || tracking.current) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    tracking.current = true;
    suppressClick.current = false;
    flight.current?.stop();
    const start = y.get();
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    const pointerId = event.pointerId;
    let decided: "y" | "x" | null = null;
    const samples: { v: number; t: number }[] = [{ v: start, t: performance.now() }];

    const finishListen = () => {
      tracking.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (stopListen.current === finishListen) stopListen.current = null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - pointerX;
      const dy = e.clientY - pointerY;
      if (!decided) {
        if (Math.hypot(dx, dy) < SLOP) return;
        decided = Math.abs(dy) > Math.abs(dx) && dy < 0 ? "y" : "x";
        suppressClick.current = true;
      }
      if (decided !== "y") return;
      e.preventDefault();
      const next = follow(start + dy);
      const up = -next;
      if (up >= COMMIT && !armedRef.current) {
        armedRef.current = true;
        armedAt.current = performance.now();
        haptic("medium");
      } else if (up < COMMIT - RELEASE_GAP && armedRef.current) {
        armedRef.current = false;
      }
      y.set(next);
      const now = performance.now();
      samples.push({ v: next, t: now });
      const cutoff = now - 100;
      while (samples.length > 2 && (samples[0]?.t ?? 0) < cutoff) samples.shift();
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      finishListen();
      if (decided !== "y") return;

      const velocity = readVelocity(samples);
      const projected = y.get() + project(velocity);
      if (projected <= -COMMIT) {
        locked.current = true;
        tickAfterDetent("success");
        if (reduce) {
          animate(veil, 0, REDUCED);
        } else {
          flight.current = animate(y, -LIMIT, { ...SPRING.release, velocity });
          animate(veil, 0, { duration: 0.32, ease: [0.23, 1, 0.32, 1] });
        }
        onSignIn(null);
        return;
      }
      const pulledUp = y.get() < -24;
      armedRef.current = false;
      if (pulledUp) tickAfterDetent("soft");
      flight.current = animate(y, 0, reduce ? REDUCED : { ...SPRING.release, velocity });
    };

    stopListen.current = finishListen;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onClickCapture(event: ReactMouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { y, veil, held, onPointerDown, onClickCapture };
}

/**
 * A translucent card over the bottom half of the page. It is the swipe area:
 * it follows the finger, and the chevrons above the label show which way to go.
 */
function SignInCard({
  swipe,
  busy,
  onTap,
}: {
  swipe: ReturnType<typeof usePageSwipe>;
  busy: boolean;
  onTap: () => void;
}) {
  const { copy } = useLocale();
  return (
    <motion.div
      style={{ y: swipe.y, opacity: swipe.veil }}
      onPointerDown={swipe.onPointerDown}
      onClickCapture={swipe.onClickCapture}
      onContextMenu={(event) => event.preventDefault()}
      className={cn("sign-in-card", swipe.held && "is-held")}
    >
      <span aria-hidden className="sign-in-card-light" />
      <span aria-hidden className="sign-in-chevrons">
        <ChevronUp />
        <ChevronUp />
      </span>
      <button
        type="button"
        onClick={onTap}
        disabled={busy}
        aria-busy={busy}
        className="sign-in-card-action"
      >
        <HapticPad />
        <GoogleMark />
        <span className="text-[19px] leading-none font-semibold tracking-[-0.02em]">
          {copy.signInWithGoogle}
        </span>
      </button>
      <p aria-hidden className="mt-3 text-[14px] leading-none font-medium text-muted">
        {copy.signInSwipe}
      </p>
    </motion.div>
  );
}

/** Covers the page after sign-in starts, until Google takes over or the attempt fails. */
function SignInHandoff({ busy, reduce }: { busy: boolean; reduce: boolean }) {
  const { copy } = useLocale();
  return (
    <AnimatePresence>
      {busy ? (
        <motion.div
          key="handoff"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? REDUCED : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="sign-in-handoff"
        >
          <span aria-hidden className="sign-in-mark">
            <span className="sign-in-spinner" />
            <GoogleMark />
          </span>
          <p className="text-[16px] leading-none font-semibold tracking-[-0.02em]">{copy.signInRedirecting}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ChevronUp() {
  return (
    <svg viewBox="0 0 24 12" aria-hidden className="h-3 w-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-8 9 8" />
    </svg>
  );
}

/** Resist past the card's rest and its upper limit. 1:1 in between. */
function follow(next: number) {
  if (next > 0) return rubberband(next);
  if (next < -LIMIT) return -LIMIT - rubberband(-LIMIT - next);
  return next;
}

function rubberband(overshoot: number, dimension = 120, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function readVelocity(samples: { v: number; t: number }[]) {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || samples.length < 2) return 0;
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return ((last.v - first.v) / dt) * 1000;
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.04 12.26c0-.82-.07-1.6-.2-2.36H12v4.47h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.42-4.96 3.42-8.48Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.72-2.89c-1.07.72-2.44 1.15-4.22 1.15-3.24 0-5.99-2.19-6.97-5.13H1.2v2.98A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.22A7.2 7.2 0 0 1 4.65 12c0-.77.13-1.52.38-2.22V6.8H1.2A12 12 0 0 0 0 12c0 1.94.46 3.77 1.2 5.2l3.83-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.23 2.69 1.2 6.8l3.83 2.98c.98-2.94 3.73-5.01 6.97-5.01Z"
      />
    </svg>
  );
}
