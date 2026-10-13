/**
 * Which broadcast this device has already dismissed from the in-app banner. One id, not a list -
 * only the latest announcement is ever shown, so remembering anything older is pointless. A new
 * broadcast has a new id, so it shows again even though an older one was dismissed.
 *
 * `announcementPreview` is a separate, in-memory stand-in. Development uses it to show the banner
 * without a real row. It is never written to storage, and dismissing it does not mark a real
 * broadcast seen.
 */

import type { Announcement } from "@/lib/announcement";

const STORAGE_KEY = "usbordertime.announcement.seen.v1";

export function lastSeenAnnouncementId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markAnnouncementSeen(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or full storage: it just shows again next visit.
  }
}

let preview: Announcement | null = null;
const previewListeners = new Set<() => void>();

function emitPreview(): void {
  previewListeners.forEach((listener) => listener());
}

export const announcementPreview = {
  subscribe(listener: () => void): () => void {
    previewListeners.add(listener);
    return () => {
      previewListeners.delete(listener);
    };
  },
  getSnapshot(): Announcement | null {
    return preview;
  },
  getServerSnapshot(): Announcement | null {
    return null;
  },
  show(announcement: Announcement): void {
    preview = announcement;
    emitPreview();
  },
  hide(): void {
    if (!preview) return;
    preview = null;
    emitPreview();
  },
};
