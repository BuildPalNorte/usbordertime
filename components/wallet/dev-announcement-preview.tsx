"use client";

import { announcementPreview } from "@/lib/announcement-store";
import type { Announcement } from "@/lib/announcement";
import { haptic } from "@/lib/haptics";
import { useRouter } from "next/navigation";

/** The broadcast drafted for the next send, so the banner can be looked at before it goes out. */
const MOCK: Announcement = {
  id: "dev-preview",
  title: "43 cámaras y puentes cercanos",
  body: "• Cuenta nueva: ubicación, cruces a 40 millas • O elige los puentes a mano • 43 cámaras: Nogales, Laredo y más • Desliza la foto para cambiar de vista",
  url: "/",
  surface: "modal",
  sentAt: new Date(0).toISOString(),
  recipients: 0,
};

/**
 * Development only. Opens the announcement dialog with a stand-in message and returns to the
 * bridges. Dismissing it does not mark a real broadcast seen, and the button is not rendered
 * outside development.
 */
export function DevAnnouncementPreview({ onDone }: { onDone: () => void }) {
  const router = useRouter();

  return (
    <div className="mx-2 mb-1 rounded-xl border border-dashed border-line px-2 py-2">
      <p className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Dev · announcement
      </p>
      <button
        type="button"
        onClick={() => {
          haptic("selection");
          announcementPreview.show(MOCK);
          onDone();
          router.push("/");
        }}
        className="h-9 w-full rounded-lg bg-surface-strong text-[13px] font-medium"
      >
        Preview announcement
      </button>
    </div>
  );
}
