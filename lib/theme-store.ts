import { isThemeChoice, THEME_COLOR, THEME_COOKIE, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

/**
 * The chosen appearance. Null until the user picks one, so the system
 * color scheme stays in effect.
 */
let chosen: ThemeChoice | null = null;
let loaded = false;
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

  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  if (!choice) {
    const light = metas[0] ?? document.head.appendChild(document.createElement("meta"));
    light.setAttribute("name", "theme-color");
    light.setAttribute("media", "(prefers-color-scheme: light)");
    light.setAttribute("content", THEME_COLOR.light);
    const dark = metas[1] ?? document.head.appendChild(document.createElement("meta"));
    dark.setAttribute("name", "theme-color");
    dark.setAttribute("media", "(prefers-color-scheme: dark)");
    dark.setAttribute("content", THEME_COLOR.dark);
    for (const extra of metas.slice(2)) extra.remove();
    return;
  }

  const meta = metas[0] ?? document.head.appendChild(document.createElement("meta"));
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", THEME_COLOR[choice]);
  meta.removeAttribute("media");
  for (const extra of metas.slice(1)) extra.remove();
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
    return readChosen() ?? fallback;
  },
  /** Point the document at a saved choice, or back at the system scheme. */
  apply(choice: ThemeChoice | null) {
    paint(choice);
    if (!choice) return;
    document.cookie = `${THEME_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`;
  },
  set(next: ThemeChoice) {
    chosen = next;
    loaded = true;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session.
    }
    this.apply(next);
    emit();
  },
  toggle() {
    this.set(resolvedTheme() === "dark" ? "light" : "dark");
  },
};
