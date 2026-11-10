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

function sum(days: GrowthDay[], key: "count" | "guests"): number {
  return days.reduce((total, entry) => total + entry[key], 0);
}

/**
 * New accounts and new guests per day, stacked. Accounts are the dark segment, guests the accent
 * one. Pick a range, then press or drag across the bars to read any single day.
 * `before` and `guestsBefore` are how many existed ahead of the first day passed in.
 */
export function GrowthChart({
  days,
  before,
  guestsBefore,
  now,
}: {
  days: GrowthDay[];
  before: number;
  guestsBefore: number;
  now: number;
}) {
  const [range, setRange] = useState<Range>(30);
  const [picked, setPicked] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);

  const length = Math.min(range, days.length);
  const visible = days.slice(days.length - length);
  const earlier = days.slice(Math.max(0, days.length - length * 2), days.length - length);
  const accounts = sum(visible, "count");
  const guests = sum(visible, "guests");
  const total = accounts + guests;
  const peak = Math.max(1, ...visible.map((entry) => entry.count + entry.guests));
  const previous = earlier.length === length ? sum(earlier, "count") + sum(earlier, "guests") : null;
  const change = previous === null ? null : total - previous;
  const index = picked !== null && picked < visible.length ? picked : null;
  const chosen = index === null ? null : visible[index];

  // People who existed when the visible window began, plus everyone who arrived up to a given day.
  const hidden = days.slice(0, days.length - length);
  const accountBaseline = before + sum(hidden, "count");
  const guestBaseline = guestsBefore + sum(hidden, "guests");
  const runningAccounts = (upTo: number) => accountBaseline + sum(visible.slice(0, upTo + 1), "count");
  const runningGuests = (upTo: number) => guestBaseline + sum(visible.slice(0, upTo + 1), "guests");

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

      <div className="mt-4 min-h-[4.75rem]" aria-live="polite">
        {chosen ? (
          <>
            <p className="text-[13px] text-muted">{formatDay(chosen.day, now)}</p>
            <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {(chosen.count + chosen.guests).toLocaleString("en-US")}
            </p>
            <p className="mt-1.5 text-[13px] text-muted tabular-nums">
              {chosen.count.toLocaleString("en-US")} accounts, {chosen.guests.toLocaleString("en-US")} guests
              <span className="mx-1.5">·</span>
              {runningAccounts(index!).toLocaleString("en-US")} accounts and {runningGuests(index!).toLocaleString("en-US")} guests in total
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              New people, {formatDay(visible[0]?.day ?? "", now)} to today
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
            <p className="mt-1.5 text-[13px] text-muted tabular-nums">
              {accounts.toLocaleString("en-US")} accounts, {guests.toLocaleString("en-US")} guests
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-foreground" />
          Accounts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Guests
        </span>
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
          aria-label={`New accounts and guests per day, ${total} in the last ${length} days. Use the arrow keys to read each day.`}
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
          {visible.map((entry, position) => {
            const combined = entry.count + entry.guests;
            return (
              <span
                key={entry.day}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 flex-col justify-end",
                  index !== null && index !== position && "opacity-30",
                )}
              >
                {combined === 0 ? (
                  <span className="h-[3%] w-full rounded-t-[3px] bg-foreground opacity-15" />
                ) : (
                  <>
                    {entry.guests > 0 && (
                      <span
                        className="w-full rounded-t-[3px] bg-accent"
                        style={{ height: `${(entry.guests / peak) * 100}%`, minHeight: 2 }}
                      />
                    )}
                    {entry.count > 0 && (
                      <span
                        className={cn("w-full bg-foreground", entry.guests === 0 && "rounded-t-[3px]")}
                        style={{ height: `${(entry.count / peak) * 100}%`, minHeight: 2 }}
                      />
                    )}
                  </>
                )}
              </span>
            );
          })}
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
