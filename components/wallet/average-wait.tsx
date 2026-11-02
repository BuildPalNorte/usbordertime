"use client";

import { useLocale } from "@/components/locale-provider";

/** The usual wait for this lane at this hour, up to the high when CBP lists one. Blank when there is no average. */
export function AverageWait({
  wait,
  className,
}: {
  wait: { minutes: number; high: number | null } | null;
  className?: string;
}) {
  const { copy } = useLocale();
  if (!wait) return null;
  const { minutes, high } = wait;
  const ranged = high != null;

  return (
    <span className={className}>
      <span className="sr-only">
        {ranged ? copy.averageRangeLabel(minutes, high) : copy.averageLabel(minutes)}
      </span>
      <span aria-hidden>
        {ranged ? copy.averageRangeShort(minutes, high) : copy.averageShort(minutes)}
      </span>
    </span>
  );
}
