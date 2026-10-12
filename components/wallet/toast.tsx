"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

export type ToastState = {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void; mobileOnly?: boolean };
};

/** Transient feedback for add and remove. Remove always offers Undo. */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  const reduce = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:fixed lg:bottom-8"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={reduce ? { duration: 0.16 } : SPRING.pop}
            className="glass pointer-events-auto flex max-w-full items-center gap-1 rounded-full py-1.5 pr-1.5 pl-5"
          >
            <p className="truncate text-[15px] font-medium">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss();
                }}
                className={
                  "relative h-10 shrink-0 rounded-full px-4 text-[15px] font-semibold text-accent active:opacity-60" +
                  (toast.action.mobileOnly ? " lg:hidden" : "")
                }
              >
                <HapticPad />
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
