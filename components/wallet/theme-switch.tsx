"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import { themeStore } from "@/lib/theme-store";
import { cn } from "@/lib/cn";
import { motion, useReducedMotion } from "motion/react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

/**
 * Shows the appearance you will switch to.
 * Which icon and name are visible is decided in CSS, so the first paint
 * matches the system scheme before this component hydrates.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic("selection");
        themeStore.toggle();
      }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={SPRING.snap}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full bg-surface text-foreground",
        className,
      )}
    >
      <HapticPad />
      <span className="theme-for-dark sr-only">{copy.themeToLight}</span>
      <span className="theme-for-light sr-only">{copy.themeToDark}</span>
      <span className="grid size-5 place-items-center" aria-hidden>
        <SunIcon className="theme-for-dark col-start-1 row-start-1 size-5" />
        <MoonIcon className="theme-for-light col-start-1 row-start-1 size-5" />
      </span>
    </motion.button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}
