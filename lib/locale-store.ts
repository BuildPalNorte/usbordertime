import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, isLocale, type Locale } from "@/lib/i18n";

/**
 * The chosen language. Null until the user picks one, so the server's
 * Accept-Language (or cookie) choice stays in effect.
 */
let chosen: Locale | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function readChosen(): Locale | null {
  if (loaded) return chosen;
  loaded = true;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    chosen = isLocale(raw) ? raw : null;
  } catch {
    chosen = null;
  }
  return chosen;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function write(next: Locale | null) {
  chosen = next;
  loaded = true;
  try {
    if (next) window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    else window.localStorage.removeItem(LOCALE_STORAGE_KEY);
  } catch {
    // The choice still applies for this session.
  }
  if (next) {
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
  } else {
    document.cookie = `${LOCALE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  emit();
}

export const localeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(fallback: Locale): Locale {
    return readChosen() ?? fallback;
  },
  /** The explicit choice, or null when this browser is still following the server. */
  peek(): Locale | null {
    return readChosen();
  },
  set(next: Locale) {
    write(next);
  },
  /** Copies an account choice, including "no choice yet". */
  replace(next: Locale | null) {
    write(next);
  },
};
