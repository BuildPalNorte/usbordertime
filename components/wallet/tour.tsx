"use client";

import { useLocale } from "@/components/locale-provider";
import type { Copy } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { tourSignal } from "@/lib/tour-signal";
import { tourStore } from "@/lib/tour-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { HapticPad } from "./haptic-pad";
import { REDUCED, SPRING } from "./motion";
import type { Tab } from "./tab-bar";

type StepId =
  | "welcome"
  | "find-bridge"
  | "pick-bridge"
  | "open-card"
  | "detail-camera"
  | "detail-lanes"
  | "detail-usual"
  | "close-card"
  | "schedules"
  | "ask"
  | "account"
  | "done";

/** Walked in this order. The tab bar steps drop on a desktop, and the "+" step drops
 *  wherever Explorar already sits beside the wallet. The two "add a bridge" steps drop
 *  outright for an account that already has one. `detail-camera` is decided once the
 *  card is actually open — Puente Viejo carries a live camera, but whatever card an
 *  existing wallet opens here might not. */
const STEP_ORDER: readonly StepId[] = [
  "welcome",
  "find-bridge",
  "pick-bridge",
  "open-card",
  "detail-camera",
  "detail-lanes",
  "detail-usual",
  "close-card",
  "schedules",
  "ask",
  "account",
  "done",
];

/** These walk the card itself. Their target only exists once an earlier step in this
 *  same chain has actually happened, so they are never dropped for being invisible
 *  when the tour starts — the chain is trusted to produce them in order. */
const CHAIN_STEPS: ReadonlySet<StepId> = new Set([
  "open-card",
  "detail-camera",
  "detail-lanes",
  "detail-usual",
  "close-card",
]);

/** A step in here waits for the real thing to happen — it has no Next button, because
 *  tapping the spotlighted control (not the tour) is what moves it forward. */
const INTERACTIVE_STEPS: ReadonlySet<StepId> = new Set([
  "find-bridge",
  "pick-bridge",
  "open-card",
  "close-card",
]);

/** Steps with no entry here are always kept (the welcome and closing cards) and have no
 *  spotlight. First selector that resolves to a visible element wins, so one target can
 *  cover both layouts. */
const STEP_TARGETS: Partial<Record<StepId, readonly string[]>> = {
  "find-bridge": ['[data-tour="header-add"]'],
  "pick-bridge": ['[data-tour="browse-pick-toggle"]'],
  "open-card": ['[data-tour="first-card"]'],
  "detail-camera": ['[data-tour="detail-camera"]'],
  "detail-lanes": ['[data-tour="detail-lanes"]'],
  "detail-usual": ['[data-tour="detail-usual"]'],
  "close-card": ['[data-tour="header-done"]'],
  schedules: ['[data-tour="tab-schedules"]'],
  ask: ['[data-tour="tab-ask"]'],
  account: ['[data-tour="account-button"]'],
};

const STEP_COPY: Record<StepId, { title: (copy: Copy) => string; body: (copy: Copy) => string }> = {
  welcome: { title: (c) => c.tourWelcomeTitle, body: (c) => c.tourWelcomeBody },
  "find-bridge": { title: (c) => c.tourFindTitle, body: (c) => c.tourFindBody },
  "pick-bridge": { title: (c) => c.tourPickTitle, body: (c) => c.tourPickBody },
  "open-card": { title: (c) => c.tourOpenTitle, body: (c) => c.tourOpenBody },
  "detail-camera": { title: (c) => c.tourCameraTitle, body: (c) => c.tourCameraBody },
  "detail-lanes": { title: (c) => c.tourLanesTitle, body: (c) => c.tourLanesBody },
  "detail-usual": { title: (c) => c.tourUsualTitle, body: (c) => c.tourUsualBody },
  "close-card": { title: (c) => c.tourCloseTitle, body: (c) => c.tourCloseBody },
  schedules: { title: (c) => c.tourSchedulesTitle, body: (c) => c.tourSchedulesBody },
  ask: { title: (c) => c.tourAskTitle, body: (c) => c.tourAskBody },
  account: { title: (c) => c.tourAccountTitle, body: (c) => c.tourAccountBody },
  done: { title: (c) => c.tourDoneTitle, body: (c) => c.tourDoneBody },
};

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PAD = 8;
const CARD_MARGIN = 16;
const CARD_WIDTH = 328;
const DIM = "rgba(6,8,16,0.64)";
const RING_SHADOW =
  "0 0 0 1.5px var(--accent), 0 0 0 7px color-mix(in srgb, var(--accent) 20%, transparent), 0 0 36px 4px color-mix(in srgb, var(--accent) 40%, transparent)";

function resolveTarget(selectors: readonly string[] | undefined): HTMLElement | null {
  if (!selectors) return null;
  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return node;
    }
  }
  return null;
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/**
 * The welcome tour. For an account with no bridges yet, it walks through adding one for
 * real — the "+" button, a crossing's own add button — then opens that card and shows
 * what's inside it. Those steps have no Next: the spotlighted control stays live (a frame
 * of four dim panels around it, not the box-shadow cutout the look-only steps use), and
 * the tour watches the real state change to move on. An account that already has a
 * bridge skips straight to opening its first card. The rest stays look-only, modal, and
 * dismissed with Skip or Escape.
 */
export function Tour({
  hydrated,
  canAutoStart,
  tab,
  expandedId,
  savedCount,
  onGoHome,
}: {
  hydrated: boolean;
  /** A plain wallet view: tab is Puentes, no card open, no notification bridges on screen. */
  canAutoStart: boolean;
  tab: Tab;
  expandedId: string | null;
  savedCount: number;
  onGoHome: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<readonly StepId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 180 });
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  const dialogId = useId();

  const requestId = useSyncExternalStore(
    tourSignal.subscribe,
    tourSignal.getSnapshot,
    tourSignal.getServerSnapshot,
  );
  const seenRequest = useRef(requestId);

  const begin = useCallback(() => {
    haptic("light");
    onGoHome();
    // Two frames: one for the route to settle, one for the layout it changes to paint,
    // so the first measurement already matches the clean wallet view.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const already = savedCount > 0;
        const effective = STEP_ORDER.filter((id) => {
          if (id === "find-bridge") return !already && Boolean(resolveTarget(STEP_TARGETS[id]));
          // On a phone this only becomes visible after `find-bridge` switches tabs — so its
          // inclusion rests on needing the flow at all, not on being visible right now.
          if (id === "pick-bridge") return !already;
          // The card, and everything inside it, does not exist yet at this point in any
          // run — trust the chain to produce each target as the step before it completes.
          if (CHAIN_STEPS.has(id)) return true;
          const targets = STEP_TARGETS[id];
          return !targets || resolveTarget(targets);
        });
        setSteps(effective);
        setStepIndex(0);
        setSpotlight(null);
        setActive(true);
      });
    });
  }, [onGoHome, savedCount]);

  // A new sign-in, on a plain wallet view, that has never seen the tour.
  useEffect(() => {
    if (!hydrated || !canAutoStart || active || autoStarted.current) return;
    if (tourStore.getSnapshot()) return;
    autoStarted.current = true;
    const id = window.setTimeout(begin, 900);
    return () => window.clearTimeout(id);
  }, [hydrated, canAutoStart, active, begin]);

  // The account menu's "Take the tour", or the dev picker, rings this regardless of canAutoStart.
  useEffect(() => {
    if (requestId === seenRequest.current) return;
    seenRequest.current = requestId;
    begin();
  }, [requestId, begin]);

  const stepId = steps[stepIndex] as StepId | undefined;
  const interactive = stepId ? INTERACTIVE_STEPS.has(stepId) : false;

  const end = useCallback((finished: boolean) => {
    haptic(finished ? "success" : "soft");
    tourStore.markSeen();
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      end(true);
      return;
    }
    haptic("selection");
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps.length, end]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    haptic("selection");
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  // The real thing an interactive step is waiting for: the tab switching to Explorar,
  // a bridge landing in the wallet, a card opening, or that same card closing again.
  useEffect(() => {
    if (!active || !stepId) return;
    if (stepId === "find-bridge" && tab === "browse") {
      haptic("selection");
      setStepIndex((i) => i + 1);
    } else if (stepId === "pick-bridge" && savedCount > 0) {
      haptic("success");
      onGoHome();
      setStepIndex((i) => i + 1);
    } else if (stepId === "open-card" && expandedId !== null) {
      haptic("selection");
      // Two frames for the detail panel to actually paint, so checking for its camera
      // (present on Puente Viejo and Puente Nuevo, not on every bridge) is not a beat early.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const hasCamera = Boolean(resolveTarget(STEP_TARGETS["detail-camera"]));
          if (!hasCamera) setSteps((current) => current.filter((id) => id !== "detail-camera"));
          setStepIndex((i) => i + 1);
        });
      });
    } else if (stepId === "close-card" && expandedId === null) {
      haptic("selection");
      setStepIndex((i) => i + 1);
    }
  }, [active, stepId, tab, expandedId, savedCount, onGoHome]);

  // Brings a step's target into view once, when that step becomes current — a row
  // deep in a scrolled list, or one that just appeared after a tab switch, should not
  // sit under the tab bar or the tour card itself. A short wait lets the tab's own
  // slide-in and the list's stagger settle first, so this reads the real position.
  useEffect(() => {
    if (!active || !stepId) return;
    const targets = STEP_TARGETS[stepId];
    if (!targets) return;
    const id = window.setTimeout(() => {
      resolveTarget(targets)?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [active, stepId, reduce]);

  // Tracks the live target while a step is on screen — the stack can be mid-spring,
  // the window can resize — so the cutout never lags behind what it is pointing at.
  useEffect(() => {
    if (!active || !stepId) return;
    let frame = 0;
    const targets = STEP_TARGETS[stepId];
    const tick = () => {
      const el = resolveTarget(targets);
      if (el) {
        const r = el.getBoundingClientRect();
        const next: Rect = {
          top: r.top - SPOTLIGHT_PAD,
          left: r.left - SPOTLIGHT_PAD,
          width: r.width + SPOTLIGHT_PAD * 2,
          height: r.height + SPOTLIGHT_PAD * 2,
        };
        setSpotlight((prev) => (sameRect(prev, next) ? prev : next));
      } else {
        setSpotlight((prev) => (prev === null ? prev : null));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, stepId]);

  // Measures the card itself, so its position accounts for how tall this step's copy is.
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!active || !node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setCardSize((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, stepId]);

  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!spotlight) {
        setCardPos({
          top: Math.round((vh - cardSize.height) / 2),
          left: Math.round((vw - cardSize.width) / 2),
        });
        return;
      }
      const roomBelow = vh - spotlight.top - spotlight.height;
      const below = roomBelow >= cardSize.height + CARD_MARGIN * 2 || roomBelow >= spotlight.top;
      const top = below
        ? spotlight.top + spotlight.height + CARD_MARGIN
        : spotlight.top - CARD_MARGIN - cardSize.height;
      const left = spotlight.left + spotlight.width / 2 - cardSize.width / 2;
      setCardPos({
        top: Math.min(Math.max(top, CARD_MARGIN), vh - cardSize.height - CARD_MARGIN),
        left: Math.min(Math.max(left, CARD_MARGIN), vw - cardSize.width - CARD_MARGIN),
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [active, spotlight, cardSize]);

  // Keyboard users land in the card instead of whatever was focused underneath,
  // which the overlay has made inert anyway.
  useEffect(() => {
    if (active) cardRef.current?.focus();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        end(false);
      } else if (!interactive && (event.key === "ArrowRight" || event.key === "Enter")) {
        event.preventDefault();
        next();
      } else if (!interactive && event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, interactive, next, back, end]);

  if (!stepId) return null;
  const stepCopy = STEP_COPY[stepId];
  const last = stepIndex === steps.length - 1;
  const previousInteractive = stepIndex > 0 && INTERACTIVE_STEPS.has(steps[stepIndex - 1]);
  const canBack = stepIndex > 0 && !previousInteractive && !interactive;
  const spring = reduce ? REDUCED : SPRING.move;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[70]"
          role="presentation"
          style={{ pointerEvents: interactive ? "none" : "auto" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {spotlight ? (
            interactive ? (
              <>
                <div
                  aria-hidden
                  className="absolute"
                  style={{ top: 0, left: 0, width: vw, height: Math.max(0, spotlight.top), background: DIM, pointerEvents: "auto" }}
                />
                <div
                  aria-hidden
                  className="absolute"
                  style={{
                    top: spotlight.top + spotlight.height,
                    left: 0,
                    width: vw,
                    height: Math.max(0, vh - spotlight.top - spotlight.height),
                    background: DIM,
                    pointerEvents: "auto",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute"
                  style={{
                    top: spotlight.top,
                    left: 0,
                    width: Math.max(0, spotlight.left),
                    height: spotlight.height,
                    background: DIM,
                    pointerEvents: "auto",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute"
                  style={{
                    top: spotlight.top,
                    left: spotlight.left + spotlight.width,
                    width: Math.max(0, vw - spotlight.left - spotlight.width),
                    height: spotlight.height,
                    background: DIM,
                    pointerEvents: "auto",
                  }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute rounded-[22px]"
                  initial={false}
                  animate={{
                    top: spotlight.top,
                    left: spotlight.left,
                    width: spotlight.width,
                    height: spotlight.height,
                  }}
                  transition={spring}
                  style={{ boxShadow: RING_SHADOW }}
                />
              </>
            ) : (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute rounded-[22px]"
                initial={false}
                animate={{
                  top: spotlight.top,
                  left: spotlight.left,
                  width: spotlight.width,
                  height: spotlight.height,
                }}
                transition={spring}
                style={{ boxShadow: `0 0 0 9999px ${DIM}, ${RING_SHADOW}` }}
              />
            )
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: DIM, pointerEvents: interactive ? "auto" : undefined }}
            />
          )}

          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            aria-describedby={`${dialogId}-body`}
            tabIndex={-1}
            initial={
              reduce
                ? { opacity: 0, top: cardPos.top, left: cardPos.left }
                : { opacity: 0, scale: 0.97, top: cardPos.top, left: cardPos.left }
            }
            animate={{ top: cardPos.top, left: cardPos.left, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={spring}
            className="glass absolute rounded-3xl p-5"
            style={{ width: CARD_WIDTH, maxWidth: "calc(100vw - 2rem)", pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5" role="presentation">
                {steps.map((id, index) => (
                  <span
                    key={id}
                    aria-hidden
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color] duration-300",
                      index === stepIndex ? "w-4 bg-accent" : "w-1.5 bg-foreground/15",
                    )}
                  />
                ))}
              </div>
              {!last && (
                <button
                  type="button"
                  onClick={() => end(false)}
                  className="relative shrink-0 text-[13px] font-medium text-muted active:opacity-60"
                >
                  <HapticPad />
                  {copy.tourSkip}
                </button>
              )}
            </div>

            <h2 id={`${dialogId}-title`} className="mt-3 text-[20px] leading-tight font-semibold tracking-[-0.02em]">
              {stepCopy.title(copy)}
            </h2>
            <p id={`${dialogId}-body`} className="mt-1.5 text-[14px] leading-relaxed text-muted">
              {stepCopy.body(copy)}
            </p>

            {!interactive && (
              <div className="mt-5 flex items-center gap-2">
                {canBack && (
                  <motion.button
                    type="button"
                    onClick={back}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    transition={SPRING.snap}
                    className="relative h-11 rounded-full bg-surface px-5 text-[15px] font-medium text-foreground"
                  >
                    <HapticPad />
                    {copy.tourBack}
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  onClick={next}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={SPRING.snap}
                  className="relative h-11 flex-1 rounded-full bg-accent px-5 text-[15px] font-semibold text-accent-ink"
                >
                  <HapticPad />
                  {last ? copy.tourDone : copy.tourNext}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
