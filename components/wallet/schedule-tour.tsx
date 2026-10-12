"use client";

import { useLocale } from "@/components/locale-provider";
import type { Copy } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { scheduleTourSignal } from "@/lib/schedule-tour-signal";
import { scheduleTourStore } from "@/lib/schedule-tour-store";
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

type StepId = "welcome" | "need-bridges" | "open-sheet" | "card" | "toggle" | "done";

/** No bridge saved yet: there is nothing to schedule, so this just points at Browse. */
const BRIDGES_PATH: readonly StepId[] = ["welcome", "need-bridges", "done"];
/** The real thing: open the sheet for real and walk it, then admire what came out of it. */
const CREATE_PATH: readonly StepId[] = ["welcome", "open-sheet", "card", "toggle", "done"];
/** A schedule already exists when the tab opens for the first time — just show it off. */
const SHOW_PATH: readonly StepId[] = ["welcome", "card", "toggle", "done"];

/** `open-sheet` leads into the real sheet, which this does not drive — the person fills it
 *  in themselves. `card` and `toggle` walk the schedule that comes out of it, so their target
 *  does not exist yet when the tour starts; trust the chain to produce it. */
const CHAIN_STEPS: ReadonlySet<StepId> = new Set(["card", "toggle"]);

/** This step has no Next — tapping the spotlighted button (not the tour) moves it forward. */
const INTERACTIVE_STEPS: ReadonlySet<StepId> = new Set(["open-sheet"]);

/** Steps with no entry here have no spotlight (the welcome and closing cards). The two
 *  selectors on `open-sheet` cover both layouts: the header "+" once a schedule exists
 *  already, or the empty state's own button before the first one is saved. */
const STEP_TARGETS: Partial<Record<StepId, readonly string[]>> = {
  "need-bridges": ['[data-tour="schedule-browse"]'],
  "open-sheet": ['[data-tour="schedule-add"]', '[data-tour="schedule-add-first"]'],
  card: ['[data-tour="first-schedule"]'],
  toggle: ['[data-tour="schedule-toggle"]'],
};

type SheetPhase = "bridges" | "time" | "days";

/** Which part of the real sheet is on screen right now, while `open-sheet` is waiting on it.
 *  Only one of these is ever rendered at a time — the sheet swaps its own step content. */
const SHEET_PHASE_TARGETS: Record<SheetPhase, readonly string[]> = {
  bridges: ['[data-tour="sheet-step-bridges"]'],
  time: ['[data-tour="sheet-step-time"]'],
  days: ['[data-tour="sheet-step-days"]'],
};

/** The sheet's own step tabs — a stable anchor near the top of every step, so the hint
 *  does not have to reckon with how tall each step's own content is. */
const SHEET_ANCHOR = ['[data-tour="sheet-steps"]'];

const SHEET_PHASE_COPY: Record<SheetPhase, (copy: Copy) => string> = {
  bridges: (c) => c.scheduleTourSheetBridges,
  time: (c) => c.scheduleTourSheetTime,
  days: (c) => c.scheduleTourSheetDays,
};

const STEP_COPY: Record<StepId, { title: (copy: Copy) => string; body: (copy: Copy) => string }> = {
  welcome: { title: (c) => c.scheduleTourWelcomeTitle, body: (c) => c.scheduleTourWelcomeBody },
  "need-bridges": { title: (c) => c.scheduleTourBridgesTitle, body: (c) => c.scheduleTourBridgesBody },
  "open-sheet": { title: (c) => c.scheduleTourAddTitle, body: (c) => c.scheduleTourAddBody },
  card: { title: (c) => c.scheduleTourCardTitle, body: (c) => c.scheduleTourCardBody },
  toggle: { title: (c) => c.scheduleTourToggleTitle, body: (c) => c.scheduleTourToggleBody },
  done: { title: (c) => c.scheduleTourDoneTitle, body: (c) => c.scheduleTourDoneBody },
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
 * The Alarmas walkthrough. Starts the first time this browser opens the schedules tab with
 * something to actually show, never while the sheet is already open. With no schedule yet,
 * it walks the real thing: the "+" button gets a spotlight with no Next — the sheet itself,
 * not the tour, is what moves it on — and once that sheet closes with a new schedule saved,
 * the tour resumes on the card it produced and the pause switch on it. Backing out of the
 * sheet without saving ends the tour instead of waiting forever. An account that already has
 * a schedule, or has no bridge to schedule yet, only ever gets the look-only steps.
 */
export function ScheduleTour({
  ready,
  active,
  editing,
  noBridges,
  scheduleCount,
}: {
  /** Hydrated, and the schedules list has finished its first load — so the path this picks
   *  (needs a bridge, walks a new one, or shows an existing one) matches reality. */
  ready: boolean;
  /** This is the current tab, with its real layout on screen (not `display: none`). */
  active: boolean;
  /** The add/edit sheet is open. */
  editing: boolean;
  noBridges: boolean;
  scheduleCount: number;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<readonly StepId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 180 });
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  const sheetWasOpen = useRef(false);
  const dialogId = useId();

  const seen = useSyncExternalStore(
    scheduleTourStore.subscribe,
    scheduleTourStore.getSnapshot,
    scheduleTourStore.getServerSnapshot,
  );

  const requestId = useSyncExternalStore(
    scheduleTourSignal.subscribe,
    scheduleTourSignal.getSnapshot,
    scheduleTourSignal.getServerSnapshot,
  );
  const seenRequest = useRef(requestId);

  const begin = useCallback(() => {
    const path = noBridges && scheduleCount === 0
      ? BRIDGES_PATH
      : scheduleCount === 0
        ? CREATE_PATH
        : SHOW_PATH;
    requestAnimationFrame(() => {
      const effective = path.filter((entry) => {
        if (CHAIN_STEPS.has(entry)) return true;
        const targets = STEP_TARGETS[entry];
        return !targets || resolveTarget(targets);
      });
      setSteps(effective);
      setStepIndex(0);
      setSpotlight(null);
      sheetWasOpen.current = false;
      setOpen(true);
    });
  }, [noBridges, scheduleCount]);

  // The first time the tab is actually on screen, with nothing in the way.
  useEffect(() => {
    if (!ready || !active || editing || open || autoStarted.current || seen) return;
    autoStarted.current = true;
    const id = window.setTimeout(begin, 500);
    return () => window.clearTimeout(id);
  }, [ready, active, editing, open, seen, begin]);

  // The dev-only "Replay the tour" button rings this regardless of `seen` or `active` —
  // it only lives on this tab, so by the time it is tapped the layout is already showing.
  useEffect(() => {
    if (requestId === seenRequest.current) return;
    seenRequest.current = requestId;
    if (editing) return;
    begin();
  }, [requestId, editing, begin]);

  const end = useCallback((finished: boolean) => {
    haptic(finished ? "success" : "soft");
    scheduleTourStore.markSeen();
    setOpen(false);
  }, []);

  const stepId = steps[stepIndex] as StepId | undefined;
  const interactive = stepId ? INTERACTIVE_STEPS.has(stepId) : false;

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

  // The real thing `open-sheet` is waiting for: the sheet opening, then closing again. Closing
  // with a new schedule on the books moves on to show it off; backing out without saving one
  // ends the tour instead of sitting there with nothing left to point at.
  useEffect(() => {
    if (!open || stepId !== "open-sheet") return;
    if (editing) {
      sheetWasOpen.current = true;
      return;
    }
    if (!sheetWasOpen.current) return;
    sheetWasOpen.current = false;
    if (scheduleCount > 0) {
      haptic("success");
      // The tour advances when the sheet closes with a saved schedule.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex((i) => i + 1);
    } else {
      end(true);
    }
  }, [open, stepId, editing, scheduleCount, end]);

  // Brings a step's target into view once, when that step becomes current. Paused while the
  // sheet covers the screen — there is nothing of ours to scroll to underneath it.
  useEffect(() => {
    if (!open || !stepId || editing) return;
    const targets = STEP_TARGETS[stepId];
    if (!targets) return;
    const id = window.setTimeout(() => {
      resolveTarget(targets)?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 200);
    return () => window.clearTimeout(id);
  }, [open, stepId, editing, reduce]);

  // Tracks the live target while a step is on screen. Paused while the sheet is open, since
  // the overlay itself is hidden then (see `visible` below) and there is nothing to track.
  useEffect(() => {
    if (!open || !stepId || editing) return;
    let frame = 0;
    const targets = STEP_TARGETS[stepId];
    const tick = () => {
      const el = resolveTarget(targets);
      if (el) {
        const r = el.getBoundingClientRect();
        const nextRect: Rect = {
          top: r.top - SPOTLIGHT_PAD,
          left: r.left - SPOTLIGHT_PAD,
          width: r.width + SPOTLIGHT_PAD * 2,
          height: r.height + SPOTLIGHT_PAD * 2,
        };
        setSpotlight((prev) => (sameRect(prev, nextRect) ? prev : nextRect));
      } else {
        setSpotlight((prev) => (prev === null ? prev : null));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, stepId, editing]);

  // While the real sheet is open on `open-sheet`, this is what walks the actual process:
  // whichever of its three steps is currently rendered picks the hint, and the sheet's own
  // step tabs are the anchor the hint floats under — the person's own taps on the sheet's
  // Next/Back move it along, not this component.
  const [sheetHint, setSheetHint] = useState<{ rect: Rect; phase: SheetPhase } | null>(null);
  useEffect(() => {
    if (!open || stepId !== "open-sheet" || !editing) {
      // Clears the hint when the sheet is not the step. The updater keeps a null as it is.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSheetHint((prev) => (prev === null ? prev : null));
      return;
    }
    let frame = 0;
    const tick = () => {
      const phase = (Object.keys(SHEET_PHASE_TARGETS) as SheetPhase[]).find((candidate) =>
        resolveTarget(SHEET_PHASE_TARGETS[candidate]),
      );
      const anchor = phase ? resolveTarget(SHEET_ANCHOR) : null;
      if (phase && anchor) {
        const r = anchor.getBoundingClientRect();
        const nextRect: Rect = { top: r.bottom + 10, left: r.left, width: r.width, height: 0 };
        setSheetHint((prev) =>
          prev && prev.phase === phase && sameRect(prev.rect, nextRect)
            ? prev
            : { rect: nextRect, phase },
        );
      } else {
        setSheetHint((prev) => (prev === null ? prev : null));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, stepId, editing]);

  // Measures the card itself, so its position accounts for how tall this step's copy is.
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!open || !node) return;
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
  }, [open, stepId]);

  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open) return;
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
  }, [open, spotlight, cardSize]);

  const visible = open && !editing;

  useEffect(() => {
    if (visible) cardRef.current?.focus();
  }, [visible]);

  // Escape closes the tour, not the (already-closed) sheet. While the sheet is open, its own
  // listener owns Escape, so this stays quiet to avoid fighting over the same key.
  useEffect(() => {
    if (!visible) return;
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
  }, [visible, interactive, next, back, end]);

  if (!stepId) return null;
  const stepCopy = STEP_COPY[stepId];
  const last = stepIndex === steps.length - 1;
  const previousInteractive = stepIndex > 0 && INTERACTIVE_STEPS.has(steps[stepIndex - 1]);
  const canBack = stepIndex > 0 && !previousInteractive && !interactive;
  const spring = reduce ? REDUCED : SPRING.move;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  return (
    <>
    <AnimatePresence>
      {sheetHint && (
        <motion.div
          key={sheetHint.phase}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={reduce ? REDUCED : SPRING.snap}
          className="glass fixed z-[80] rounded-2xl px-4 py-3 text-center text-[13px] leading-snug font-medium text-foreground shadow-lg"
          style={{
            top: sheetHint.rect.top,
            left: sheetHint.rect.left,
            width: sheetHint.rect.width,
            pointerEvents: "none",
          }}
        >
          {SHEET_PHASE_COPY[sheetHint.phase](copy)}
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {visible && (
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
    </>
  );
}
