/**
 * Client-only. "Not now" on the sign-in suggestion holds it back for a few days on this browser.
 * The server snapshot says it is dismissed, so the suggestion never appears in the server render.
 */

const KEY = "usbordertime.signin.nudge.v1";
const HOLD_MS = 3 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();
/** Used when `localStorage` cannot be written, so "Not now" still holds for this visit. */
let memory = 0;

function readSavedAt(): number {
  try {
    const saved = Number(localStorage.getItem(KEY));
    return Number.isFinite(saved) ? Math.max(saved, memory) : memory;
  } catch {
    return memory;
  }
}

export const signInNudgeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** True while "Not now" is still in force. */
  getSnapshot(): boolean {
    const savedAt = readSavedAt();
    return savedAt > 0 && Date.now() - savedAt < HOLD_MS;
  },
  getServerSnapshot(): boolean {
    return true;
  },
  dismiss(): void {
    memory = Date.now();
    try {
      localStorage.setItem(KEY, String(memory));
    } catch {
      // The in-memory copy still holds for this visit.
    }
    for (const listener of listeners) listener();
  },
};
