"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import type { Trend } from "@/lib/lane-averages";

/**
 * Where the wait is expected to go. Up is red, down is green, and a dash means about the same.
 * The shape carries the direction and the color repeats it. A `chip` puts it on a light disc so it
 * reads on any card color.
 */
export function TrendMark({
  trend,
  chip = false,
  className,
}: {
  trend: Trend;
  chip?: boolean;
  className?: string;
}) {
  const { copy } = useLocale();
  return (
    <span
      role="img"
      aria-label={copy.trendLabel[trend]}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full",
        chip ? "size-6 bg-white/90 shadow-sm" : "size-4",
        trend === "up" && "text-rose-500",
        trend === "down" && "text-emerald-500",
        trend === "steady" && "text-zinc-500",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={chip ? "size-4" : "size-3.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {trend === "up" && <path d="M10 16V4m-5 5 5-5 5 5" />}
        {trend === "down" && <path d="M10 4v12m-5-5 5 5 5-5" />}
        {trend === "steady" && <path d="M4 10h12" />}
      </svg>
    </span>
  );
}

/** "in 30 min · now 22 min". Wraps on a long wait rather than hiding the live number. */
export function OutlookCaption({ live, className }: { live: number; className?: string }) {
  const { copy } = useLocale();
  return <span className={className}>{copy.outlookCaption(live)}</span>;
}
