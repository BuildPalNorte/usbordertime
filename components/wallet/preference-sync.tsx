"use client";

import { localeStore } from "@/lib/locale-store";
import { pinStore } from "@/lib/pin-store";
import type { PreferenceRecord } from "@/lib/preference";
import {
  clearPreferenceDirty,
  flushPreferenceSave,
  isPreferenceDirty,
  markPreferenceApplied,
  preferenceAlreadyApplied,
  preferenceApplyInProgress,
  preferenceOwner,
  preferenceSavedAt,
  notePreferenceSynced,
  queuePreferenceSave,
  readLocalPreference,
  rememberPreferenceSavedAt,
  runPreferenceApply,
  setPreferenceOwner,
} from "@/lib/preference-sync";
import { themeStore } from "@/lib/theme-store";
import { walletStore } from "@/lib/wallet-store";
import { useEffect, useLayoutEffect } from "react";

/**
 * The account row wins when this browser has no unsaved edits.
 * The first save for an account uploads this browser. A different account
 * does not inherit the previous bridges or city bookmarks.
 */
export function PreferenceSync({
  userId,
  initial,
  ready,
}: {
  userId: string;
  initial: PreferenceRecord | null;
  ready: boolean;
}) {
  useLayoutEffect(() => {
    if (!ready || preferenceAlreadyApplied(userId)) return;
    markPreferenceApplied(userId);

    const owner = preferenceOwner();
    const foreign = owner !== null && owner !== userId;
    const dirty = isPreferenceDirty() && !foreign;

    const localSavedAt = preferenceSavedAt();
    const snapshotIsOlder = Boolean(initial && localSavedAt && localSavedAt > initial.savedAt);

    if (initial && !dirty && !snapshotIsOlder) {
      const local = readLocalPreference();
      runPreferenceApply(() => {
        localeStore.replace(initial.locale ?? local.locale);
        themeStore.replace(initial.theme ?? local.theme);
        walletStore.replace(initial.wallet);
        pinStore.replace(initial.pins);
      });
      rememberPreferenceSavedAt(initial.savedAt);
      const filledGap =
        (initial.locale === null && local.locale !== null) ||
        (initial.theme === null && local.theme !== null);
      if (filledGap) queuePreferenceSave();
      else {
        notePreferenceSynced(readLocalPreference());
        clearPreferenceDirty();
      }
    } else if (!initial && foreign) {
      runPreferenceApply(() => {
        walletStore.replace([]);
        pinStore.replace([]);
      });
      queuePreferenceSave();
    } else {
      queuePreferenceSave();
    }

    setPreferenceOwner(userId);
  }, [initial, ready, userId]);

  useEffect(() => {
    if (!ready) return;
    const onChange = () => {
      if (preferenceApplyInProgress()) return;
      queuePreferenceSave();
    };
    const unsubscribers = [
      localeStore.subscribe(onChange),
      themeStore.subscribe(onChange),
      walletStore.subscribe(onChange),
      pinStore.subscribe(onChange),
    ];
    const onHide = () => {
      if (isPreferenceDirty()) flushPreferenceSave();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("pagehide", onHide);
    };
  }, [ready]);

  return null;
}
