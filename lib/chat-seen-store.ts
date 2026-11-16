/**
 * Client-only. For each bridge, the time of the newest chat message this rider has seen (the
 * message's own server time, so a wrong phone clock cannot hide or invent a count). The unread
 * badge counts what is newer. A bridge that has never been tracked starts at "now", so history
 * nobody was shown does not show up as a pile of unread messages.
 */

const KEY = "usbordertime.chat.seen.v1";

const memory = new Map<string, number>();

function read(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [port, at] of Object.entries(parsed)) {
      if (typeof at === "number" && Number.isFinite(at)) out[port] = at;
    }
    return out;
  } catch {
    return {};
  }
}

function write(all: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // The in-memory copy still holds for this visit.
  }
}

export const chatSeenStore = {
  /** When this bridge's chat was last seen, starting the clock now if it has no entry yet. */
  since(portNumber: string): number {
    const all = read();
    const known = Math.max(all[portNumber] ?? 0, memory.get(portNumber) ?? 0);
    if (known > 0) return known;
    const now = Date.now();
    memory.set(portNumber, now);
    write({ ...all, [portNumber]: now });
    return now;
  },
  /** The rider has seen everything up to `at`. Never moves backwards. */
  markSeen(portNumber: string, at: number): void {
    if (!Number.isFinite(at)) return;
    const all = read();
    const next = Math.max(at, all[portNumber] ?? 0, memory.get(portNumber) ?? 0);
    memory.set(portNumber, next);
    write({ ...all, [portNumber]: next });
  },
};
