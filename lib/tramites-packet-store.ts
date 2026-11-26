import {
  isSectionId,
  packetPathFrom,
  type SectionId,
  type StepId,
} from "@/lib/tramites-packet";
import { profileStore } from "@/lib/tramites-profile-store";
import type { TramitesPathId } from "@/lib/tramites";

/**
 * The packet draft. Lives in this browser only: nothing here is sent anywhere.
 * A module singleton read with `useSyncExternalStore`. The server snapshot is empty,
 * so read it after hydration.
 */

const STORAGE_KEY = "usbordertime.tramites-packet.v1";

export type PacketDraft = {
  version: 1;
  pathId: TramitesPathId;
  updatedAt: number;
  lastStep: StepId;
  answers: Readonly<Record<string, string>>;
  completed: readonly SectionId[];
  attestedAt: number | null;
  nudgeDismissedAt: number | null;
  /** True once the saved profile has been offered to this draft, so a field cleared on purpose stays cleared. */
  prefilled: boolean;
};

const EMPTY: PacketDraft = {
  version: 1,
  pathId: "first",
  updatedAt: 0,
  lastStep: "errand",
  answers: {},
  completed: [],
  attestedAt: null,
  nudgeDismissedAt: null,
  prefilled: false,
};

let draft: PacketDraft = EMPTY;
let loaded = false;
/** How many answers the profile filled in during this page load. Not stored: the note fades on the next visit. */
let reusedCount = 0;
const listeners = new Set<() => void>();

function parse(raw: string | null): PacketDraft {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return EMPTY;
    const record = value as Record<string, unknown>;
    if (record.version !== 1) return EMPTY;
    const answers: Record<string, string> = {};
    if (typeof record.answers === "object" && record.answers !== null) {
      for (const [key, entry] of Object.entries(record.answers)) {
        if (typeof entry === "string") answers[key] = entry;
      }
    }
    const completed = Array.isArray(record.completed)
      ? record.completed.filter((id): id is SectionId => isSectionId(id) && id !== "review")
      : [];
    return {
      version: 1,
      pathId: packetPathFrom(answers),
      updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
      lastStep: isSectionId(record.lastStep) ? record.lastStep : "errand",
      answers,
      completed,
      attestedAt: typeof record.attestedAt === "number" ? record.attestedAt : null,
      nudgeDismissedAt: typeof record.nudgeDismissedAt === "number" ? record.nudgeDismissedAt : null,
      prefilled: record.prefilled === true,
    };
  } catch {
    return EMPTY;
  }
}

function load() {
  try {
    draft = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    draft = EMPTY;
  }
  loaded = true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: PacketDraft) {
  draft = { ...next, pathId: packetPathFrom(next.answers), updatedAt: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or full storage: the draft still works for this session.
  }
  emit();
}

function current(): PacketDraft {
  if (!loaded) load();
  return draft;
}

export const packetStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      load();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: current,
  getServerSnapshot: () => EMPTY,

  /** Sets one answer. Changing an answer takes back any sign-off. */
  setAnswer(id: string, value: string) {
    const base = current();
    if ((base.answers[id] ?? "") === value) return;
    const answers = { ...base.answers };
    if (value === "") delete answers[id];
    else answers[id] = value;
    profileStore.remember(id, value);
    commit({ ...base, answers, attestedAt: null });
  },

  /**
   * Fills the blanks from what this device already knows about the person, once per draft.
   * Returns how many answers it filled in. A draft that began earlier teaches the profile first.
   */
  prefill(): number {
    const base = current();
    if (base.prefilled) return 0;
    profileStore.absorb(base.answers);
    const saved = profileStore.get();
    const answers = { ...base.answers };
    let filled = 0;
    for (const [id, value] of Object.entries(saved)) {
      if ((answers[id] ?? "") !== "") continue;
      answers[id] = value;
      filled += 1;
    }
    reusedCount = filled;
    commit({ ...base, answers, prefilled: true });
    return filled;
  },

  getReused: () => reusedCount,

  /** Seeds the errand from a link, only while this draft has none. */
  seedErrand(errand: TramitesPathId) {
    const base = current();
    if (base.answers.errand) return;
    commit({ ...base, answers: { ...base.answers, errand } });
  },

  goTo(step: StepId) {
    const base = current();
    if (base.lastStep === step) return;
    commit({ ...base, lastStep: step });
  },

  complete(section: SectionId, next: StepId) {
    const base = current();
    const completed = base.completed.includes(section) ? base.completed : [...base.completed, section];
    commit({ ...base, completed, lastStep: next });
  },

  attest(on: boolean) {
    const base = current();
    commit({ ...base, attestedAt: on ? Date.now() : null });
  },

  dismissNudge() {
    const base = current();
    commit({ ...base, nudgeDismissedAt: Date.now() });
  },

  /** Wipes the draft, and the saved details that fill in new ones, from this browser. */
  clear() {
    profileStore.clear();
    draft = EMPTY;
    loaded = true;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored that we could remove.
    }
    emit();
  },
};
