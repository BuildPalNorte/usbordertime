import { isMode, type Mode } from "@/lib/ports";

export type WalletEntry = { portNumber: string; mode: Mode };

const STORAGE_KEY = "usbordertime.wallet.v1";
/** Set once the array order has been seeded from the old pin sort. */
const SEEDED_KEY = "usbordertime.wallet.seeded.v1";
const EMPTY: readonly WalletEntry[] = [];

let entries: readonly WalletEntry[] = EMPTY;
let loaded = false;
let orderReady = false;
let orderReadyLoaded = false;
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

function loadOrderReady() {
  try {
    orderReady = window.localStorage.getItem(SEEDED_KEY) === "1";
  } catch {
    orderReady = false;
  }
  orderReadyLoaded = true;
}

function markOrderReady() {
  orderReady = true;
  try {
    window.localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // The in-memory flag still keeps this session from re-seeding.
  }
}

function arrange(portNumbers: readonly string[]): WalletEntry[] {
  const byId = new Map(entries.map((entry) => [entry.portNumber, entry]));
  const ranked: WalletEntry[] = [];
  for (const id of portNumbers) {
    const entry = byId.get(id);
    if (entry) ranked.push(entry);
  }
  const used = new Set(ranked.map((entry) => entry.portNumber));
  const rest = entries.filter((entry) => !used.has(entry.portNumber));
  return [...ranked, ...rest];
}

function sameOrder(next: readonly WalletEntry[]) {
  return (
    next.length === entries.length &&
    next.every((entry, index) => entry.portNumber === entries[index]?.portNumber)
  );
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === SEEDED_KEY) {
    load();
    orderReadyLoaded = false;
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
  /** True once the stack order is the array order, not the old pin sort. */
  isOrderReady(): boolean {
    if (!orderReadyLoaded) loadOrderReady();
    return orderReady;
  },
  /**
   * One-time copy of the pin-sorted stack into the array.
   * Later calls no-op so a manual order is not overwritten on refresh.
   */
  adoptOrder(portNumbers: readonly string[]) {
    if (!orderReadyLoaded) loadOrderReady();
    if (orderReady) return;
    const next = arrange(portNumbers);
    markOrderReady();
    if (sameOrder(next)) emit();
    else commit(next);
  },
  /** Stack order after a drag. Ports missing from the list stay at the end. */
  orderAs(portNumbers: readonly string[]) {
    if (!orderReadyLoaded) loadOrderReady();
    const wasReady = orderReady;
    const next = arrange(portNumbers);
    markOrderReady();
    if (!sameOrder(next)) commit(next);
    else if (!wasReady) emit();
  },
  /** Pinning a city gathers that city's saved cards at the front, in their current order. */
  bringToFront(portNumbers: readonly string[]) {
    const wanted = new Set(portNumbers);
    const front = entries.filter((entry) => wanted.has(entry.portNumber));
    if (front.length === 0) return;
    const rest = entries.filter((entry) => !wanted.has(entry.portNumber));
    const next = [...front, ...rest];
    if (sameOrder(next)) return;
    commit(next);
  },
  setMode(portNumber: string, mode: Mode) {
    commit(entries.map((e) => (e.portNumber === portNumber ? { ...e, mode } : e)));
  },
};
