import { isMode, type Mode } from "@/lib/ports";

export type WalletEntry = { portNumber: string; mode: Mode };

const STORAGE_KEY = "usbordertime.wallet.v1";
const EMPTY: readonly WalletEntry[] = [];

let entries: readonly WalletEntry[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isEntry(value: unknown): value is WalletEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.portNumber === "string" && isMode(record.mode);
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    entries = Array.isArray(parsed) ? parsed.filter(isEntry) : EMPTY;
  } catch {
    entries = EMPTY;
  }
  loaded = true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: readonly WalletEntry[]) {
  entries = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the wallet still works for this session.
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    load();
    emit();
  }
}

export const walletStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): readonly WalletEntry[] {
    if (!loaded) load();
    return entries;
  },
  getServerSnapshot(): readonly WalletEntry[] {
    return EMPTY;
  },
  add(entry: WalletEntry) {
    if (entries.some((e) => e.portNumber === entry.portNumber)) return;
    commit([...entries, entry]);
  },
  addMany(next: WalletEntry[]) {
    const fresh = next.filter((n) => !entries.some((e) => e.portNumber === n.portNumber));
    if (fresh.length > 0) commit([...entries, ...fresh]);
  },
  remove(portNumber: string) {
    commit(entries.filter((e) => e.portNumber !== portNumber));
  },
  insertAt(entry: WalletEntry, index: number) {
    if (entries.some((e) => e.portNumber === entry.portNumber)) return;
    const next = [...entries];
    next.splice(Math.min(index, next.length), 0, entry);
    commit(next);
  },
  setMode(portNumber: string, mode: Mode) {
    commit(entries.map((e) => (e.portNumber === portNumber ? { ...e, mode } : e)));
  },
};
