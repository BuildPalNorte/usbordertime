"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import type { Announcement } from "@/lib/announcement";
import {
  announcementPreview,
  lastSeenAnnouncementId,
  markAnnouncementSeen,
} from "@/lib/announcement-store";
import { XMarkIcon } from "@heroicons-animated/react/x-mark";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

/** A body written as "• a • b" is a list. Anything else stays one paragraph. */
function pointsOf(body: string): string[] | null {
  const points = body
    .split("•")
    .map((point) => point.trim())
    .filter((point) => point.length > 0);
  return points.length > 1 ? points : null;
}

/**
 * The broadcast on screen, if this device has not dismissed it. A development preview stands in
 * for a real row and is forgotten on dismiss, without marking a real broadcast seen.
 */
export function useShownAnnouncement(announcement: Announcement | null, hydrated: boolean) {
  const preview = useSyncExternalStore(
    announcementPreview.subscribe,
    announcementPreview.getSnapshot,
    announcementPreview.getServerSnapshot,
  );
  const [seenId, setSeenId] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    setSeenId(lastSeenAnnouncementId());
  }, [hydrated]);

  const current = preview ?? announcement;
  const visible = hydrated && current !== null && (preview !== null || current.id !== seenId);

  const dismiss = () => {
    if (preview) {
      announcementPreview.hide();
      return;
    }
    if (!announcement) return;
    markAnnouncementSeen(announcement.id);
    setSeenId(announcement.id);
  };

  return { shown: visible ? current : null, dismiss };
}

/**
 * The modal form of a broadcast: a sheet on a phone, a centered dialog from `sm` up. A banner
 * broadcast is drawn by `AnnouncementBanner` instead. Dismissing remembers the id in
 * `lib/announcement-store.ts`. A later broadcast has a new id and shows again.
 */
export function AnnouncementNotice({
  announcement,
  hydrated,
  onView,
}: {
  announcement: Announcement | null;
  hydrated: boolean;
  onView: (url: string) => void;
}) {
  const { shown, dismiss } = useShownAnnouncement(announcement, hydrated);
  const modal = shown?.surface === "modal" ? shown : null;

  return (
    <AnimatePresence>
      {modal && (
        <NoticeDialog
          key={modal.id}
          announcement={modal}
          onDismiss={dismiss}
          onView={() => {
            const url = modal.url;
            dismiss();
            onView(url);
          }}
        />
      )}
    </AnimatePresence>
  );
}

function NoticeDialog({
  announcement,
  onDismiss,
  onView,
}: {
  announcement: Announcement;
  onDismiss: () => void;
  onView: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const points = pointsOf(announcement.body);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Capture, and mark it handled, so a card behind the sheet does not also close.
      event.preventDefault();
      haptic("light");
      onDismiss();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label={copy.announcementDismiss}
        tabIndex={-1}
        onClick={() => {
          haptic("light");
          onDismiss();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.12 : 0.2 }}
        className="absolute inset-0 cursor-default bg-black/45"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
        transition={reduce ? { duration: 0.16 } : SPRING.move}
        className="relative w-full max-w-md rounded-t-[28px] border border-line bg-background px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[28px]"
        style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 30px 80px -20px rgb(10 14 28 / 0.55)" }}
      >
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <span />
          <h2 id={titleId} className="text-center text-[17px] leading-tight font-semibold tracking-[-0.02em]">
            {announcement.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={copy.announcementDismiss}
            onClick={() => {
              haptic("light");
              onDismiss();
            }}
            className="relative grid size-10 place-items-center justify-self-end rounded-full bg-surface text-foreground active:scale-95"
          >
            <XMarkIcon size={18} aria-hidden />
          </button>
        </div>

        {points ? (
          <ul className="mt-4 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-[15px] leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] leading-snug">{announcement.body}</p>
        )}

        <button
          type="button"
          onClick={() => {
            haptic("selection");
            onView();
          }}
          className="relative mt-6 h-12 w-full rounded-full bg-accent text-[16px] font-semibold text-accent-ink active:scale-[0.98]"
        >
          <HapticPad />
          {copy.view}
        </button>
      </motion.div>
    </div>
  );
}
