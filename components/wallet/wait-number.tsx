"use client";

import { cn } from "@/lib/cn";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** One 0–9 pass. The ones place is fastest so the check reads as counting. */
const CYCLE_MS = [900, 1250, 1600];
const LAND_MS = 220;
const REEL_STAGGER_MS = 70;

function offsetY(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  return new DOMMatrix(transform).m42;
}

/** Holds each whole digit, then flicks to the next. A continuous slide shows them cut in half. */
function reelFrames(height: number): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 10; i++) {
    const transform = `translateY(${-i * height}px)`;
    const start = i / 10;
    frames.push({ transform, offset: start, easing: "linear" });
    if (i < 10) frames.push({ transform, offset: start + 0.07, easing: EASE_OUT });
  }
  return frames;
}

/**
 * One digit column. While `active`, it cycles; when the check ends, the ones
 * place lands first and the places to its left follow.
 */
function DigitReel({ digit, active, place }: { digit: number; active: boolean; place: number }) {
  const strip = useRef<HTMLSpanElement>(null);
  const digitRef = useRef(digit);
  digitRef.current = digit;
  const [spinning, setSpinning] = useState(active);

  useEffect(() => {
    if (active) {
      setSpinning(true);
      return;
    }
    const id = window.setTimeout(() => setSpinning(false), place * REEL_STAGGER_MS);
    return () => window.clearTimeout(id);
  }, [active, place]);

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || !spinning) return;

    let anim: Animation | null = null;
    let frame = 0;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      const cell = el.firstElementChild as HTMLElement | null;
      const height = cell?.getBoundingClientRect().height ?? 0;
      if (height < 1) {
        frame = requestAnimationFrame(start);
        return;
      }
      const duration = CYCLE_MS[Math.min(place, CYCLE_MS.length - 1)];
      anim = el.animate(reelFrames(height), {
        duration,
        iterations: Infinity,
        easing: "linear",
      });
      anim.currentTime = (digitRef.current / 10) * duration;
    };
    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (!anim) return;
      const y = offsetY(el);
      anim.cancel();
      el.style.transform = `translateY(${y}px)`;
    };
  }, [spinning, place]);

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || spinning) return;

    const cell = el.firstElementChild as HTMLElement | null;
    const height = cell?.getBoundingClientRect().height ?? 0;
    if (height < 1) return;

    const to = -digit * height;
    const raw = Math.round(-offsetY(el) / height);
    const fromIndex = raw >= 10 ? 0 : Math.max(0, Math.min(9, raw));
    const from = -fromIndex * height;
    if (Math.abs(from - to) < 0.5) {
      el.style.transform = `translateY(${to}px)`;
      return;
    }

    const steps = Math.max(1, Math.abs(digit - fromIndex));
    const settle = el.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }], {
      duration: Math.min(LAND_MS, Math.max(80, steps * 50)),
      easing: `steps(${steps}, end)`,
      fill: "forwards",
    });
    settle.onfinish = () => {
      el.style.transform = `translateY(${to}px)`;
      settle.cancel();
    };
    return () => settle.cancel();
  }, [spinning, digit]);

  return (
    <span className="inline-block h-[1em] overflow-hidden">
      <span ref={strip} className="flex flex-col">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, index) => (
          <span key={index} className="block h-[1em] text-center leading-none tabular-nums">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** A number that rolls to its new value. A manual refresh flips the digits until the check lands. */
export function WaitNumber({
  value,
  checking = false,
  className,
}: {
  value: number;
  checking?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? value : 0, { stiffness: 150, damping: 22, mass: 0.9 });
  const text = useTransform(spring, (v) => Math.max(0, Math.round(v)).toString());
  const [phase, setPhase] = useState<"idle" | "spin" | "land">("idle");

  useEffect(() => {
    if (reduce) {
      setPhase("idle");
      return;
    }
    if (checking) {
      setPhase("spin");
      return;
    }
    setPhase((current) => (current === "spin" ? "land" : current));
  }, [checking, reduce]);

  useEffect(() => {
    if (phase !== "land") return;
    const id = window.setTimeout(() => setPhase("idle"), LAND_MS + REEL_STAGGER_MS * 2 + 40);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "idle") {
      spring.jump(value);
      return;
    }
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduce, phase]);

  const digits = String(Math.max(0, Math.round(value))).split("").map((digit) => Number(digit));

  return (
    <span
      className={cn("relative inline-block", className, reduce && checking && "wait-checking")}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <motion.span className={phase === "idle" ? undefined : "text-transparent"}>{text}</motion.span>
      {phase !== "idle" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-end">
          {digits.map((digit, index) => {
            const place = digits.length - 1 - index;
            return <DigitReel key={place} digit={digit} active={phase === "spin"} place={place} />;
          })}
        </span>
      )}
    </span>
  );
}
