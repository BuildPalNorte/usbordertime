import { isThemeChoice, THEME_COLOR, THEME_COOKIE, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

/**
 * Appearance follows the device. `chosen` is only a switch pressed on this
 * visit; a reload or a device change drops it and follows the device again.
 */
let chosen: ThemeChoice | null = null;
let loaded = false;
let lastSystem: ThemeChoice | null = null;
let schemeQuery: MediaQueryList | null = null;
const listeners = new Set<() => void>();

function systemTheme(): ThemeChoice {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readChosen(): ThemeChoice | null {
  if (!loaded) {
    loaded = true;
    chosen = null;
  }
  return chosen;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function clearPin() {
  document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // The page still follows the device for this visit.
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  chosen = isThemeChoice(event.newValue) ? event.newValue : null;
  loaded = true;
  paint(chosen);
  emit();
}

/** What the page is showing right now. */
export function resolvedTheme(): ThemeChoice {
  const showing = document.documentElement.dataset.theme;
  if (isThemeChoice(showing)) return showing;
  return systemTheme();
}

function paint(choice: ThemeChoice | null) {
  const scheme = choice ?? systemTheme();
  document.documentElement.dataset.theme = scheme;

  // Next renders these two tags. Detaching one leaves React calling removeChild on a null parent.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", THEME_COLOR[scheme]);
  });
}

function onDeviceScheme() {
  const next = systemTheme();
  const root = document.documentElement;
  if (next === lastSystem && chosen === null && root.dataset.theme === next) return;

  const deviceChanged = lastSystem !== null && next !== lastSystem;
  lastSystem = next;
  if (chosen !== null && !deviceChanged) return;

  const hadOverride = chosen !== null;
  if (hadOverride) {
    chosen = null;
    loaded = true;
    clearPin();
    emit();
  }
  paint(null);
}

function onVisible() {
  if (document.visibilityState === "hidden") return;
  onDeviceScheme();
}

function watchDevice() {
  if (schemeQuery) return;
  schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  lastSystem = schemeQuery.matches ? "dark" : "light";
  schemeQuery.addEventListener("change", onDeviceScheme);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);
}

function unwatchDevice() {
  if (!schemeQuery) return;
  schemeQuery.removeEventListener("change", onDeviceScheme);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("pageshow", onVisible);
  schemeQuery = null;
}

export const themeStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) {
      window.addEventListener("storage", onStorage);
      watchDevice();
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("storage", onStorage);
        unwatchDevice();
      }
    };
  },
  /** A switch pressed this visit, or null while the page is following the device. */
  getSnapshot(): ThemeChoice | null {
    return readChosen();
  },
  /** The explicit choice, or null when this browser is following the device. */
  peek(): ThemeChoice | null {
    return readChosen();
  },
  /** Point the document at a visit choice, or back at the device scheme. */
  apply(choice: ThemeChoice | null) {
    if (choice === null && chosen) return;
    paint(choice);
    if (choice) {
      document.cookie = `${THEME_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`;
      return;
    }
    clearPin();
  },
  set(next: ThemeChoice) {
    this.replace(next);
  },
  /** A visit choice. Null follows the device again. */
  replace(next: ThemeChoice | null) {
    chosen = next;
    loaded = true;
    try {
      if (next) window.localStorage.setItem(THEME_STORAGE_KEY, next);
      else window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // The choice still applies for this visit.
    }
    this.apply(next);
    if (!next) clearPin();
    emit();
  },
  toggle() {
    this.set(resolvedTheme() === "dark" ? "light" : "dark");
  },
};
