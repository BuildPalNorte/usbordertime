"use client";

import { centralDay, formatDay } from "@/lib/admin-time";
import {
  matchingOpenRange,
  OPEN_RANGES,
  openRangeIssue,
  parseAppOpens,
  recentOpenRange,
  type AppOpens,
  type OpenRangeId,
} from "@/lib/app-opens";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

function countLabel(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/**
 * Unique accounts and every app open in a Central-time span. The page starts on the last 7 days.
 * Changing the span reads that window from the server, because a person who came on two days is
 * one account for the whole span.
 */
export function AppOpens({ initial, now }: { initial: AppOpens | null; now: number }) {
  const today = centralDay(new Date(now));
  const fallback = recentOpenRange(today, 7);
  const [from, setFrom] = useState(initial?.from ?? fallback.from);
  const [to, setTo] = useState(initial?.to ?? fallback.to);
  const [report, setReport] = useState<AppOpens | null>(initial);
  const [status, setStatus] = useState<"ready" | "loading" | "error">(initial ? "ready" : "error");
  const [notice, setNotice] = useState<string | null>(initial ? null : "Could not read uses for that time.");
  const [picked, setPicked] = useState<number | null>(null);
  const request = useRef(0);
  const plot = useRef<HTMLDivElement>(null);
  const selected = matchingOpenRange(from, to, today);

  async function load(nextFrom: string, nextTo: string) {
    const issue = openRangeIssue(nextFrom, nextTo);
    if (issue) {
      setNotice(issue);
      setStatus("ready");
      return;
    }
    const id = ++request.current;
    setNotice(null);
    setStatus("loading");
    try {
      const response = await fetch(`/api/admin/opens?from=${nextFrom}&to=${nextTo}`);
      const body: unknown = await response.json().catch(() => null);
      const parsed = parseAppOpens(body);
      if (id !== request.current) return;
      if (!response.ok || !parsed) {
        setStatus("error");
        setNotice("Could not read uses for that time.");
        return;
      }
      setReport(parsed);
      setPicked(null);
      setStatus("ready");
    } catch {
      if (id !== request.current) return;
      setStatus("error");
      setNotice("Could not read uses for that time.");
    }
  }

  function choose(id: OpenRangeId, days: number) {
    if (id === selected) return;
    haptic("selection");
    const next = recentOpenRange(today, days);
    setFrom(next.from);
    setTo(next.to);
    void load(next.from, next.to);
  }

  function edit(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    if (!nextFrom || !nextTo) return;
    void load(nextFrom, nextTo);
  }

  const days = report?.days ?? [];
  const length = days.length;
  const index = picked !== null && picked < length ? picked : null;
  const chosen = index === null ? null : days[index];
  const people = chosen ? chosen.people : (report?.people ?? 0);
  const opens = chosen ? chosen.opens : (report?.opens ?? 0);
  const peak = Math.max(1, ...days.map((entry) => entry.opens));
  const gap = length <= 7 ? "gap-2" : length <= 30 ? "gap-[3px]" : "gap-px";
  const ticks = length > 1 ? [0, Math.floor((length - 1) / 2), length - 1] : [];

  function at(event: PointerEvent<HTMLDivElement>) {
    const box = plot.current?.getBoundingClientRect();
    if (!box || box.width === 0 || length === 0) return;
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

  const rangeLabel = chosen
    ? formatDay(chosen.day, now)
    : `${formatDay(from, now)} to ${to === today ? "today" : formatDay(to, now)}`;

  return (
    <div className="rounded-3xl border border-line bg-surface px-4 py-4" aria-busy={status === "loading"}>
      <div role="radiogroup" aria-label="Use range" className="flex gap-1 rounded-full bg-surface-strong p-1">
        {OPEN_RANGES.map((option) => {
          const on = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(option.id, option.days)}
              className={cn(
                "inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-full text-[13px] font-medium transition-colors duration-150",
                on ? "bg-surface text-foreground shadow-sm" : "text-muted active:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block min-w-0">
          <span className="text-[12px] font-medium text-muted">From</span>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(event) => edit(event.target.value, to)}
            className="mt-1 block h-12 w-full min-w-0 rounded-2xl bg-background px-3 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-[12px] font-medium text-muted">To</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(event) => edit(from, event.target.value)}
            className="mt-1 block h-12 w-full min-w-0 rounded-2xl bg-background px-3 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        </label>
      </div>

      <div className={cn("mt-4 transition-opacity duration-150", status === "loading" && "opacity-50")} aria-live="polite">
        <p className="text-[13px] text-muted">{chosen ? "That day" : rangeLabel}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[44px] leading-none font-bold tracking-[-0.04em] tabular-nums">
              {opens.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-[13px] font-medium text-foreground">
              {opens === 1 ? "Time opened" : "Times opened"}
            </p>
          </div>
          <div>
            <p className="text-[22px] leading-none font-semibold tracking-[-0.03em] text-muted tabular-nums">
              {people.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-[13px] text-muted">{people === 1 ? "Unique account" : "Unique accounts"}</p>
          </div>
        </div>
        {report && report.people === 0 && report.opens === 0 && !chosen && status !== "loading" && (
          <p className="mt-3 text-[13px] text-muted">No one opened the app in this time.</p>
        )}
      </div>

      {notice && (
        <div className="mt-3 text-[13px] text-danger" role="alert">
          <p>{notice}</p>
          {status === "error" && (
            <button
              type="button"
              onClick={() => void load(from, to)}
              className="mt-2 font-medium text-foreground underline decoration-line underline-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {length > 1 && (report?.opens ?? 0) > 0 && (
        <>
          <div className="mt-4 flex gap-3">
            <div
              className="flex w-6 shrink-0 flex-col justify-between pb-px text-right text-[11px] text-muted tabular-nums"
              aria-hidden
            >
              <span>{peak}</span>
              <span>0</span>
            </div>
            <div
              ref={plot}
              role="group"
              tabIndex={0}
              aria-label={`Opens per day, ${countLabel(report?.opens ?? 0, "open", "opens")} from ${countLabel(report?.people ?? 0, "account", "accounts")}. Use the arrow keys to read each day.`}
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
              {days.map((entry, position) => (
                <span key={entry.day} className="relative flex h-full min-w-0 flex-1 items-end">
                  <span
                    className={cn(
                      "h-full w-full origin-bottom rounded-t-[3px] bg-foreground transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
                      index !== null && index !== position && "opacity-30",
                      entry.opens === 0 && index === null && "opacity-15",
                    )}
                    style={{ transform: `scaleY(${entry.opens === 0 ? 0.03 : Math.max(0.06, entry.opens / peak)})` }}
                  />
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between pl-9 text-[12px] text-muted" aria-hidden>
            {ticks.map((position, slot) => (
              <span key={slot}>{position === length - 1 && to === today ? "Today" : formatDay(days[position]?.day ?? "", now)}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
