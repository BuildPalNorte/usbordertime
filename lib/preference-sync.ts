import { localeStore } from "@/lib/locale-store";
import { pinStore } from "@/lib/pin-store";
import type { Preference } from "@/lib/preference";
import { themeStore } from "@/lib/theme-store";
import { walletStore } from "@/lib/wallet-store";

const OWNER_KEY = "usbordertime.preference.owner.v1";
const DIRTY_KEY = "usbordertime.preference.dirty.v1";
const SAVED_AT_KEY = "usbordertime.preference.savedAt.v1";

/** Survives a remount in this page. A reload starts over and reads the account again. */
let appliedUserId: string | null = null;
let applying = false;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The in-memory session still applies. The next save retries.
  }
}

function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same as a failed write: the following save sends the current copy.
  }
}

/** The account id this browser last synced, so another sign-in does not inherit its bridges. */
export function preferenceOwner(): string | null {
  return storageGet(OWNER_KEY);
}

export function setPreferenceOwner(userId: string) {
  storageSet(OWNER_KEY, userId);
}

export function isPreferenceDirty(): boolean {
  return storageGet(DIRTY_KEY) === "1";
}

export function markPreferenceDirty() {
  storageSet(DIRTY_KEY, "1");
}

export function clearPreferenceDirty() {
  storageRemove(DIRTY_KEY);
}

export function preferenceAlreadyApplied(userId: string): boolean {
  return appliedUserId === userId;
}

export function markPreferenceApplied(userId: string) {
  appliedUserId = userId;
}

/** Store writes inside `fn` are the account being copied down, not a new edit. */
export function runPreferenceApply(fn: () => void) {
  applying = true;
  try {
    fn();
  } finally {
    applying = false;
  }
}

export function preferenceApplyInProgress(): boolean {
  return applying;
}

/** Database time of the copy this browser last applied or saved. */
export function preferenceSavedAt(): string | null {
  return storageGet(SAVED_AT_KEY);
}

export function rememberPreferenceSavedAt(savedAt: string) {
  storageSet(SAVED_AT_KEY, savedAt);
}

/** The account copy is already on this page, so the next edit is what needs a write. */
export function notePreferenceSynced(preference: Preference) {
  lastSent = JSON.stringify(preference);
}

export function readLocalPreference(): Preference {
  return {
    locale: localeStore.peek(),
    theme: themeStore.peek(),
    wallet: walletStore.getSnapshot().map((entry) => ({ ...entry })),
    pins: [...pinStore.getSnapshot()],
  };
}

let saving = false;
let queued = false;
let timer = 0;
let lastSent = "";

async function putPreference(preference: Preference): Promise<"ok" | "stop" | "retry"> {
  try {
    const response = await fetch("/api/preference", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preference),
      keepalive: true,
    });
    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      if (body && typeof body === "object" && "savedAt" in body) {
        const savedAt = (body as { savedAt?: unknown }).savedAt;
        if (typeof savedAt === "string") rememberPreferenceSavedAt(savedAt);
      }
      return "ok";
    }
    if (response.status === 400 || response.status === 401) return "stop";
    return "retry";
  } catch {
    return "retry";
  }
}

async function flush() {
  if (saving) return;
  saving = true;
  try {
    while (queued) {
      queued = false;
      const preference = readLocalPreference();
      const body = JSON.stringify(preference);
      if (body === lastSent) {
        if (!queued) clearPreferenceDirty();
        continue;
      }
      const result = await putPreference(preference);
      if (result === "retry") {
        window.setTimeout(() => queuePreferenceSave(), 2000);
        return;
      }
      if (result === "ok") {
        lastSent = body;
        if (!queued) clearPreferenceDirty();
      }
    }
  } finally {
    saving = false;
    if (queued) queuePreferenceSave();
  }
}

function scheduleFlush() {
  queued = true;
  if (saving) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void flush();
  }, 400);
}

/** Writes the browser copy to the account. Later edits collapse into one request. */
export function queuePreferenceSave() {
  markPreferenceDirty();
  scheduleFlush();
}

/** Sends immediately. A page hide cannot wait for the debounce. */
export function flushPreferenceSave() {
  markPreferenceDirty();
  queued = true;
  window.clearTimeout(timer);
  void flush();
}
