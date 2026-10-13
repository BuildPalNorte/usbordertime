"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import type { Announcement } from "@/lib/announcement";
import { MegaphoneIcon } from "@heroicons-animated/react/megaphone";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HapticPad } from "./haptic-pad";
import { useShownAnnouncement } from "./announcement-notice";
import { SPRING } from "./motion";

/**
 * The banner form of a broadcast. Sits under the bridges header, and only while no card is open.
 * A modal broadcast is drawn by `AnnouncementNotice` instead.
 */
export function AnnouncementBanner({
  announcement,
  hydrated,
  onView,
}: {
  announcement: Announcement | null;
  hydrated: boolean;
  onView: (url: string) => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const { shown, dismiss } = useShownAnnouncement(announcement, hydrated);
  const banner = shown?.surface === "banner" ? shown : null;

  return (
    <AnimatePresence initial={false}>
      {banner && (
        <motion.section
          key={banner.id}
          aria-label={banner.title}
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={SPRING.snap}
          className="overflow-hidden"
        >
          <div className="mb-4 flex items-start gap-3 rounded-3xl bg-surface p-3 pr-2">
            <span
              aria-hidden
              className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"
            >
              <MegaphoneIcon size={20} />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="text-[14px] leading-tight font-semibold tracking-[-0.01em]">{banner.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{banner.body}</p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-0.5">
              <button
                type="button"
                onClick={() => {
                  haptic("selection");
                  const url = banner.url;
                  dismiss();
                  onView(url);
                }}
                className="relative h-9 rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-ink active:opacity-80"
              >
                <HapticPad />
                {copy.view}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  dismiss();
                }}
                className="relative h-8 rounded-full px-3 text-[13px] font-medium text-muted active:opacity-60"
              >
                <HapticPad />
                {copy.announcementDismiss}
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
