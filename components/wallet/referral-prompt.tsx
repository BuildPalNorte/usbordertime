"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { disablePush } from "@/lib/push-client";
import { REFERRALS, type Referral } from "@/lib/referral";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { HapticPad } from "./haptic-pad";
import { LanguageSwitch } from "./language-switch";
import { SPRING } from "./motion";
import { ThemeSwitch } from "./theme-switch";

/** Asks a new account how they found Border Time, then lets the bridges in. */
export function ReferralPrompt() {
  const { copy } = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState<Referral | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (!choice || busy) return;
    haptic("success");
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: choice }),
      });
      if (!response.ok) throw new Error("save");
      router.refresh();
    } catch {
      setBusy(false);
      setFailed(true);
      haptic("error");
    }
  };

  const signOut = () => {
    if (busy) return;
    haptic("light");
    setBusy(true);
    void (async () => {
      await disablePush();
      await authClient.signOut();
      window.location.assign("/");
    })();
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="rise shrink-0" style={{ "--i": 0 } as CSSProperties}>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
            {copy.referralTitle}
          </h1>
          <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-muted">{copy.referralBody}</p>
        </div>

        <div role="radiogroup" aria-label={copy.referralTitle} className="mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {REFERRALS.map((source, index) => {
            const active = choice === source;
            return (
              <div key={source} className="rise" style={{ "--i": index + 1 } as CSSProperties}>
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy}
                  onClick={() => {
                    if (active || busy) return;
                    haptic("selection");
                    setChoice(source);
                    setFailed(false);
                  }}
                  whileTap={reduce || busy ? undefined : { scale: 0.98 }}
                  transition={SPRING.snap}
                  className={cn(
                    "relative flex h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-[16px] font-medium",
                    active ? "bg-accent text-accent-ink" : "bg-surface text-foreground",
                    busy && !active && "opacity-50",
                  )}
                >
                  {!active && <HapticPad />}
                  <span className="truncate">{copy.referralOption[source]}</span>
                  {active && <Check />}
                </motion.button>
              </div>
            );
          })}
        </div>

        <div className="rise mt-4 shrink-0" style={{ "--i": REFERRALS.length + 1 } as CSSProperties}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!choice || busy}
            aria-busy={busy}
            className="relative h-12 w-full rounded-full bg-accent text-[16px] font-semibold text-accent-ink disabled:opacity-40"
          >
            <HapticPad />
            {busy ? copy.referralSaving : copy.referralContinue}
          </button>

          {failed && (
            <p className="mt-3 text-center text-[13px] leading-snug text-danger" role="alert">
              {copy.referralFailed}
            </p>
          )}

          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="mx-auto mt-4 block text-[13px] font-medium text-muted disabled:opacity-40"
          >
            {copy.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}
