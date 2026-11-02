import { isRate, type Rate } from "@/lib/rate";

const STORAGE_KEY = "usbordertime.rate.v1";

let rate: Rate | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = text ? JSON.parse(text) : null;
    rate = isRate(parsed) ? parsed : null;
  } catch {
    rate = null;
  }
  loaded = true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  load();
  emit();
}

/** The last rate the feed gave this browser, so the screen has a number before the next call. */
export const rateStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): Rate | null {
    if (!loaded) load();
    return rate;
  },
  getServerSnapshot(): Rate | null {
    return null;
  },
  save(next: Rate) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or full storage: the rate still shows for this session.
    }
    rate = next;
    loaded = true;
    emit();
  },
};
