"use client";

import { cn } from "@/lib/cn";
import { useLocale } from "@/components/locale-provider";
import { motion, useReducedMotion } from "motion/react";
import { HapticPad } from "./haptic-pad";
import { haptic } from "@/lib/haptics";
import { SPRING } from "./motion";

/** Shows the language you will switch to, so it stays findable in either language. */
export function LanguageSwitch({
  variant = "button",
  className,
}: {
  variant?: "button" | "menu";
  className?: string;
}) {
  const { locale, copy, setLocale } = useLocale();
  const reduce = useReducedMotion();
  const next = locale === "en" ? "es" : "en";
  const label = locale === "en" ? copy.languageToSpanish : copy.languageToEnglish;

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          haptic("selection");
          setLocale(next);
        }}
        aria-label={label}
        className={cn(
          "relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-medium",
          className,
        )}
      >
        <HapticPad />
        <span
          aria-hidden
          className="grid w-5 shrink-0 place-items-center text-[12px] font-semibold tracking-[0.06em]"
        >
          {next === "es" ? "ES" : "EN"}
        </span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic("selection");
        setLocale(next);
      }}
      aria-label={label}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={SPRING.snap}
      className={cn(
        "grid h-11 min-w-11 shrink-0 place-items-center rounded-full bg-surface px-3 text-[13px] font-semibold tracking-[0.06em] text-foreground",
        className,
      )}
    >
      <HapticPad />
      {next === "es" ? "ES" : "EN"}
    </motion.button>
  );
}
