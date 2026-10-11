"use client";

import { useLocale } from "@/components/locale-provider";

/** The usual wait for this lane at this hour. Blank when CBP has no average. */
export function AverageWait({
  minutes,
  className,
}: {
  minutes: number | null;
  className?: string;
}) {
  const { copy } = useLocale();
  if (minutes === null) return null;

  return (
    <span className={className}>
      <span className="sr-only">{copy.averageLabel(minutes)}</span>
      <span aria-hidden>{copy.averageShort(minutes)}</span>
    </span>
  );
}
