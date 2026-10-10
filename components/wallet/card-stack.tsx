"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import type { Copy } from "@/lib/i18n";
import { waitLabel } from "@/lib/i18n";
import { portName, project, readLane, type Mode } from "@/lib/ports";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CardDetail } from "./card-detail";
import { CardFace } from "./card-face";
import { CARD_H, PEEK, REDUCED, SPRING, stackHeight } from "./motion";

export type StackItem = { port: PortWaitTime; mode: Mode };

type Props = {
  items: StackItem[];
  expandedId: string | null;
  cityPinned: boolean;
  onExpand: (portNumber: string) => void;
  onCollapse: () => void;
  onMode: (portNumber: string, mode: Mode) => void;
  onPinCity: () => void;
  onRemove: (portNumber: string) => void;
  onReorder: (portNumber: string, toIndex: number) => void;
  checking?: boolean;
};

type ReorderDrag = { id: string; from: number; over: number };

/** How far a drag must be projected to dismiss the open card. */
const DISMISS_DISTANCE = 120;
/** Still hold before a card lifts. Long enough that a tap still opens it. */
const HOLD_MS = 480;
/** Movement that cancels the hold, so a scroll never picks a card up. */
const SLOP = 10;
/** Past this release speed, the settle may bounce. A slow place does not. */
const FLING = 120;

export function CardStack({
  items,
  expandedId,
  cityPinned,
  onExpand,
  onCollapse,
  onMode,
  onPinCity,
  onRemove,
  onReorder,
  checking = false,
}: Props) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const height = stackHeight(items.length);
  const open = items.find((item) => item.port.portNumber === expandedId) ?? null;
  const anyOpen = open !== null;
  const canReorder = !anyOpen && items.length > 1;

  // Cards fan in once on first paint; after that, changes are immediate springs.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 900);
    return () => window.clearTimeout(id);
  }, []);

  const [drag, setDrag] = useState<ReorderDrag | null>(null);
  const [live, setLive] = useState("");

  // The open card follows the finger 1:1; the detail below reacts to the same value.
  const dragY = useMotionValue(0);
  const detailOpacity = useTransform(dragY, [0, 240], [1, 0.2]);
  const detailY = useTransform(dragY, [0, 240], [0, 48]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const projected = info.offset.y + project(info.velocity.y);
    if (projected > DISMISS_DISTANCE) onCollapse();
  }

  function commit(portNumber: string, to: number) {
    setDrag((current) => (current?.id === portNumber ? null : current));
    const from = items.findIndex((item) => item.port.portNumber === portNumber);
    if (from < 0 || from === to) return;
    onReorder(portNumber, to);
    const item = items[from];
    if (!item) return;
    const message = copy.movedTo(portName(item.port).title, to + 1, items.length);
    setLive((previous) => (previous === message ? `${message}\u00A0` : message));
  }

  const spring = reduce ? REDUCED : SPRING.move;

  return (
    <div className="relative" style={{ minHeight: height }}>
      <div className="sr-only" aria-live="polite">
        {live}
      </div>
      <AnimatePresence initial>
        {items.map((item, index) => {
          const id = item.port.portNumber;
          const isOpen = id === expandedId;
          const dimmed = anyOpen && !isOpen;
          const slot = visualSlot(index, drag);
          const targetY = isOpen ? 0 : dimmed ? CARD_H + 72 : slot * PEEK;

          return (
            <StackCard
              key={id}
              item={item}
              index={index}
              count={items.length}
              targetY={targetY}
              slot={slot}
              isOpen={isOpen}
              dimmed={dimmed}
              lifted={drag?.id === id}
              canReorder={canReorder}
              intro={intro}
              appearFrom={height + 120}
              reduce={Boolean(reduce)}
              spring={spring}
              copy={copy}
              dragY={dragY}
              onExpand={() => onExpand(id)}
              onLift={() => setDrag({ id, from: index, over: index })}
              onOver={(over) =>
                setDrag((current) =>
                  current && current.id === id && current.over !== over ? { ...current, over } : current,
                )
              }
              onCommit={(to) => commit(id, to)}
              onDragEnd={handleDragEnd}
              checking={checking}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="detail"
            style={{ opacity: detailOpacity, y: detailY, paddingTop: CARD_H + 20 }}
          >
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, transition: { duration: 0.14 } }}
              transition={{ ...spring, delay: reduce ? 0 : 0.08 }}
            >
              <CardDetail
                port={open.port}
                mode={open.mode}
                cityPinned={cityPinned}
                onMode={(mode) => onMode(open.port.portNumber, mode)}
                onPinCity={onPinCity}
                onRemove={() => onRemove(open.port.portNumber)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StackCard({
  item,
  index,
  count,
  targetY,
  slot,
  isOpen,
  dimmed,
  lifted,
  canReorder,
  intro,
  appearFrom,
  reduce,
  spring,
  copy,
  dragY,
  onExpand,
  onLift,
  onOver,
  onCommit,
  onDragEnd,
  checking,
}: {
  item: StackItem;
  index: number;
  count: number;
  targetY: number;
  slot: number;
  isOpen: boolean;
  dimmed: boolean;
  lifted: boolean;
  canReorder: boolean;
  intro: boolean;
  appearFrom: number;
  reduce: boolean;
  spring: typeof SPRING.move | typeof REDUCED;
  copy: Copy;
  dragY: ReturnType<typeof useMotionValue<number>>;
  onExpand: () => void;
  onLift: () => void;
  onOver: (over: number) => void;
  onCommit: (to: number) => void;
  onDragEnd: (event: unknown, info: PanInfo) => void;
  checking: boolean;
}) {
  const present = useIsPresent();
  const y = useMotionValue(reduce ? targetY : appearFrom);
  const enterDelay = useRef(intro && !reduce ? index * 0.06 : 0);
  const pendingGesture = useRef<{ velocity: number } | null>(null);
  const flight = useRef<{ stop: () => void } | null>(null);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [raised, setRaised] = useState(false);
  const phase = useRef<"idle" | "pending" | "dragging">("idle");
  const stopListening = useRef<(() => void) | null>(null);
  const countRef = useRef(count);
  const onLiftRef = useRef(onLift);
  const onOverRef = useRef(onOver);
  const onCommitRef = useRef(onCommit);
  const onExpandRef = useRef(onExpand);
  useEffect(() => {
    countRef.current = count;
    onLiftRef.current = onLift;
    onOverRef.current = onOver;
    onCommitRef.current = onCommit;
    onExpandRef.current = onExpand;
  });

  useEffect(() => {
    if (!present) {
      if (reduce) return;
      const controls = animate(y, y.get() + 160, SPRING.move);
      return () => controls.stop();
    }
    if (dragging) return;
    // Leave the handoff in place across Strict Mode's extra effect pass.
    const gesture = pendingGesture.current;
    if (gesture) {
      const token = gesture;
      window.setTimeout(() => {
        if (pendingGesture.current === token) pendingGesture.current = null;
      }, 0);
    }
    const flung = gesture !== null && Math.abs(gesture.velocity) > FLING;
    // The stagger is only for the fan-in. Clear it after this pass so a later
    // reorder is not waiting on the entrance delay. Strict Mode re-runs the
    // effect before the timeout, so the second pass still sees the delay.
    const delay = enterDelay.current;
    if (delay > 0) {
      window.setTimeout(() => {
        enterDelay.current = 0;
      }, 0);
    }
    const controls = animate(
      y,
      targetY,
      reduce
        ? REDUCED
        : {
            ...(flung ? SPRING.release : SPRING.move),
            delay,
            ...(gesture ? { velocity: gesture.velocity } : {}),
          },
    );
    flight.current = controls;
    // A drop keeps the card raised above its neighbors until it actually arrives,
    // then z-index settles in the same instant the motion stops — no separate
    // timer to fall out of sync with the spring's real duration.
    if (gesture) {
      void controls.finished.then(() => {
        if (flight.current === controls) setRaised(false);
      });
    }
    return () => {
      controls.stop();
      if (flight.current === controls) flight.current = null;
    };
  }, [present, dragging, targetY, y, reduce]);

  useEffect(() => {
    return () => {
      stopListening.current?.();
    };
  }, []);

  function raise() {
    setRaised(true);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canReorder || event.button !== 0) return;
    stopListening.current?.();
    setPressed(true);
    phase.current = "pending";
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const pointerType = event.pointerType;
    let originY = y.get();
    let lastOver = index;
    let unlockScroll: (() => void) | null = null;
    const samples: { y: number; t: number }[] = [];

    const hold = window.setTimeout(() => {
      if (phase.current !== "pending") return;
      phase.current = "dragging";
      // Stop the slot spring now. Waiting for the effect would let it fight the finger.
      flight.current?.stop();
      enterDelay.current = 0;
      originY = y.get();
      const root = document.documentElement;
      const previousTouch = root.style.touchAction;
      root.style.touchAction = "none";
      unlockScroll = () => {
        root.style.touchAction = previousTouch;
      };
      setPressed(false);
      setDragging(true);
      raise();
      onLiftRef.current();
      try {
        navigator.vibrate?.(8);
      } catch {
        // Some browsers throw instead of silently ignoring a blocked/denied call.
      }
    }, HOLD_MS);

    function beginManualScroll(startEvent: PointerEvent) {
      const scroller = document.scrollingElement ?? document.documentElement;
      let lastY = startEvent.clientY;
      function onScrollMove(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        scroller.scrollTop += lastY - event.clientY;
        lastY = event.clientY;
      }
      function stop(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onScrollMove);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      }
      window.addEventListener("pointermove", onScrollMove);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    }

    function finishListen() {
      window.clearTimeout(hold);
      unlockScroll?.();
      unlockScroll = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (stopListening.current === finishListen) stopListening.current = null;
    }

    function onMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      if (phase.current === "pending") {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (dx * dx + dy * dy > SLOP * SLOP) {
          phase.current = "idle";
          setPressed(false);
          finishListen();
          // touch-action is fixed for this gesture at the touchstart that began
          // it, so flipping the CSS value later has no effect on an in-flight
          // touch. We hold touch-action at "none" while a card could be picked
          // up (see render), which means the browser will not pan the page on
          // its own here — forward the rest of this touch to the scroller by
          // hand so an early move still scrolls normally.
          if (pointerType === "touch") beginManualScroll(event);
        }
        return;
      }
      if (phase.current !== "dragging") return;
      event.preventDefault();
      const raw = originY + (event.clientY - startY);
      const max = Math.max(0, (countRef.current - 1) * PEEK);
      const next = resist(raw, 0, max);
      y.set(next);
      const now = performance.now();
      samples.push({ y: next, t: now });
      if (samples.length > 5) samples.shift();
      const over = clamp(Math.round(next / PEEK), 0, countRef.current - 1);
      if (over !== lastOver) {
        lastOver = over;
        onOverRef.current(over);
      }
    }

    function onUp(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      const cancelled = event.type === "pointercancel";
      const wasPending = phase.current === "pending";
      const wasDragging = phase.current === "dragging";
      phase.current = "idle";
      setPressed(false);
      finishListen();
      if (wasPending) {
        if (!cancelled) onExpandRef.current();
        return;
      }
      if (!wasDragging) return;
      if (cancelled) {
        pendingGesture.current = { velocity: 0 };
        setDragging(false);
        onCommitRef.current(index);
        return;
      }
      const velocity = readVelocity(samples);
      const projected = y.get() + projectRelease(velocity);
      const to = clamp(Math.round(projected / PEEK), 0, countRef.current - 1);
      pendingGesture.current = { velocity };
      setDragging(false);
      onCommitRef.current(to);
    }

    stopListening.current = finishListen;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (canReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const to = clamp(index + (event.key === "ArrowUp" ? -1 : 1), 0, count - 1);
      if (to !== index) onCommit(to);
      return;
    }
    if (!isOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onExpand();
    }
  }

  const label = ariaLabel(item, copy);
  const zIndex = raised || lifted ? count + 8 : isOpen ? count + 1 : slot + 1;

  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ y, zIndex, pointerEvents: dimmed ? "none" : "auto" }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: dimmed ? 0 : dragging ? 0.82 : 1, scale: dimmed ? 0.95 : 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, transition: SPRING.move }}
      transition={{ ...spring, delay: reduce ? 0 : intro ? index * 0.06 : 0 }}
    >
      <motion.div
        role="button"
        tabIndex={isOpen ? -1 : 0}
        aria-label={canReorder ? `${label}. ${copy.reorderHint}` : label}
        aria-expanded={isOpen}
        aria-keyshortcuts={canReorder ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
        onPointerDown={onPointerDown}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={onKeyDown}
        transition={SPRING.snap}
        animate={{
          scale: reduce ? 1 : dragging ? 1.04 : pressed ? 0.985 : 1,
          rotate: reduce || !dragging ? 0 : -1.25,
        }}
        style={{
          y: isOpen ? dragY : 0,
          cursor: dragging ? "grabbing" : isOpen || canReorder ? "grab" : "pointer",
          // touch-action is locked in for a touch gesture at its start and can't
          // change mid-gesture, so this must already be "none" before the hold
          // completes — otherwise the browser pans the page instead of handing
          // the drag to us. Cancelled holds fall back to a manual scroll (see
          // onMove) so the page still scrolls normally on an early move.
          touchAction: canReorder ? "none" : "pan-y",
          transformOrigin: "50% 36px",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
        }}
        drag={isOpen && !reduce ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.6 }}
        dragSnapToOrigin
        dragTransition={{ bounceStiffness: 420, bounceDamping: 34 }}
        onDragEnd={onDragEnd}
      >
        <CardFace port={item.port} mode={item.mode} checking={checking} />
      </motion.div>
    </motion.div>
  );
}

function ariaLabel(item: StackItem, copy: Copy): string {
  const reading = readLane(item.port, item.mode);
  const wait = reading.minutes !== null ? copy.minuteWait(reading.minutes) : waitLabel(reading, copy);
  return `${portName(item.port).title}, ${wait}`;
}

/** Where a resting card sits while another card is held over `drag.over`. */
function visualSlot(index: number, drag: ReorderDrag | null): number {
  if (!drag || index === drag.from) return index;
  const { from, over } = drag;
  if (from < over && index > from && index <= over) return index - 1;
  if (from > over && index >= over && index < from) return index + 1;
  return index;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rubberband(overshoot: number, dimension = 140, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function resist(value: number, min: number, max: number) {
  if (value < min) return min - rubberband(min - value);
  if (value > max) return max + rubberband(value - max);
  return value;
}

/** Apple's scroll-projection, snappier rate so a flick moves a couple of cards, not the whole stack. */
function projectRelease(velocity: number, decelerationRate = 0.99) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

function readVelocity(samples: { y: number; t: number }[]) {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return ((last.y - first.y) / dt) * 1000;
}
