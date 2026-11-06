"use client";

import { AnnouncementComposer } from "@/components/admin/announcement-composer";
import { haptic } from "@/lib/haptics";
import type { Announcement } from "@/lib/announcement";
import { MegaphoneIcon } from "@heroicons-animated/react/megaphone";
import { XMarkIcon } from "@heroicons-animated/react/x-mark";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";

const SPRING_MOVE = { type: "spring" as const, bounce: 0, duration: 0.5 };

/**
 * The header button for "Notify everyone." Its own open state, its own portal - the rest of the
 * dashboard does not know whether this is open, same as a wait alert's picker on a card.
 */
export function AnnouncementModal({ initial }: { initial: Announcement[] }) {
  const [open, setOpen] = useState(false);
  // Lives here, not in the dialog: the dialog unmounts on close, and reopening it must show what
  // was just sent or switched, not the list the page was rendered with.
  const [history, setHistory] = useState(initial);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic("light");
          setOpen(true);
        }}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background transition-transform duration-150 ease-out active:scale-95"
      >
        <MegaphoneIcon size={18} aria-hidden />
        Notify
      </button>
      {open && <AnnouncementDialog history={history} setHistory={setHistory} onClose={() => setOpen(false)} />}
    </>
  );
}

function AnnouncementDialog({
  history,
  setHistory,
  onClose,
}: {
  history: Announcement[];
  setHistory: Dispatch<SetStateAction<Announcement[]>>;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.22 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={reduce ? { duration: 0.12 } : SPRING_MOVE}
        className="flex max-h-[92dvh] w-full max-w-md flex-col sm:max-w-3xl overflow-hidden rounded-t-[28px] border border-line bg-background outline-none sm:rounded-[28px]"
        style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 30px 80px -20px rgb(10 14 28 / 0.55)" }}
      >
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-5 pt-5 sm:px-8 sm:pt-7">
          <span />
          <h2 id={titleId} className="truncate text-center text-[17px] font-semibold tracking-[-0.02em]">
            Notify everyone
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              haptic("light");
              onClose();
            }}
            className="relative grid size-10 place-items-center justify-self-end rounded-full bg-surface text-foreground active:scale-95"
          >
            <XMarkIcon size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-1 px-5 text-center sm:px-8 text-[13px] text-muted">
          One push to every device with notifications on, for a change worth knowing about.
        </p>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5 sm:px-8 sm:pt-6 sm:pb-8">
          <AnnouncementComposer history={history} setHistory={setHistory} />
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
