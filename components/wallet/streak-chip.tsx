"use client";

import { FireIcon, type FireIconHandle } from "@heroicons-animated/react/fire";
import { RocketLaunchIcon, type RocketLaunchIconHandle } from "@heroicons-animated/react/rocket-launch";
import { SparklesIcon, type SparklesIconHandle } from "@heroicons-animated/react/sparkles";
import { StarIcon, type StarIconHandle } from "@heroicons-animated/react/star";
import { TrophyIcon, type TrophyIconHandle } from "@heroicons-animated/react/trophy";
import { haptic } from "@/lib/haptics";
import { streakLevel } from "@/lib/streak";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

/** Streak results already celebrated, so a remount does not replay them. */
const celebrated = new WeakMap<object, number>();
const DOTS = [0, 60, 120, 180, 240, 300];

/** A soft ring and a few dots that drift outward once. Reduced motion gets only the ring fading. */
function Celebration({ color, reduce, burst }: { color: string; reduce: boolean; burst: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      <motion.span
        key={`ring-${burst}`}
        initial={{ opacity: 0.55, scale: 0.9 }}
        animate={{ opacity: 0, scale: reduce ? 1.1 : 1.7 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        style={{ borderColor: color }}
        className="absolute inset-0 rounded-full border-2"
      />
      {!reduce &&
        DOTS.map((angle) => (
          <motion.span
            key={`${burst}-${angle}`}
            initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos((angle * Math.PI) / 180) * 26,
              y: Math.sin((angle * Math.PI) / 180) * 26,
              scale: 0.3,
            }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            style={{ backgroundColor: color }}
            className="absolute size-1.5 rounded-full"
          />
        ))}
    </span>
  );
}

/**
 * The level icon, sitting on the profile button. Hidden until a streak exists.
 * A new day still pops the icon and sends the ring out from the button.
 * The day count itself is in the profile menu.
 */
export function StreakBadge() {
  const reduce = useReducedMotion();
  const streak = useStreak();
  const current = streak?.current ?? 0;
  const level = streakLevel(current);
  const color = LEVEL_COLOR[level] ?? LEVEL_COLOR[0];
  const handle = useIconLoop(level, current);
  const [burst, setBurst] = useState(0);

  // Celebrate each time a visit moves the streak forward (the dev picker does too).
  useEffect(() => {
    if (!streak?.advanced || streak.current < 1) return;
    const seen = celebrated.get(streak);
    const now = Date.now();
    if (seen !== undefined && now - seen > 1500) return;
    celebrated.set(streak, seen ?? now);
    const start = window.setTimeout(() => {
      haptic("success");
      setBurst((value) => value + 1);
    }, 400);
    const end = window.setTimeout(() => setBurst(0), 1400);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [streak]);

  return (
    <AnimatePresence initial={false}>
      {current > 0 && (
        <motion.span
          key="streak-badge"
          aria-hidden
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          transition={SPRING.pop}
          className="pointer-events-none absolute inset-0"
        >
          <motion.span
            key={level}
            initial={reduce || !streak?.advanced ? false : { scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING.pop}
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 18%, var(--surface))`,
            }}
            className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full ring-2 ring-background"
          >
            <LevelIcon size={13} level={level} handle={handle} />
          </motion.span>
          {burst > 0 && <Celebration color={color} reduce={!!reduce} burst={burst} />}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
