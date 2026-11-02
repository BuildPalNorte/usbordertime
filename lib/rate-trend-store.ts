import { isTrendPoint, type TrendPoint } from "@/lib/rate-trend";

const STORAGE_KEY = "usbordertime.rate-trend.v1";

let points: TrendPoint[] | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = text ? JSON.parse(text) : null;
    points =
      Array.isArray(parsed) && parsed.length >= 2 && parsed.every(isTrendPoint) ? parsed : null;
  } catch {
    points = null;
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

/** The last daily series this browser got, so the chart has a line before the next call. */
export const rateTrendStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): TrendPoint[] | null {
    if (!loaded) load();
    return points;
  },
  getServerSnapshot(): TrendPoint[] | null {
    return null;
  },
  save(next: TrendPoint[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or full storage: the chart still shows for this session.
    }
    points = next;
    loaded = true;
    emit();
  },
};
