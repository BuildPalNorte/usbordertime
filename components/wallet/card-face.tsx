"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { lanesLabel, modeName, placeSubtitle, presentHours, waitLabel } from "@/lib/i18n";
import { cardBackground, paletteFor, portName, readLane, TONE_DOT, type Mode } from "@/lib/ports";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import type { PointerEvent } from "react";
import { CARD_H } from "./motion";
import { WaitNumber } from "./wait-number";

/**
 * The physical card. The top ~76px is the "peek" that stays visible when cards stack,
 * so the name and the live wait must both live up there.
 */
export function CardFace({ port, mode }: { port: PortWaitTime; mode: Mode }) {
  const { locale, copy } = useLocale();
  const palette = paletteFor(port.portNumber);
  const name = portName(port);
  const reading = readLane(port, mode);
  const light = palette.ink === "light";

  // Pointer-tracked sheen lives in motion values so moving the mouse never re-renders React.
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(0);
  const sheen = useMotionTemplate`radial-gradient(360px circle at ${sheenX}% ${sheenY}%, ${
    light ? "rgb(255 255 255 / 0.17)" : "rgb(255 255 255 / 0.5)"
  }, transparent 62%)`;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    sheenX.set(((event.clientX - rect.left) / rect.width) * 100);
    sheenY.set(((event.clientY - rect.top) / rect.height) * 100);
  }

  return (
    <div
      onPointerMove={onPointerMove}
      className={cn(
        "group relative w-full select-none overflow-hidden rounded-3xl p-[18px]",
        light ? "text-white" : "text-[#10131a]",
      )}
      style={{
        height: CARD_H,
        background: cardBackground(palette),
        // Tinted shadow, with an upward cast so the card edge reads against the card behind it.
        boxShadow: `0 -14px 28px -18px ${palette.to}cc, 0 22px 40px -22px ${palette.to}, inset 0 1px 0 rgb(255 255 255 / ${light ? 0.22 : 0.7})`,
      }}
    >
      {/* Fine diagonal guilloche-style lines. Pure CSS texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${
            light ? "rgb(255 255 255 / 0.04)" : "rgb(0 0 0 / 0.045)"
          } 0 1px, transparent 1px 7px)`,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: sheen }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[19px] leading-[1.15] font-semibold tracking-[-0.02em]">
            {name.title}
          </p>
          <p className="mt-1 truncate text-[13px] leading-none opacity-[0.72]">
            {placeSubtitle(name, copy)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {reading.minutes !== null ? (
            <>
              <p className="flex items-baseline justify-end gap-1">
                <WaitNumber
                  key={mode}
                  value={reading.minutes}
                  className="text-[36px] leading-none font-semibold tracking-[-0.045em]"
                />
                <span className="text-[13px] font-medium opacity-[0.72]">{copy.minuteUnit}</span>
              </p>
              <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] leading-none font-medium opacity-[0.85]">
                <span className={cn("size-1.5 rounded-full", TONE_DOT[reading.tone])} />
                {copy.tone[reading.tone]}
              </p>
            </>
          ) : (
            <p className="pt-1 text-[16px] leading-tight font-semibold tracking-[-0.01em]">
              {waitLabel(reading, copy)}
            </p>
          )}
        </div>
      </div>

      <div className="absolute inset-x-[18px] bottom-[18px] flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] leading-none font-medium tracking-[0.01em] opacity-[0.72]">
            {modeName(mode, port, copy)}
          </p>
          <p className="mt-1.5 truncate text-[14px] leading-none font-medium">
            {lanesLabel(reading, copy)}
          </p>
        </div>
        <p className="shrink-0 text-right text-[12px] leading-none font-medium opacity-[0.72]">
          {presentHours(port.hours, locale, copy)}
        </p>
      </div>
    </div>
  );
}
