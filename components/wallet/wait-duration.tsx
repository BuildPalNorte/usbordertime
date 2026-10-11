"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { durationParts } from "@/lib/i18n";
import { WaitNumber } from "./wait-number";

/**
 * A wait drawn as hours and minutes once it reaches an hour.
 * Under an hour it stays a minute count, matching the old cards.
 */
export function WaitDuration({
  minutes,
  checking = false,
  animate = false,
  className,
  numberClassName,
  unitClassName,
}: {
  minutes: number;
  checking?: boolean;
  animate?: boolean;
  className?: string;
  numberClassName?: string;
  unitClassName?: string;
}) {
  const { copy } = useLocale();
  const { hours, minutes: rest } = durationParts(minutes);

  return (
    <span className={cn("inline-flex items-baseline gap-x-1.5", className)}>
      {hours > 0 && (
        <DurationPart
          value={hours}
          unit={copy.hourUnit}
          animate={animate}
          checking={checking}
          numberClassName={numberClassName}
          unitClassName={unitClassName}
        />
      )}
      {(hours === 0 || rest > 0) && (
        <DurationPart
          value={rest}
          unit={copy.minuteUnit}
          animate={animate}
          checking={checking}
          numberClassName={numberClassName}
          unitClassName={unitClassName}
        />
      )}
    </span>
  );
}

function DurationPart({
  value,
  unit,
  animate,
  checking,
  numberClassName,
  unitClassName,
}: {
  value: number;
  unit: string;
  animate: boolean;
  checking: boolean;
  numberClassName?: string;
  unitClassName?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {animate ? (
        <WaitNumber value={value} checking={checking} className={numberClassName} />
      ) : (
        <span className={cn("tabular-nums", numberClassName)}>{value}</span>
      )}
      <span className={unitClassName}>{unit}</span>
    </span>
  );
}
