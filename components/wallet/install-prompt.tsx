"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import { installStore } from "@/lib/install-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

export function useInstall() {
  return useSyncExternalStore(
    installStore.subscribe,
    installStore.getSnapshot,
    installStore.getServerSnapshot,
  );
}

/**
 * A quiet card above the bridges on a phone: add Border Time to the Home Screen.
 * It never shows once the app runs from the Home Screen, and "Not now" holds it back for two weeks.
 */
export function InstallBanner() {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const install = useInstall();
  const visible = install.offerable && !install.dismissed;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key="install"
          aria-label={copy.installTitle}
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={SPRING.snap}
          className="overflow-hidden lg:hidden"
        >
          <div className="mb-4 flex items-center gap-3 rounded-3xl bg-surface p-3 pr-2">
            <Image
              src="/icon-192.png"
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-tight font-semibold tracking-[-0.01em]">
                {copy.installTitle}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{copy.installBody}</p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-0.5">
              <button
                type="button"
                onClick={() => {
                  haptic("selection");
                  void installStore.start();
                }}
                className="relative h-9 rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-ink active:opacity-80"
              >
                <HapticPad />
                {copy.installAdd}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  installStore.dismiss();
                }}
                className="relative h-8 rounded-full px-3 text-[13px] font-medium text-muted active:opacity-60"
              >
                <HapticPad />
                {copy.installDismiss}
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** The steps, for browsers that give a page no install button. iPhone is the main one. */
export function InstallSheet() {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const { sheetOpen, ios } = useInstall();
  const titleId = useId();
  const doneRef = useRef<HTMLButtonElement>(null);
  const steps = ios ? copy.installStepsIos : copy.installStepsOther;

  useEffect(() => {
    if (!sheetOpen) return;
    doneRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") installStore.closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <AnimatePresence>
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label={copy.installDone}
            tabIndex={-1}
            onClick={() => installStore.closeSheet()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={reduce ? { duration: 0.16 } : SPRING.move}
            className="glass relative w-full max-w-md rounded-t-[28px] px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[28px]"
          >
            <h2 id={titleId} className="text-[20px] font-semibold tracking-[-0.02em]">
              {copy.installSheetTitle}
            </h2>
            <ol className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-accent-ink"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-snug">{step}</span>
                </li>
              ))}
            </ol>
            <button
              ref={doneRef}
              type="button"
              onClick={() => {
                haptic("light");
                installStore.closeSheet();
              }}
              className="relative mt-6 h-12 w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-ink active:opacity-80"
            >
              <HapticPad />
              {copy.installDone}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
