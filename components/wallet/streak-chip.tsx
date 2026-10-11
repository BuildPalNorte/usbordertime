"use client";

import { useLocale } from "@/components/locale-provider";
import { FireIcon, type FireIconHandle } from "@heroicons-animated/react/fire";
import { RocketLaunchIcon, type RocketLaunchIconHandle } from "@heroicons-animated/react/rocket-launch";
import { SparklesIcon, type SparklesIconHandle } from "@heroicons-animated/react/sparkles";
import { StarIcon, type StarIconHandle } from "@heroicons-animated/react/star";
import { TrophyIcon, type TrophyIconHandle } from "@heroicons-animated/react/trophy";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { nextMilestone, streakLevel } from "@/lib/streak";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { useStreak } from "./use-streak";

type Handle = { startAnimation: () => void; stopAnimation: () => void };

/** One color per level, readable on both the light and the dark surface. */
export const LEVEL_COLOR: readonly string[] = [
  "#f59e0b", // Spark
  "#f97316", // Flame
  "#ef4444", // Blaze
  "#8b5cf6", // Rocket
  "#eab308", // Star
  "#ec4899", // Legend
];

type IconProps = { size: number; level: number; handle: React.Ref<Handle> };

/** The icon for a level. It grows from a spark to a trophy as the streak does. */
export function LevelIcon({ size, level, handle }: IconProps) {
  switch (level) {
    case 0:
      return <SparklesIcon ref={handle as React.Ref<SparklesIconHandle>} size={size} aria-hidden />;
    case 1:
    case 2:
      return <FireIcon ref={handle as React.Ref<FireIconHandle>} size={size} aria-hidden />;
    case 3:
      return (
        <RocketLaunchIcon ref={handle as React.Ref<RocketLaunchIconHandle>} size={size} aria-hidden />
      );
    case 4:
      return <StarIcon ref={handle as React.Ref<StarIconHandle>} size={size} aria-hidden />;
    default:
      return <TrophyIcon ref={handle as React.Ref<TrophyIconHandle>} size={size} aria-hidden />;
  }
}

/** Plays the icon's own animation now, then every few seconds. Still when motion is reduced. */
export function useIconLoop(level: number, replay: unknown) {
  const reduce = useReducedMotion();
  const handle = useRef<Handle>(null);

  useEffect(() => {
    if (reduce) return;
    const play = () => handle.current?.startAnimation();
    const first = window.setTimeout(play, 350);
    const loop = window.setInterval(play, 4200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, [reduce, level, replay]);

  return handle;
}

/** Header button: the level icon in its color. A tap opens the day count. Hidden until a streak exists. */
export function StreakChip({ className }: { className?: string }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const streak = useStreak();
  const current = streak?.current ?? 0;
  const level = streakLevel(current);
  const color = LEVEL_COLOR[level] ?? LEVEL_COLOR[0];
  const handle = useIconLoop(level, current);
  const name = copy.streakLevels[level] ?? "";
  const goal = nextMilestone(current);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence initial={false}>
      {current > 0 && (
        <motion.div
          key="streak-chip"
          ref={rootRef}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          transition={SPRING.pop}
          className={cn("relative", className)}
        >
          <motion.button
            ref={buttonRef}
            type="button"
            aria-label={copy.streakDays(current)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? menuId : undefined}
            onClick={() => {
              haptic("selection");
              setOpen((value) => !value);
            }}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={SPRING.snap}
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
            }}
            className="relative grid size-11 place-items-center rounded-full"
          >
            <HapticPad />
            <motion.span
              key={level}
              initial={reduce || !streak?.advanced ? false : { scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={SPRING.pop}
              className="grid place-items-center"
            >
              <LevelIcon size={20} level={level} handle={handle} />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {open && (
              <motion.div
                id={menuId}
                role="dialog"
                aria-label={copy.streakDays(current)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={SPRING.snap}
                className="glass absolute top-[calc(100%+0.5rem)] right-0 z-30 w-60 origin-top-right rounded-2xl px-3.5 py-3"
              >
                <p className="text-[15px] leading-tight font-semibold">
                  {copy.streakDays(current)}
                  <span className="ml-1.5 text-[12px] font-semibold" style={{ color }}>
                    {name}
                  </span>
                </p>
                <p className="mt-1 text-[12px] leading-snug text-muted">
                  {current === 1 ? copy.streakStart : copy.streakDetail(streak?.longest ?? 0, streak?.totalDays ?? 0)}
                </p>
                {current > 1 && goal !== null && (
                  <p className="text-[12px] leading-snug text-muted">{copy.streakNext(goal - current, goal)}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
