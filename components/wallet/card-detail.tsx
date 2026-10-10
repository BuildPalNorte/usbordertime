"use client";

import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import {
  lanesText,
  MODE_IDS,
  modeLabel,
  readLane,
  TONE_DOT,
  type Mode,
} from "@/lib/ports";
import { TrashIcon } from "@heroicons-animated/react/trash";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { SPRING } from "./motion";

type Props = {
  port: PortWaitTime;
  mode: Mode;
  onMode: (mode: Mode) => void;
  onRemove: () => void;
};

export function CardDetail({ port, mode, onMode, onRemove }: Props) {
  const reduce = useReducedMotion();
  const trash = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
  const selected = readLane(port, mode);
  // Only offer lane types this crossing actually publishes. The saved lane always stays selectable.
  const lanes = MODE_IDS.filter((id) => id === mode || readLane(port, id).available);

  return (
    <div className="space-y-3 pt-1">
      <div role="radiogroup" aria-label="Lane type" className="grid grid-cols-2 gap-2.5">
        {lanes.map((id, index) => {
          const reading = readLane(port, id);
          const active = id === mode;
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onMode(id)}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.move, delay: reduce ? 0 : 0.05 + index * 0.04 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="relative rounded-2xl bg-surface px-3.5 py-3 text-left"
            >
              {active && (
                <motion.span
                  layoutId="lane-ring"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent"
                  transition={SPRING.snap}
                />
              )}
              <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted">
                {modeLabel(id, port)}
                {reading.minutes !== null && (
                  <span className={cn("size-1.5 rounded-full", TONE_DOT[reading.tone])} />
                )}
              </span>
              <span className="mt-1.5 block text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {reading.minutes !== null ? (
                  <>
                    {reading.minutes}
                    <span className="ml-1 text-[13px] font-medium tracking-normal text-muted">
                      min
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] tracking-[-0.01em]">{reading.statusText}</span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-[12px] leading-none text-muted">
                {reading.available ? lanesText(reading) : "Not published here"}
              </span>
            </motion.button>
          );
        })}
      </div>

      {port.constructionNotice && (
        <p className="rounded-2xl bg-surface px-4 py-3 text-[13px] leading-snug text-foreground">
          {port.constructionNotice}
        </p>
      )}

      <dl className="rounded-2xl bg-surface px-4 py-1 text-[14px]">
        <Row label="Status" value={port.portStatus || "Unknown"} />
        <Row label="Hours" value={port.hours || "Unavailable"} />
        <Row
          label="Reported"
          value={selected.reportedAt ?? `${port.time.slice(0, 5)} local`}
        />
      </dl>

      <button
        type="button"
        onClick={onRemove}
        onPointerEnter={() => trash.current?.startAnimation()}
        onPointerLeave={() => trash.current?.stopAnimation()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-medium text-danger transition-transform active:scale-[0.98]"
      >
        <TrashIcon ref={trash} size={18} aria-hidden />
        Remove from wallet
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
