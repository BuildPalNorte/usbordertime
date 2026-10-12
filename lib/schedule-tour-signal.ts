/**
 * A bell that restarts the Alarmas tour regardless of whether this browser has already seen
 * it. The schedules pane's dev-only "Replay the tour" button rings it; `schedule-tour.tsx`
 * is the only listener. Mirrors `tour-signal.ts` for the wallet tour.
 */

let requests = 0;
const listeners = new Set<() => void>();

export const scheduleTourSignal = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): number {
    return requests;
  },
  getServerSnapshot(): number {
    return 0;
  },
  request() {
    requests += 1;
    listeners.forEach((listener) => listener());
  },
};
