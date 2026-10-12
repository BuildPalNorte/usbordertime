"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import {
  lanesLabel,
  modeName,
  presentClock,
  presentHours,
  presentPortStatus,
  waitLabel,
} from "@/lib/i18n";
import { crossingStream, MODE_IDS, portName, readLane, TONE_DOT, type Mode } from "@/lib/ports";
import { hourFromClock } from "@/lib/lane-averages";
import { AverageWait } from "./average-wait";
import { UsualDay } from "./usual-day";
import { useCameraStreams } from "./camera-streams";
import { CrossingCamera } from "./crossing-camera";
import { CrossingFeeds } from "./crossing-feeds";
import { shownAverage, useLaneAverages } from "./use-lane-averages";
import { BookmarkIcon, type BookmarkIconHandle } from "@heroicons-animated/react/bookmark";
import { TrashIcon } from "@heroicons-animated/react/trash";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { HapticPad } from "./haptic-pad";
import { WaitDuration } from "./wait-duration";
import { haptic } from "@/lib/haptics";
import { SPRING } from "./motion";

type Props = {
  port: PortWaitTime;
  mode: Mode;
  cityPinned: boolean;
  onMode: (mode: Mode) => void;
  onPinCity: () => void;
  onRemove: () => void;
};

export function CardDetail({ port, mode, cityPinned, onMode, onPinCity, onRemove }: Props) {
  const { locale, copy } = useLocale();
  const reduce = useReducedMotion();
  const bookmark = useRef<BookmarkIconHandle>(null);
  const trash = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const { streams } = useCameraStreams();
  const name = portName(port);
  const city = name.city;
  const stream = crossingStream(port, streams);
  const selected = readLane(port, mode);
  const averages = useLaneAverages(port.portNumber);
  // Only offer lane types this crossing actually publishes. The saved lane always stays selectable.
  const lanes = MODE_IDS.filter((id) => id === mode || readLane(port, id).available);

  return (
    <div className="space-y-3 pt-1 select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
      {stream ? (
        <div data-tour="detail-camera">
          <CrossingCamera
            src={stream.src}
            alias={stream.alias}
            name={name.title}
            info={stream.source}
          />
        </div>
      ) : (
        <CrossingFeeds port={port} name={name.title} />
      )}
      <div
        role="radiogroup"
        aria-label={copy.laneType}
        data-tour="detail-lanes"
        className="grid grid-cols-2 gap-2.5"
      >
        {lanes.map((id, index) => {
          const reading = readLane(port, id);
          const average = shownAverage(averages.data, id, port.time, reading.available);
          const active = id === mode;
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (active) return;
                haptic("selection");
                onMode(id);
              }}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                ...SPRING.move,
                delay: reduce ? 0 : 0.05 + index * 0.04,
              }}
              className="relative touch-pan-y rounded-2xl bg-surface px-3.5 py-3 text-left select-none"
            >
              {!active && <HapticPad />}
              {active && (
                <motion.span
                  layoutId="lane-ring"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-accent"
                  transition={SPRING.snap}
                />
              )}
              <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted">
                {modeName(id, port, copy)}
                {reading.minutes !== null && (
                  <span className={cn("size-1.5 rounded-full", TONE_DOT[reading.tone])} />
                )}
              </span>
              <span className="mt-1.5 block text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {reading.minutes !== null ? (
                  <WaitDuration
                    minutes={reading.minutes}
                    unitClassName="text-[13px] font-medium tracking-normal text-muted"
                  />
                ) : (
                  <span className="text-[15px] tracking-[-0.01em]">{waitLabel(reading, copy)}</span>
                )}
              </span>
              <AverageWait
                minutes={average}
                className="mt-1.5 block text-[12px] leading-none font-medium text-muted tabular-nums"
              />
              <span className="mt-1.5 block truncate text-[12px] leading-none text-muted">
                {reading.available ? lanesLabel(reading, copy) : copy.notPublished}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div data-tour="detail-usual">
        <UsualDay
          hours={averages.data?.hours[mode]}
          high={averages.data?.high?.[mode]}
          nowHour={hourFromClock(port.time)}
          lane={modeName(mode, port, copy)}
          pending={averages.isLoading}
          failed={averages.isError}
        />
      </div>

      {port.constructionNotice && (
        <div className="rounded-2xl bg-surface px-4 py-3">
          {locale === "es" && (
            <p className="mb-1 text-[12px] leading-none text-muted">{copy.cbpNotice}</p>
          )}
          <p className="text-[13px] leading-snug text-foreground">{port.constructionNotice}</p>
        </div>
      )}

      <dl className="rounded-2xl bg-surface px-4 py-1 text-[14px]">
        <Row label={copy.status} value={presentPortStatus(port.portStatus, copy)} />
        <Row label={copy.hours} value={presentHours(port.hours, locale, copy)} />
        <Row
          label={copy.reported}
          value={
            selected.reportedAt
              ? presentClock(selected.reportedAt, locale)
              : copy.localTime(port.time.slice(0, 5))
          }
        />
      </dl>

      <button
        type="button"
        aria-pressed={cityPinned}
        onClick={onPinCity}
        onPointerEnter={() => bookmark.current?.startAnimation()}
        onPointerLeave={() => bookmark.current?.stopAnimation()}
        className={cn(
          "relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-medium transition-transform active:scale-[0.98]",
          cityPinned ? "text-accent" : "text-foreground",
        )}
      >
        <HapticPad />
        <BookmarkIcon
          ref={bookmark}
          size={18}
          aria-hidden
          className={cityPinned ? "[&_svg]:fill-current" : undefined}
        />
        {cityPinned ? copy.removeBookmark(city) : copy.bookmark(city)}
      </button>

      <button
        type="button"
        onClick={onRemove}
        onPointerEnter={() => trash.current?.startAnimation()}
        onPointerLeave={() => trash.current?.stopAnimation()}
        className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-medium text-danger transition-transform active:scale-[0.98]"
      >
        <HapticPad />
        <TrashIcon ref={trash} size={18} aria-hidden />
        {copy.removeFromWallet}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
