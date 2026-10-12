/**
 * Whether this browser has finished (or skipped) the Alarmas tour. Separate from
 * `tour-store.ts` (the wallet welcome tour) because the two run on different triggers:
 * this one starts the first time the schedules tab opens, not on sign-in.
 */

const STORAGE_KEY = "usbordertime.tour.schedules.v1";

let seen = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  try {
    seen = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    seen = false;
  }
  loaded = true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    load();
    emit();
  }
}

export const scheduleTourStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): boolean {
    if (!loaded) load();
    return seen;
  },
  getServerSnapshot(): boolean {
    // The server never knows; the client checks localStorage after hydration.
    return true;
  },
  markSeen() {
    if (seen) return;
    seen = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private mode or full storage: the in-memory flag still holds for this session.
    }
    emit();
  },
};
