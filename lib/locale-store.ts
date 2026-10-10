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
  set(next: Locale) {
    chosen = next;
    loaded = true;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session.
    }
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    emit();
  },
};
