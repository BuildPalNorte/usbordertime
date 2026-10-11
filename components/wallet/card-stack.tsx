"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import type { Copy } from "@/lib/i18n";
import { waitLabel } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { portName, project, readLane, type Mode } from "@/lib/ports";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CardDetail } from "./card-detail";
import { CardFace } from "./card-face";
import { CARD_H, PEEK, REDUCED, ROW_GAP, SPRING, stackHeight } from "./motion";

export type StackItem = { port: PortWaitTime; mode: Mode };

type Props = {
  items: StackItem[];
  expandedId: string | null;
  cityPinned: boolean;
  onExpand: (portNumber: string) => void;
  onCollapse: () => void;
  onMode: (portNumber: string, mode: Mode) => void;
  onPinCity: () => void;
  onShare: (port: PortWaitTime, mode: Mode) => void;
  onRemove: (portNumber: string) => void;
  onReorder: (portNumber: string, toIndex: number) => void;
  checking?: boolean;
  /** Skip the fan-in. Used when the stack returns after the notification row. */
  quiet?: boolean;
  /** Cards that were on screen one above the other, top first. They slide from there into the stack. */
  returnFrom?: string[] | null;
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
/** How far a horizontal swipe must be projected to send the front card back. */
const SWIPE_DISTANCE = 88;

export function CardStack({
  items,
  expandedId,
  cityPinned,
  onExpand,
  onCollapse,
  onMode,
  onPinCity,
  onShare,
  onRemove,
  onReorder,
  checking = false,
  quiet = false,
  returnFrom = null,
}: Props) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const height = stackHeight(items.length);
  const open = items.find((item) => item.port.portNumber === expandedId) ?? null;
  const anyOpen = open !== null;
  const canReorder = !anyOpen && items.length > 1;

  // Cards fan in once on first paint; after that, changes are immediate springs.
  const [intro, setIntro] = useState(!quiet);
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 900);
    return () => window.clearTimeout(id);
  }, []);

  const [drag, setDrag] = useState<ReorderDrag | null>(null);
  const [live, setLive] = useState("");

  // The open card tracks the finger. Detail follows the same drag until a dismiss
  // freezes it, so letting go does not yank the panel back to the open rest point.
  const dragY = useMotionValue(0);
  const followDetail = useRef(true);
  const detailShift = useMotionValue(0);
  const detailFade = useMotionValue(1);
  useMotionValueEvent(dragY, "change", (latest) => {
    if (!followDetail.current) return;
    const t = clamp(latest / 240, 0, 1);
    detailShift.set(48 * t);
    detailFade.set(1 - t * 0.8);
  });

  function holdDetail() {
    followDetail.current = false;
  }

  function armOpen() {
    followDetail.current = true;
    detailShift.set(0);
    detailFade.set(1);
    dragY.set(0);
  }

  function commit(portNumber: string, to: number, kind?: "back") {
    setDrag((current) => (current?.id === portNumber ? null : current));
    const from = items.findIndex((item) => item.port.portNumber === portNumber);
    if (from < 0 || from === to) return;
    onReorder(portNumber, to);
    const item = items[from];
    if (!item) return;
    const title = portName(item.port).title;
    const message = kind === "back" ? copy.sentToBack(title) : copy.movedTo(title, to + 1, items.length);
    setLive((previous) => (previous === message ? `${message}\u00A0` : message));
  }

  const spring = reduce ? REDUCED : SPRING.move;

  return (
    <div className="relative overflow-x-clip" style={{ minHeight: height }}>
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
              quiet={quiet}
              rowSlot={returnFrom ? returnFrom.indexOf(id) : -1}
              appearFrom={height + 120}
              reduce={Boolean(reduce)}
              spring={spring}
              copy={copy}
              dragY={dragY}
              onExpand={() => {
                armOpen();
                onExpand(id);
              }}
              onCollapse={onCollapse}
              onHoldDetail={holdDetail}
              onLift={() => setDrag({ id, from: index, over: index })}
              onOver={(over) =>
                setDrag((current) =>
                  current && current.id === id && current.over !== over ? { ...current, over } : current,
                )
              }
              onCommit={(to) => commit(id, to)}
              onSendBack={() => commit(id, 0, "back")}
              onShare={onShare}
              checking={checking}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="detail"
            style={{ opacity: detailFade, y: detailShift, paddingTop: CARD_H + 20 }}
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
  quiet,
  rowSlot,
  appearFrom,
  reduce,
  spring,
  copy,
  dragY,
  onExpand,
  onCollapse,
  onHoldDetail,
  onLift,
  onOver,
  onCommit,
  onSendBack,
  onShare,
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
  quiet: boolean;
  rowSlot: number;
  appearFrom: number;
  reduce: boolean;
  spring: typeof SPRING.move | typeof REDUCED;
  copy: Copy;
  dragY: ReturnType<typeof useMotionValue<number>>;
  onExpand: () => void;
  onCollapse: () => void;
  onHoldDetail: () => void;
  onLift: () => void;
  onOver: (over: number) => void;
  onCommit: (to: number) => void;
  onSendBack: () => void;
  onShare: (port: PortWaitTime, mode: Mode) => void;
  checking: boolean;
}) {
  const present = useIsPresent();
  // A card that was on screen in full starts exactly where it was and settles into its slot.
  const y = useMotionValue(
    reduce
      ? targetY
      : rowSlot >= 0
        ? rowSlot * (CARD_H + ROW_GAP)
        : quiet
          ? targetY
          : appearFrom,
  );
  const enterDelay = useRef(!quiet && intro && !reduce ? index * 0.06 : 0);
  const pendingGesture = useRef<{ velocity?: number; from?: number } | null>(null);
  const flight = useRef<{ stop: () => void } | null>(null);
  const [pressed, setPressed] = useState(false);
  const dismissArmed = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [raised, setRaised] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const swipeX = useMotionValue(0);
  const tilt = useMotionValue(0);
  const swipeFade = useMotionValue(1);
  const swipeFlight = useRef<{ stop: () => void } | null>(null);
  const swipeArmed = useRef(false);
  const expectBack = useRef(false);
  const cardWidth = useRef(320);
  const phase = useRef<"idle" | "pending" | "dragging" | "swiping">("idle");
  const stopListening = useRef<(() => void) | null>(null);
  const countRef = useRef(count);
  const onLiftRef = useRef(onLift);
  const onOverRef = useRef(onOver);
  const onCommitRef = useRef(onCommit);
  const onExpandRef = useRef(onExpand);
  const onCollapseRef = useRef(onCollapse);
  const onHoldDetailRef = useRef(onHoldDetail);
  const onSendBackRef = useRef(onSendBack);
  const releaseY = useRef(0);
  useEffect(() => {
    countRef.current = count;
    onLiftRef.current = onLift;
    onOverRef.current = onOver;
    onCommitRef.current = onCommit;
    onExpandRef.current = onExpand;
    onCollapseRef.current = onCollapse;
    onHoldDetailRef.current = onHoldDetail;
    onSendBackRef.current = onSendBack;
  });

  useEffect(() => {
    if (!present) {
      if (reduce) return;
      const controls = animate(y, y.get() + 160, SPRING.move);
      return () => controls.stop();
    }
    if (dragging || swiping) return;
    // Stay invisible on the back slot until this card actually is the back card.
    // Fading in earlier would paint it over the stack for a frame.
    let arrive: { stop: () => void } | null = null;
    if (expectBack.current) {
      y.set(0);
      swipeFade.set(0);
      if (index !== 0) return;
      window.setTimeout(() => {
        expectBack.current = false;
      }, 0);
      const move = animate(swipeX, 0, reduce ? REDUCED : SPRING.snap);
      const fade = animate(swipeFade, 1, reduce ? REDUCED : { duration: 0.22, ease: [0.23, 1, 0.32, 1] });
      arrive = {
        stop() {
          move.stop();
          fade.stop();
        },
      };
      swipeFlight.current = arrive;
      void move.finished.then(
        () => {
          if (swipeFlight.current === arrive) swipeFlight.current = null;
        },
        () => {},
      );
    }
    // Leave the handoff in place across Strict Mode's extra effect pass.
    const gesture = pendingGesture.current;
    if (gesture) {
      const token = gesture;
      window.setTimeout(() => {
        if (pendingGesture.current === token) pendingGesture.current = null;
      }, 0);
    }
    // A dismiss hands off the release point through `from`. The previous
    // animation's stop ticks one frame toward its own target first, which would
    // otherwise plant the card back at the open rest point.
    if (gesture?.from !== undefined) y.set(gesture.from);
    const flung = gesture?.velocity !== undefined && Math.abs(gesture.velocity) > FLING;
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
            ...(gesture?.velocity !== undefined ? { velocity: gesture.velocity } : {}),
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
      arrive?.stop();
      if (swipeFlight.current === arrive) swipeFlight.current = null;
      if (flight.current === controls) flight.current = null;
    };
  }, [present, dragging, swiping, targetY, y, reduce, index, swipeX, swipeFade]);

  useEffect(() => {
    if (swiping) return;
    const controls = animate(tilt, !reduce && dragging ? -1.25 : 0, reduce ? REDUCED : SPRING.snap);
    return () => controls.stop();
  }, [dragging, swiping, reduce, tilt]);

  useEffect(() => {
    return () => {
      stopListening.current?.();
      swipeFlight.current?.stop();
    };
  }, []);

  function raise() {
    setRaised(true);
  }

  function springSwipeHome(velocity: number) {
    swipeArmed.current = false;
    const controls = animate(swipeX, 0, reduce ? REDUCED : { ...SPRING.move, velocity });
    if (!reduce) animate(tilt, 0, SPRING.move);
    swipeFlight.current = controls;
    void controls.finished.then(
      () => {
        if (swipeFlight.current !== controls) return;
        swipeFlight.current = null;
        setSwiping(false);
      },
      () => {},
    );
  }

  function landAtBack(dir: number) {
    // Park on the back slot while invisible. The slot effect fades it in once
    // the reorder has actually moved this card behind the others.
    expectBack.current = true;
    pendingGesture.current = null;
    y.set(0);
    tilt.set(0);
    swipeFade.set(0);
    swipeX.set(reduce ? 0 : dir * 36);
    swipeFlight.current = null;
    onSendBackRef.current();
    setSwiping(false);
  }

  function flingAway(dir: number, velocity: number) {
    if (!swipeArmed.current) haptic("medium");
    swipeArmed.current = false;
    if (reduce) {
      landAtBack(0);
      return;
    }
    const width = cardWidth.current;
    if (Math.abs(swipeX.get()) >= width * 0.85) {
      landAtBack(dir);
      return;
    }
    const dest = dir * (width + 28);
    const controls = animate(swipeX, dest, { ...SPRING.release, velocity });
    const tiltFlight = animate(tilt, dir * 8, SPRING.release);
    const fadeFlight = animate(swipeFade, 0, { duration: 0.18, ease: [0.23, 1, 0.32, 1] });
    let sent = false;
    let stopWatch = () => {};
    const token = {
      stop() {
        if (sent) return;
        sent = true;
        stopWatch();
        tiltFlight.stop();
        fadeFlight.stop();
        controls.stop();
      },
    };
    function send() {
      if (sent) return;
      token.stop();
      landAtBack(dir);
    }
    // Hand off once the card has left the stack, so it can reappear at the back
    // without waiting out the rest of the spring offscreen.
    stopWatch = swipeX.on("change", (latest) => {
      if (Math.abs(latest) >= width * 0.85) send();
    });
    swipeFlight.current = token;
    void controls.finished.then(send, () => {});
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("[data-card-action]")) return;
    stopListening.current?.();
    const offset = swipeX.get();
    const front = canReorder && index === count - 1;
    const grabbed = front && Math.abs(offset) > 1;
    swipeFlight.current?.stop();
    swipeFlight.current = null;
    if (!grabbed) {
      swipeX.set(0);
      tilt.set(0);
      swipeFade.set(1);
      if (swiping) setSwiping(false);
    }
    if (!canReorder) return;
    cardWidth.current = event.currentTarget.offsetWidth || cardWidth.current;
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const pointerType = event.pointerType;
    const originX = grabbed ? offset : 0;
    let originY = y.get();
    let lastOver = index;
    let pastEdge = false;
    let slottedAt = 0;
    let unlockScroll: (() => void) | null = null;
    const samples: { v: number; t: number }[] = [];
    const xSamples: { v: number; t: number }[] = [];

    if (grabbed) {
      phase.current = "swiping";
      flight.current?.stop();
      enterDelay.current = 0;
      swipeFade.set(1);
      setPressed(false);
      setSwiping(true);
    } else {
      setPressed(true);
      phase.current = "pending";
    }

    const hold = grabbed
      ? 0
      : window.setTimeout(() => {
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
          haptic("rigid");
          onLiftRef.current();
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

    function trackSwipe(event: PointerEvent) {
      event.preventDefault();
      const next = originX + (event.clientX - startX);
      swipeX.set(next);
      if (!reduce) tilt.set(clamp(next / 22, -10, 10));
      const now = performance.now();
      xSamples.push({ v: next, t: now });
      if (xSamples.length > 5) xSamples.shift();
      const past = Math.abs(next) >= SWIPE_DISTANCE;
      if (past && !swipeArmed.current) {
        swipeArmed.current = true;
        haptic("selection");
      } else if (swipeArmed.current && Math.abs(next) < SWIPE_DISTANCE - 28) {
        swipeArmed.current = false;
      }
    }

    function onMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      if (phase.current === "swiping") {
        trackSwipe(event);
        return;
      }
      if (phase.current === "pending") {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (dx * dx + dy * dy > SLOP * SLOP) {
          // The front card's horizontal move is a swipe. Anything else still scrolls.
          if (front && Math.abs(dx) > Math.abs(dy)) {
            window.clearTimeout(hold);
            phase.current = "swiping";
            flight.current?.stop();
            enterDelay.current = 0;
            setPressed(false);
            setSwiping(true);
            trackSwipe(event);
            return;
          }
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
      samples.push({ v: next, t: now });
      if (samples.length > 5) samples.shift();
      const overEdge = raw < 0 || raw > max;
      if (overEdge && !pastEdge) {
        pastEdge = true;
        haptic("soft");
      } else if (raw > 12 && raw < max - 12) {
        pastEdge = false;
      }
      const over = clamp(Math.round(next / PEEK), 0, countRef.current - 1);
      if (over !== lastOver) {
        lastOver = over;
        slottedAt = performance.now();
        haptic("selection");
        onOverRef.current(over);
      }
    }

    function onUp(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      const cancelled = event.type === "pointercancel";
      const wasPending = phase.current === "pending";
      const wasDragging = phase.current === "dragging";
      const wasSwiping = phase.current === "swiping";
      phase.current = "idle";
      setPressed(false);
      finishListen();
      if (wasSwiping) {
        if (cancelled) {
          springSwipeHome(0);
          return;
        }
        const velocity = readVelocity(xSamples);
        // Looser than a reorder flick: a sideways throw should leave, not creep one slot.
        const projected = swipeX.get() + projectRelease(velocity, 0.995);
        if (Math.abs(projected) < SWIPE_DISTANCE) {
          springSwipeHome(velocity);
          return;
        }
        const dir = Math.sign(projected) || Math.sign(swipeX.get()) || 1;
        flingAway(dir, velocity);
        return;
      }
      if (wasPending) {
        if (!cancelled) onExpandRef.current();
        return;
      }
      if (!wasDragging) return;
      if (cancelled) {
        haptic("soft");
        pendingGesture.current = { velocity: 0 };
        setDragging(false);
        onCommitRef.current(index);
        return;
      }
      const velocity = readVelocity(samples);
      const projected = y.get() + projectRelease(velocity);
      const to = clamp(Math.round(projected / PEEK), 0, countRef.current - 1);
      // A flick that lands past the slot under the finger gets that slot's detent.
      // Setting down after a dwell is softer. Releasing in the same instant as a
      // detent stays with the detent.
      if (to !== lastOver) haptic("selection");
      else if (performance.now() - slottedAt > 48) haptic("soft");
      pendingGesture.current = { velocity };
      setDragging(false);
      onCommitRef.current(to);
    }

    stopListening.current = finishListen;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function rememberRelease(_: unknown, info?: PanInfo) {
    releaseY.current = dragY.get();
    if (!info) return;
    const past = info.offset.y > DISMISS_DISTANCE;
    if (past && !dismissArmed.current) {
      dismissArmed.current = true;
      haptic("selection");
    } else if (info.offset.y < DISMISS_DISTANCE - 28) {
      dismissArmed.current = false;
    }
  }

  function onOpenDragEnd(_: unknown, info: PanInfo) {
    const released = releaseY.current;
    const velocity = info.velocity.y;
    dragY.stop();
    // Undo the frame Motion may already have pulled back toward the origin.
    dragY.set(released);

    const projected = info.offset.y + project(velocity);
    if (projected <= DISMISS_DISTANCE) {
      dismissArmed.current = false;
      animate(dragY, 0, SPRING.move);
      return;
    }

    // The threshold tick already marked the line. A flick that never crossed it
    // still needs a tick at the moment the dismiss commits.
    if (!dismissArmed.current) haptic("medium");
    dismissArmed.current = false;

    // The open card's visual position is this drag offset (the stack value is
    // the open rest, 0). Move it onto the stack before the close spring starts,
    // or the card snaps home and the close plays from that fixed point.
    onHoldDetailRef.current();
    flight.current?.stop();
    y.set(y.get() + released);
    dragY.set(0);
    const from = y.get();
    const destination = index * PEEK;
    // Straight into the slot. The flick already decided to close; it should not
    // carry the card past the place it is going.
    if (destination === targetY) {
      flight.current = animate(y, destination, SPRING.move);
    } else {
      pendingGesture.current = { from };
    }
    onCollapseRef.current();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (canReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const to = clamp(index + (event.key === "ArrowUp" ? -1 : 1), 0, count - 1);
      if (to !== index) {
        haptic("selection");
        onCommit(to);
      }
      return;
    }
    if (!isOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onExpand();
    }
  }

  const label = ariaLabel(item, copy);
  const isFront = canReorder && index === count - 1;
  const zIndex = raised || lifted || swiping ? count + 8 : isOpen ? count + 1 : slot + 1;

  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ y, zIndex, pointerEvents: dimmed ? "none" : "auto" }}
      initial={
        quiet && rowSlot >= 0 ? false : reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }
      }
      animate={{ opacity: dimmed ? 0 : dragging ? 0.82 : 1, scale: dimmed ? 0.95 : 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, transition: SPRING.move }}
      transition={{ ...spring, delay: reduce ? 0 : intro ? index * 0.06 : 0 }}
    >
      <motion.div
        role="button"
        tabIndex={isOpen ? -1 : 0}
        aria-label={
          canReorder ? `${label}. ${isFront ? `${copy.sendBackHint}. ` : ""}${copy.reorderHint}` : label
        }
        aria-expanded={isOpen}
        aria-keyshortcuts={canReorder ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
        onPointerDown={onPointerDown}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={onKeyDown}
        transition={SPRING.snap}
        animate={{
          scale: reduce ? 1 : swiping ? 1.03 : dragging ? 1.04 : pressed ? 0.985 : 1,
        }}
        style={{
          x: swipeX,
          y: isOpen ? dragY : 0,
          rotate: tilt,
          opacity: swipeFade,
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
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.04, bottom: 0 }}
        dragMomentum={false}
        onDragStart={rememberRelease}
        onDrag={rememberRelease}
        onDragEnd={onOpenDragEnd}
      >
        <CardFace
          port={item.port}
          mode={item.mode}
          checking={checking}
          onShare={() => onShare(item.port, item.mode)}
        />
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

function readVelocity(samples: { v: number; t: number }[]) {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return ((last.v - first.v) / dt) * 1000;
}
