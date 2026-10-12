/**
 * A bell anyone can ring to (re)start the tour, regardless of whether this browser has
 * already seen it. The account menu's "Take the tour" and the dev tour picker both ring it;
 * `components/wallet/tour.tsx` is the only listener.
 */

let requests = 0;
const listeners = new Set<() => void>();

export const tourSignal = {
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
