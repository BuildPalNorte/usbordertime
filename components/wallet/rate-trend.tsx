"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import {
  dayTime,
  lastDays,
  nearestPoint,
  TREND_SPANS,
  trendChange,
  trendShape,
  type TrendPoint,
  type TrendSpan,
} from "@/lib/rate-trend";
import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

const CHART_H = "h-28";

type Props = {
  /** The daily series, oldest first. Null until there is one. */
  points: readonly TrendPoint[] | null;
  pending: boolean;
  failed: boolean;
  onRetry: () => void;
};

/**
 * Dollar-peso through time. The line is the feed's daily rate. A drag reads the day under
 * the finger and the change from the first day of the span.
 */
export function RateTrend({ points, pending, failed, onRetry }: Props) {
  const { copy } = useLocale();
  const usable = points && points.length >= 2 ? points : null;

  if (!usable && pending && !failed) {
    return (
      <section className="rounded-2xl bg-surface px-4 pt-4 pb-3" aria-busy="true">
        <p className="text-[13px] font-medium text-muted">{copy.exchangeTrend}</p>
        <span aria-hidden className="shimmer mt-2 block h-8 w-28 rounded-full" />
        <span aria-hidden className={cn("shimmer mt-4 block w-full rounded-xl", CHART_H)} />
      </section>
    );
  }

  if (!usable) {
    return (
      <section className="rounded-2xl bg-surface px-4 py-3.5">
        <p className="text-[13px] font-medium text-muted">{copy.exchangeTrend}</p>
        <p role="alert" className="mt-1 text-[15px] leading-snug tracking-[-0.02em]">
          {copy.exchangeTrendError}
        </p>
        <motion.button
          type="button"
          onClick={() => {
            haptic("light");
            onRetry();
          }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING.snap}
          className="relative mt-3 h-10 cursor-pointer rounded-full bg-surface-strong px-5 text-[15px] font-semibold"
        >
          <HapticPad />
          {copy.tryAgain}
        </motion.button>
      </section>
    );
  }

  return <TrendChart points={usable} />;
}

function TrendChart({ points }: { points: readonly TrendPoint[] }) {
  const { locale, copy } = useLocale();
  const reduce = useReducedMotion();
  const tag = locale === "es" ? "es-MX" : "en-US";
  const gradient = `trend-${useId().replace(/\W/g, "")}`;
  const [span, setSpan] = useState<TrendSpan>(30);
  const [picked, setPicked] = useState<number | null>(null);

  const shown = useMemo(() => lastDays(points, span), [points, span]);
  const shape = useMemo(() => trendShape(shown), [shown]);
  const last = shown.length - 1;
  // A pick from a longer span can point past the end of a shorter one.
  const selected = picked !== null && picked <= last ? picked : last;
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; locked: boolean; pointer: number } | null>(null);

  const unit = useMemo(
    () => new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [tag],
  );
  const percentFormat = useMemo(
    () =>
      new Intl.NumberFormat(tag, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
    [tag],
  );
  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [tag],
  );
  const tickFormat = useMemo(
    () => new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }),
    [tag],
  );

  const point = shown[selected];
  const change = trendChange(shown, selected);
  const dayName = dayFormat.format(dayTime(point.day));
  const valueText = unit.format(point.mxn);
  const detail = copy.exchangeTrendAt(dayName, valueText);

  function choose(next: number) {
    if (selectedRef.current === next) return;
    selectedRef.current = next;
    haptic("selection");
    setPicked(next);
  }

  function pointAt(clientX: number): number {
    const node = track.current;
    if (!node) return selectedRef.current;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) return selectedRef.current;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return nearestPoint(shape.xs, ratio);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, locked: false, pointer: event.pointerId };
    if (event.pointerType !== "touch") {
      drag.current.locked = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      choose(pointAt(event.clientX));
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointer) return;
    if (!state.locked) {
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // A vertical swipe is the page scrolling, not a read of the chart.
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      state.locked = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    choose(pointAt(event.clientX));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state || event.pointerId !== state.pointer || state.locked) return;
    choose(pointAt(event.clientX));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next = selectedRef.current;
    if (event.key === "ArrowRight") next = Math.min(last, next + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, next - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    choose(next);
  }

  const x = shape.xs[selected] * 100;
  const y = shape.ys[selected] * 100;

  return (
    <section className="rounded-2xl bg-surface px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">{copy.exchangeTrend}</p>
          <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
            {valueText}
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label={copy.exchangeSpanLabel}
          className="flex shrink-0 gap-0.5 rounded-full bg-surface-strong p-1"
        >
          {TREND_SPANS.map((option) => {
            const active = option === span;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (active) return;
                  haptic("selection");
                  setSpan(option);
                  setPicked(null);
                }}
                className={cn(
                  "relative h-8 rounded-full px-3 text-[13px] font-medium transition-colors duration-200",
                  active ? "text-accent-ink" : "text-foreground active:opacity-60",
                )}
              >
                {!active && <HapticPad />}
                {active && (
                  <motion.span
                    layoutId="trend-span"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={SPRING.snap}
                  />
                )}
                <span className="relative">
                  {option === 7 ? copy.exchangeSpan7 : copy.exchangeSpan30}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 flex min-h-5 items-center gap-2 text-[13px] leading-5 text-muted tabular-nums">
        <span>{dayName}</span>
        {change && selected > 0 && (
          <span className="rounded-full bg-foreground/[0.07] px-2 py-0.5 text-[12px] leading-4 font-semibold text-foreground">
            {percentFormat.format(change.percent)}
          </span>
        )}
      </p>

      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={copy.exchangeTrendChart}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={selected}
        aria-valuetext={detail}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={onKeyDown}
        className={cn("relative mt-3 touch-pan-y rounded-lg outline-offset-4", CHART_H)}
      >
        {/* The line is revealed left to right. A dash-based draw would not work here: with a
            non-scaling stroke the dash lengths are in screen pixels, not path units. */}
        <motion.div
          key={span}
          className="absolute inset-0"
          initial={reduce ? false : { clipPath: "inset(-12px 100% -12px -12px)" }}
          animate={{ clipPath: "inset(-12px -12px -12px -12px)" }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            className="size-full overflow-visible text-accent"
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={shape.area} fill={`url(#${gradient})`} />
            <path
              d={shape.line}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </motion.div>

        {picked !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/15"
            style={{ left: `${x}%` }}
          />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-[3px] ring-surface"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[11px] leading-none text-muted tabular-nums">
        <span>{tickFormat.format(dayTime(shown[0].day))}</span>
        <span>{tickFormat.format(dayTime(shown[last].day))}</span>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-muted">{copy.exchangeTrendHint}</p>
    </section>
  );
}
