import { isProfileField } from "@/lib/tramites-packet";

/**
 * The details that are true for the person, whatever the errand: name, birth, address, contact,
 * passport. Typed once into a packet, remembered here, and used to fill in the next packet or form.
 * Lives in this browser only. Nothing here is sent anywhere.
 * Plain reads and writes: it has no subscribers, because the packet draft is what the screen watches.
 */

const STORAGE_KEY = "usbordertime.tramites-profile.v1";

export type ProfileAnswers = Readonly<Record<string, string>>;

function read(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return {};
    const record = (value as { answers?: unknown }).answers;
    if (typeof record !== "object" || record === null) return {};
    const out: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === "string" && isProfileField(key)) out[key] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

function write(answers: Record<string, string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, updatedAt: Date.now(), answers }));
  } catch {
    // Private mode or full storage: this session still works from the draft.
  }
}

export const profileStore = {
  get(): ProfileAnswers {
    return read();
  },

  /** Keeps one shared answer. Clearing a field forgets it. Other ids are ignored. */
  remember(id: string, value: string) {
    if (!isProfileField(id)) return;
    const answers = read();
    if (value === "") delete answers[id];
    else answers[id] = value;
    write(answers);
  },

  /** Adds answers the profile does not have yet. Used once for a draft that began before the profile existed. */
  absorb(answers: ProfileAnswers) {
    const saved = read();
    let changed = false;
    for (const [id, value] of Object.entries(answers)) {
      if (!isProfileField(id) || value === "" || saved[id] !== undefined) continue;
      saved[id] = value;
      changed = true;
    }
    if (changed) write(saved);
  },

  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored that we could remove.
    }
  },
};
