"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import type { FeedSource } from "@/lib/ports";
import { useId, useState } from "react";
import { HapticPad } from "./haptic-pad";

export type CameraTone = "fresh" | "stale" | "offline" | "idle";

const TONE_DOT: Record<CameraTone, string | null> = {
  fresh: "bg-emerald-400",
  stale: "bg-amber-400",
  offline: "bg-rose-400",
  idle: null,
};

/**
 * The strip under every camera picture: what you are looking at, how fresh it is, and an i button
 * that opens who provides it. It sits on the card surface, so it follows the theme. The panel
 * opens on press and can be closed again at any moment.
 */
export function CameraBar({
  title,
  caption,
  tone,
  source,
}: {
  title: string;
  caption: string;
  tone: CameraTone;
  source: FeedSource;
}) {
  const { copy } = useLocale();
  const [open, setOpen] = useState(false);
  const panel = useId();
  const dot = TONE_DOT[tone];

  return (
    <div className="px-3.5 pt-3 pb-3.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-tight font-semibold tracking-[-0.01em]">
            {title}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-none text-muted">
            {dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
            <span className="truncate tabular-nums">{caption}</span>
          </p>
        </div>

        <button
          type="button"
          aria-label={copy.cameraSource}
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => {
            haptic("selection");
            setOpen((value) => !value);
          }}
          className={cn(
            "relative grid size-9 shrink-0 place-items-center rounded-full bg-surface-strong",
            "transition-[color,transform] duration-150 ease-out active:scale-95 motion-reduce:transition-none",
            open ? "text-accent" : "text-muted",
          )}
        >
          <HapticPad />
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <circle cx="10" cy="10" r="7.25" />
            <path d="M10 9.25v4.25" />
            <circle cx="10" cy="6.4" r="0.55" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      <div
        id={panel}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-surface-strong p-3">
            <div className="min-w-0">
              <p className="text-[12px] leading-none text-muted">{copy.cameraSource}</p>
              <a
                href={source.page}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-[15px] leading-snug font-medium active:opacity-60"
              >
                {source.provider}
              </a>
            </div>
            <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] leading-none font-medium text-muted">
              {source.official ? copy.cameraOfficial : copy.cameraThirdParty}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
