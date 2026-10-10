/**
 * Tactile ticks for commits and gesture beats.
 *
 * Android plays a short vibration pattern. iPhone Safari has no Vibration API;
 * a real finger tap on a switch is the tick it still plays (`HapticPad`), and
 * `haptic()` itself is only the fallback for drags and older iOS, where a
 * switch click inside the gesture still counts. Desktop does nothing.
 *
 * Reduced motion is not a haptic setting. The system haptic toggle is.
 */

export type Haptic =
  | "selection"
  | "light"
  | "soft"
  | "medium"
  | "rigid"
  | "heavy"
  | "success"
  | "error";

/** On/off milliseconds. Short on purpose — a motor buzz longer than this feels like an alarm. */
const PATTERNS: Record<Haptic, number[]> = {
  selection: [10],
  light: [14],
  soft: [20],
  medium: [26],
  rigid: [12],
  heavy: [34],
  success: [12, 46, 20],
  error: [26, 42, 20, 42, 28],
};

/** Collapse two ticks that land on the same frame (a detent and its release). */
const GAP_MS = 16;

let lastAt = 0;
let lastKind: Haptic | null = null;
let fromPad = false;
let iphone: boolean | null = null;

export function isIPhone(): boolean {
  if (iphone === null) {
    iphone =
      typeof navigator !== "undefined" && /iPhone|iPod/.test(navigator.userAgent);
  }
  return iphone;
}

/** The switch under the finger already ticked. Skip the programmatic copy of it. */
export function notePadTick() {
  fromPad = true;
  queueMicrotask(() => {
    fromPad = false;
  });
}

export function haptic(kind: Haptic) {
  if (typeof window === "undefined") return;
  const now = performance.now();
  const pad = fromPad;
  fromPad = false;
  if (kind === lastKind && now - lastAt < GAP_MS) return;
  lastAt = now;
  lastKind = kind;

  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(PATTERNS[kind]);
    } catch {
      // A denied or missing motor should not break the gesture that asked.
    }
    return;
  }

  if (pad || !isIPhone()) return;
  iosTick();
}

function iosTick() {
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText =
      "position:fixed;width:0;height:0;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.append(input);
    document.body.append(label);
    label.click();
    label.remove();
  } catch {
    // Ignore. The gesture still happened.
  }
}
