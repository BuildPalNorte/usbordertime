/**
 * Phones stay portrait. The expanded camera is the one view that may turn.
 *
 * The manifest sets the same default for an installed app. `lock()` is refused
 * on a desktop and in some mobile browsers unless the document is fullscreen,
 * so a refusal stays retryable and the layout still works sideways.
 */

const PHONE = "(pointer: coarse) and ((max-width: 1023px) or (max-height: 1023px))";

const expanded = new Set<HTMLVideoElement>();
let applied: "portrait" | "any" | "free" | null = null;
let generation = 0;

/** `lock()` is missing from the DOM lib this repo typechecks against. */
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait" | "any") => Promise<void>;
};

function desired(): "portrait" | "any" | "free" {
  if (!window.matchMedia(PHONE).matches) return "free";
  return expanded.size > 0 ? "any" : "portrait";
}

export function applyScreenOrientation() {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (!orientation || typeof orientation.lock !== "function") return;
  const lock = orientation.lock;

  const next = desired();
  if (next === applied) return;
  const gen = ++generation;
  const task = next === "free" ? Promise.resolve(orientation.unlock()) : lock(next);

  void task
    .then(() => {
      if (gen === generation) applied = next;
    })
    .catch(() => {
      // Refused locks must not stick, or the next gesture would never retry.
    });
}

export function reportCameraExpanded(video: HTMLVideoElement, isExpanded: boolean) {
  if (isExpanded) expanded.add(video);
  else expanded.delete(video);
  applyScreenOrientation();
}

type FullscreenVideo = HTMLVideoElement & {
  webkitDisplayingFullscreen?: boolean;
  webkitPresentationMode?: string;
};

/** Native iPhone fullscreen does not set `document.fullscreenElement`. */
export function videoIsExpanded(video: HTMLVideoElement): boolean {
  const player = video as FullscreenVideo;
  return (
    document.fullscreenElement === video ||
    player.webkitDisplayingFullscreen === true ||
    player.webkitPresentationMode === "fullscreen"
  );
}
