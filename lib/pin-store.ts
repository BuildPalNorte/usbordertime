/**
 * Cities the user wants kept at the top. Newest pin first.
 * Stored separately from the wallet so pinning a city does not add its crossings.
 */

const STORAGE_KEY = "usbordertime.pins.v1";
const EMPTY: readonly string[] = [];
const KEY = /^(mx|ca):.+/;

let pins: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export function cityPinKey(border: string, city: string): string {
  const side = border.toLowerCase().includes("canad") ? "ca" : "mx";
  return `${side}:${city}`;
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    pins =
      Array.isArray(parsed) && parsed.every((key) => typeof key === "string" && KEY.test(key))
        ? parsed
        : EMPTY;
  } catch {
    pins = EMPTY;
  }
  loaded = true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: readonly string[]) {
  pins = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: pins still work for this session.
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    load();
    emit();
  }
}

export const pinStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): readonly string[] {
    if (!loaded) load();
    return pins;
  },
  getServerSnapshot(): readonly string[] {
    return EMPTY;
  },
  /** Returns whether the city is pinned after the toggle. */
  toggle(key: string): boolean {
    if (pins.includes(key)) {
      commit(pins.filter((pin) => pin !== key));
      return false;
    }
    commit([key, ...pins]);
    return true;
  },
};
