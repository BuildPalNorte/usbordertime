"use client";

import { formatDay } from "@/lib/admin-time";
import type { GrowthDay } from "@/lib/admin-insights";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

type Range = (typeof RANGES)[number]["days"];

function sum(days: GrowthDay[]): number {
  return days.reduce((total, entry) => total + entry.count, 0);
}

/**
 * New accounts per day. Pick a range, then press or drag across the bars to read any single day.
 * `before` is how many accounts existed ahead of the first day passed in, so a running total is honest.
 */
export function GrowthChart({ days, before, now }: { days: GrowthDay[]; before: number; now: number }) {
  const [range, setRange] = useState<Range>(30);
  const [picked, setPicked] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);

  const length = Math.min(range, days.length);
  const visible = days.slice(days.length - length);
  const earlier = days.slice(Math.max(0, days.length - length * 2), days.length - length);
  const total = sum(visible);
  const peak = Math.max(1, ...visible.map((entry) => entry.count));
  const previous = earlier.length === length ? sum(earlier) : null;
  const change = previous === null ? null : total - previous;
  const index = picked !== null && picked < visible.length ? picked : null;
  const chosen = index === null ? null : visible[index];

  // Accounts that existed when the visible window began, plus everyone who joined up to a given day.
  const baseline = before + sum(days.slice(0, days.length - length));
  const running = (upTo: number) => baseline + sum(visible.slice(0, upTo + 1));

  function at(event: PointerEvent<HTMLDivElement>) {
    const box = plot.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const next = Math.min(length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * length)));
    if (next !== picked) {
      haptic("selection");
      setPicked(next);
    }
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -1 : 1;
      setPicked(Math.min(length - 1, Math.max(0, (index ?? length - 1) + step)));
    } else if (event.key === "Escape") {
      setPicked(null);
    }
  }

  const gap = length <= 7 ? "gap-2" : length <= 30 ? "gap-[3px]" : "gap-px";
  const ticks = [0, Math.floor((length - 1) / 2), length - 1];

  return (
    <div className="rounded-3xl border border-line bg-surface px-4 py-4">
      <div role="radiogroup" aria-label="Growth range" className="flex gap-1 rounded-full bg-surface-strong p-1">
        {RANGES.map((option) => {
          const selected = option.days === range;
          return (
            <button
              key={option.days}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={option.days > days.length}
              onClick={() => {
                if (selected) return;
                haptic("selection");
                setPicked(null);
                setRange(option.days);
              }}
              className={cn(
                "inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-full text-[13px] font-medium transition-colors duration-150",
                selected ? "bg-surface text-foreground shadow-sm" : "text-muted active:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[3.75rem]" aria-live="polite">
        {chosen ? (
          <>
            <p className="text-[13px] text-muted">{formatDay(chosen.day, now)}</p>
            <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {chosen.count.toLocaleString("en-US")}
              <span className="ml-2 text-[15px] font-medium tracking-normal text-muted">
                new, {running(index!).toLocaleString("en-US")} in total
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              New accounts, {formatDay(visible[0]?.day ?? "", now)} to today
            </p>
            <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {total.toLocaleString("en-US")}
              {change !== null && (
                <span className="ml-2 text-[15px] font-medium tracking-normal text-muted">
                  {change === 0
                    ? "same as before"
                    : `${change > 0 ? "up" : "down"} ${Math.abs(change).toLocaleString("en-US")} from the ${length} days before`}
                </span>
              )}
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <div className="flex w-6 shrink-0 flex-col justify-between pb-px text-right text-[11px] text-muted tabular-nums" aria-hidden>
          <span>{peak}</span>
          <span>0</span>
        </div>
        <div
          ref={plot}
          role="group"
          tabIndex={0}
          aria-label={`New accounts per day, ${total} in the last ${length} days. Use the arrow keys to read each day.`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            at(event);
          }}
          onPointerMove={at}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setPicked(null);
          }}
          onKeyDown={onKey}
          onBlur={() => setPicked(null)}
          className={cn(
            "relative flex h-28 min-w-0 flex-1 touch-pan-y items-end rounded-md border-b border-line outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
            gap,
          )}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
          {visible.map((entry, position) => (
            <span key={entry.day} className="relative flex h-full min-w-0 flex-1 items-end">
              <span
                className={cn(
                  "h-full w-full origin-bottom rounded-t-[3px] bg-foreground transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
                  index !== null && index !== position && "opacity-30",
                  entry.count === 0 && index === null && "opacity-15",
                )}
                style={{ transform: `scaleY(${entry.count === 0 ? 0.03 : Math.max(0.06, entry.count / peak)})` }}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-9 text-[12px] text-muted" aria-hidden>
        {ticks.map((position, slot) => (
          <span key={slot}>{slot === 2 ? "Today" : formatDay(visible[position]?.day ?? "", now)}</span>
        ))}
      </div>
    </div>
  );
}
