"use client";

import { haptic } from "@/lib/haptics";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Development only. Puts the location question back in front of this account so the
 * share-location and choose-manually paths can be replayed without a new sign-up.
 * `DELETE /api/location-onboarding` 404s outside development, same guard as this button.
 */
export function DevLocationReplay() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const replay = async () => {
    if (busy) return;
    haptic("selection");
    setBusy(true);
    try {
      await fetch("/api/location-onboarding", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-2 mb-1 rounded-xl border border-dashed border-line px-2 py-2">
      <p className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Dev · onboarding
      </p>
      <button
        type="button"
        onClick={() => void replay()}
        disabled={busy}
        className="h-9 w-full rounded-lg bg-surface-strong text-[13px] font-medium disabled:opacity-50"
      >
        {busy ? "Replaying…" : "Replay location prompt"}
      </button>
    </div>
  );
}
