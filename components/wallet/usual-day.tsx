"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { quietestWindow } from "@/lib/lane-averages";
import { TONE_DOT, toneForMinutes } from "@/lib/ports";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const BAR_H = 64;

/** "7 AM" or "7 a. m.", with no minutes, so a day of hours stays short. */
function hourName(hour: number, locale: "en" | "es"): string {
  const parts = new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    timeZone: "UTC",
    hour: "numeric",
  }).formatToParts(new Date(Date.UTC(2000, 0, 1, hour)));
  const period = parts.find((part) => part.type === "dayPeriod")?.value;
  const digits = parts.find((part) => part.type === "hour")?.value ?? String(hour);
  return period ? `${digits} ${period}` : digits;
}
const TICKS = [0, 6, 12, 18] as const;
const SKEL = [18, 32, 48, 40, 28, 22, 16, 20, 26, 30, 34, 28, 24, 36, 44, 50, 42, 32, 26, 22, 18, 24, 16, 14];

type Props = {
  /** Usual wait for hours 0 through 23. Null means CBP left that hour blank. */
  hours: readonly (number | null)[] | undefined;
  high?: readonly (number | null)[];
  /** Hour at the port right now. Null when the live clock is missing. */
  nowHour: number | null;
  /** Lane name, so the chart says which wait it is drawing. */
  lane: string;
  pending: boolean;
  failed: boolean;
  /** Sits inside another surface, so it uses the stronger fill. */
  inset?: boolean;
};

/**
 * One usual day for a lane. Bars are CBP's historical average, not today's wait.
 * A drag reads the hour under the finger. The line above stays the quietest stretch.
 */
export function UsualDay({ hours, high, nowHour, lane, pending, failed, inset = false }: Props) {
  const { locale, copy } = useLocale();
  const known = hours?.some((value) => value != null) ?? false;
  const surface = inset ? "bg-surface-strong" : "bg-surface";

  if (pending && !known) {
    return (
      <section className={cn("rounded-2xl px-4 pt-4 pb-3", surface)} aria-busy="true">
        <p className="sr-only">{copy.usualLoading}</p>
        <div className="motion-safe:animate-pulse">
          <div className="h-3.5 w-24 rounded-full bg-foreground/10" />
          <div className="mt-2 h-4 w-48 max-w-full rounded-full bg-foreground/10" />
          <div className="mt-2 h-3.5 w-36 rounded-full bg-foreground/10" />
          <div className="mt-4 flex h-16 items-end gap-[3px]">
            {SKEL.map((height, hour) => (
              <span key={hour} className="flex min-w-0 flex-1 justify-center">
                <span
                  className="block w-full max-w-[10px] rounded-full bg-foreground/10"
                  style={{ height }}
                />
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (failed || !hours || !known) {
    return (
      <section className={cn("rounded-2xl px-4 py-3.5", surface)}>
        <p className="text-[13px] font-medium text-muted">{lane}</p>
        <p className="mt-1 text-[15px] leading-snug tracking-[-0.02em]">
          {failed ? copy.usualUnavailable : copy.usualEmpty}
        </p>
      </section>
    );
  }

  return (
    <DayChart
      hours={hours}
      high={high}
      nowHour={nowHour}
      lane={lane}
      inset={inset}
      locale={locale}
    />
  );
}

function DayChart({
  hours,
  high,
  nowHour,
  lane,
  inset,
  locale,
}: {
  hours: readonly (number | null)[];
  high?: readonly (number | null)[];
  nowHour: number | null;
  lane: string;
  inset: boolean;
  locale: "en" | "es";
}) {
  const { copy } = useLocale();
  const quiet = quietestWindow(hours);
  const fallback = nowHour != null && hours[nowHour] != null ? nowHour : (quiet?.start ?? 0);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? fallback;
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; locked: boolean; pointer: number } | null>(null);

  const max = Math.max(1, ...hours.map((value) => value ?? 0));
  const time = (hour: number) => hourName(hour, locale);
  const headline = !quiet
    ? copy.usualEmpty
    : quiet.flat
      ? copy.usualFlat(quiet.minutes)
      : quiet.start === quiet.end
        ? copy.usualQuietAt(time(quiet.start), quiet.minutes)
        : copy.usualQuietFrom(time(quiet.start), time(quiet.end), quiet.minutes);

  const minutes = hours[selected] ?? null;
  const peak = high?.[selected] ?? null;
  const upTo = minutes != null && peak != null && peak > minutes;
  const showingNow = picked == null && selected === nowHour;
  const detail =
    minutes == null
      ? showingNow
        ? copy.usualNowNone
        : copy.usualNone(time(selected))
      : showingNow
        ? upTo
          ? copy.usualNowUpTo(minutes, peak)
          : copy.usualNow(minutes)
        : upTo
          ? copy.usualAtUpTo(time(selected), minutes, peak)
          : copy.usualAt(time(selected), minutes);

  function choose(next: number) {
    if (selectedRef.current === next) return;
    selectedRef.current = next;
    haptic("selection");
    setPicked(next);
  }

  function hourAt(clientX: number): number {
    const node = track.current;
    if (!node) return selectedRef.current;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) return selectedRef.current;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(23, Math.max(0, Math.floor(ratio * 24)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      locked: false,
      pointer: event.pointerId,
    };
    if (event.pointerType !== "touch") {
      drag.current.locked = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      choose(hourAt(event.clientX));
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointer) return;
    if (!state.locked) {
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      state.locked = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    choose(hourAt(event.clientX));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state || event.pointerId !== state.pointer || state.locked) return;
    choose(hourAt(event.clientX));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next = selectedRef.current;
    if (event.key === "ArrowRight") next = Math.min(23, next + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, next - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 23;
    else return;
    event.preventDefault();
    choose(next);
  }

  return (
    <section className={cn("rounded-2xl px-4 pt-4 pb-3", inset ? "bg-surface-strong" : "bg-surface")}>
      <p className="text-[13px] font-medium text-muted">{lane}</p>
      <p className="mt-1 text-[15px] leading-snug font-semibold tracking-[-0.02em]">{headline}</p>
      <p className="mt-1 min-h-5 text-[13px] leading-5 text-muted tabular-nums">{detail}</p>

      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={`${copy.usualChart}, ${lane}`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={23}
        aria-valuenow={selected}
        aria-valuetext={detail}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClick={(event) => choose(hourAt(event.clientX))}
        onKeyDown={onKeyDown}
        className="mt-4 touch-pan-y rounded-lg outline-offset-4"
      >
        <div className="flex gap-[3px] border-b border-line">
          {hours.map((value, hour) => {
            const active = hour === selected;
            const height =
              value == null ? 0 : Math.max(value === 0 ? 3 : 4, Math.round((value / max) * BAR_H));
            return (
              <div key={hour} className="flex h-16 min-w-0 flex-1 items-end justify-center">
                {value != null && (
                  <span
                    aria-hidden
                    style={{ height, ["--i" as string]: hour }}
                    className={cn(
                      "usual-bar block w-full max-w-[10px] rounded-full",
                      TONE_DOT[toneForMinutes(value)],
                      active ? "opacity-100" : "opacity-45",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[3px]">
          {hours.map((_, hour) => (
            <span key={hour} className="flex h-0.5 min-w-0 flex-1 justify-center">
              <span
                aria-hidden
                className={cn("h-0.5 w-2 rounded-full", hour === nowHour ? "bg-foreground" : "opacity-0")}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-1 h-4">
        {TICKS.map((hour) => (
          <span
            key={hour}
            className="absolute text-[11px] leading-none text-muted tabular-nums"
            style={
              hour === 0
                ? { left: 0 }
                : { left: `${((hour + 0.5) / 24) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            {copy.usualTick(hour)}
          </span>
        ))}
      </div>
    </section>
  );
}
