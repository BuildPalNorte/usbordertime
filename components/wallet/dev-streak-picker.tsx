"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import { LEVEL_STARTS, streakLevel } from "@/lib/streak";
import { useQueryClient } from "@tanstack/react-query";
import { LEVEL_COLOR, LevelIcon } from "./streak-chip";
import { STREAK_KEY, useStreak } from "./use-streak";

/**
 * Development only. Jumps the streak to the start of any level so every chip can be seen. It
 * changes the browser's copy only, and the next counted visit replaces it with the real streak.
 */
export function DevStreakPicker() {
  const { copy } = useLocale();
  const queryClient = useQueryClient();
  const streak = useStreak();
  const active = streak && streak.current > 0 ? streakLevel(streak.current) : -1;

  const pick = (current: number) => {
    haptic("selection");
    queryClient.setQueryData(STREAK_KEY, {
      current,
      longest: Math.max(current, streak?.longest ?? 0),
      totalDays: Math.max(current, streak?.totalDays ?? 0),
      lastDay: streak?.lastDay ?? null,
      today: true,
      advanced: true,
    });
  };

  return (
    <div className="mx-2 mb-1 rounded-xl border border-dashed border-line px-2 py-2">
      <p className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Dev · streak levels
      </p>
      <div className="grid grid-cols-6 gap-1">
        {LEVEL_STARTS.map((start, level) => (
          <button
            key={start}
            type="button"
            title={`${copy.streakLevels[level]} · ${start}`}
            aria-label={`${copy.streakLevels[level]}, ${copy.streakDays(start)}`}
            aria-pressed={active === level}
            onClick={() => pick(start)}
            style={{
              color: LEVEL_COLOR[level],
              backgroundColor:
                active === level
                  ? `color-mix(in srgb, ${LEVEL_COLOR[level]} 22%, transparent)`
                  : undefined,
            }}
            className="grid h-10 place-items-center rounded-lg active:opacity-60"
          >
            <LevelIcon size={20} level={level} handle={null} />
          </button>
        ))}
      </div>
    </div>
  );
}
