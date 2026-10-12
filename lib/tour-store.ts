/**
 * Whether this browser has finished (or skipped) the welcome tour. One flag, not per-step:
 * finishing or skipping both count as seen, and either stops the tour from starting again
 * on its own. `components/wallet/tour.tsx` is the player; this is only the "seen it" flag.
 */

const STORAGE_KEY = "usbordertime.tour.v1";

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

export const tourStore = {
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
  /** Lets the tour run again, from the account menu or a developer picking it in dev. */
  reset() {
    seen = false;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage never held it.
    }
    emit();
  },
};
