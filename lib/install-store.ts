/**
 * Whether Border Time can be put on the Home Screen from here, and how.
 * Client-only: the server snapshot says "nothing to offer", so the first render matches.
 *
 * Chrome and Edge (Android and desktop) hand the page a one-time install prompt. Safari on iPhone
 * has none, so it gets steps instead. Once the app runs from the Home Screen, nothing is offered.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** Already running from the Home Screen. */
  standalone: boolean;
  ios: boolean;
  /** The browser is holding a native install prompt. */
  canPrompt: boolean;
  /** Worth offering: not installed, and either a prompt or iPhone steps exist. */
  offerable: boolean;
  /** The banner was dismissed recently. The menu entry still works. */
  dismissed: boolean;
  sheetOpen: boolean;
};

const SERVER: InstallState = {
  standalone: false,
  ios: false,
  canPrompt: false,
  offerable: false,
  dismissed: true,
  sheetOpen: false,
};

const DISMISS_KEY = "usbordertime.install.dismissed.v1";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

let deferred: InstallPromptEvent | null = null;
let sheetOpen = false;
let state: InstallState = SERVER;
const listeners = new Set<() => void>();

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return legacy || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports itself as a Mac, but only an iPad has a touch screen.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function read(): InstallState {
  const standalone = isStandalone();
  const ios = isIOS();
  const canPrompt = deferred !== null;
  return {
    standalone,
    ios,
    canPrompt,
    offerable: !standalone && (canPrompt || ios),
    dismissed: recentlyDismissed(),
    sheetOpen,
  };
}

function same(a: InstallState, b: InstallState): boolean {
  return (
    a.standalone === b.standalone &&
    a.ios === b.ios &&
    a.canPrompt === b.canPrompt &&
    a.offerable === b.offerable &&
    a.dismissed === b.dismissed &&
    a.sheetOpen === b.sheetOpen
  );
}

function emit(): void {
  const next = read();
  if (same(state, next)) return;
  state = next;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the prompt for our own button instead of the browser's mini-infobar.
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    sheetOpen = false;
    emit();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", emit);
  state = read();
}

export const installStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // A change between module load and this subscription would otherwise be missed.
    emit();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): InstallState {
    return state;
  },
  getServerSnapshot(): InstallState {
    return SERVER;
  },

  /** The browser's own dialog when it has one, otherwise the steps. */
  async start(): Promise<void> {
    if (deferred) {
      const event = deferred;
      // The browser allows each prompt once.
      deferred = null;
      emit();
      try {
        await event.prompt();
        await event.userChoice;
      } catch {
        // The sheet below still tells them how.
        sheetOpen = true;
        emit();
      }
      return;
    }
    sheetOpen = true;
    emit();
  },

  closeSheet(): void {
    sheetOpen = false;
    emit();
  },

  dismiss(): void {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // The banner just comes back next visit.
    }
    emit();
  },
};
