import { isThemeChoice, THEME_COLOR, THEME_COOKIE, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

/**
 * The chosen appearance. Null until the user picks one, so the system
 * color scheme stays in effect.
 */
let chosen: ThemeChoice | null = null;
let loaded = false;
/** True after an account copy, so a saved "follow the system" beats the cookie fallback. */
let explicit = false;
const listeners = new Set<() => void>();

function readChosen(): ThemeChoice | null {
  if (loaded) return chosen;
  loaded = true;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    chosen = isThemeChoice(raw) ? raw : null;
  } catch {
    chosen = null;
  }
  return chosen;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  loaded = false;
  explicit = false;
  const next = readChosen();
  paint(next);
  emit();
}

/** What the page is showing right now, including a system scheme with no saved choice. */
export function resolvedTheme(): ThemeChoice {
  const explicit = document.documentElement.dataset.theme;
  if (isThemeChoice(explicit)) return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function paint(choice: ThemeChoice | null) {
  const root = document.documentElement;
  if (choice) root.dataset.theme = choice;
  else delete root.dataset.theme;

  // Next renders these two tags. Detaching one leaves React calling removeChild on a null parent.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta, index) => {
    const scheme: ThemeChoice = index === 0 ? "light" : "dark";
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("media", `(prefers-color-scheme: ${scheme})`);
    meta.setAttribute("content", choice ? THEME_COLOR[choice] : THEME_COLOR[scheme]);
  });
}

export const themeStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(fallback: ThemeChoice | null): ThemeChoice | null {
    const value = readChosen();
    if (explicit) return chosen;
    return value ?? fallback;
  },
  /** The explicit choice, or null when this browser is still following the system. */
  peek(): ThemeChoice | null {
    return readChosen();
  },
  /** Point the document at a saved choice, or back at the system scheme. */
  apply(choice: ThemeChoice | null) {
    paint(choice);
    if (!choice) return;
    document.cookie = `${THEME_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`;
  },
  set(next: ThemeChoice) {
    this.replace(next);
  },
  /** Copies an account choice. Null follows the system again. */
  replace(next: ThemeChoice | null) {
    chosen = next;
    loaded = true;
    explicit = true;
    try {
      if (next) window.localStorage.setItem(THEME_STORAGE_KEY, next);
      else window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // The choice still applies for this session.
    }
    this.apply(next);
    if (!next) {
      document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
    emit();
  },
  toggle() {
    this.set(resolvedTheme() === "dark" ? "light" : "dark");
  },
};
