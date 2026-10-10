"use client";

import type { BorderWaitTimes, PortWaitTime } from "@/lib/border-wait-times";
import { defaultMode, paletteFor, portName, type Mode } from "@/lib/ports";
import { walletStore } from "@/lib/wallet-store";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { BrowsePane } from "./browse-pane";
import type { StackItem } from "./card-stack";
import { Glow } from "./glow";
import { TabBar, type Tab } from "./tab-bar";
import { Toast, type ToastState } from "./toast";
import { WalletPane } from "./wallet-pane";

const EMPTY_PORTS: PortWaitTime[] = [];
const noopSubscribe = () => () => {};

async function fetchWaitTimes(): Promise<BorderWaitTimes> {
  const response = await fetch("/api/wait-times");
  if (!response.ok) throw new Error(`Wait times request failed (${response.status})`);
  return response.json();
}

export function WalletApp({ initial }: { initial: BorderWaitTimes | null }) {
  const reduce = useReducedMotion();

  // Server renders no saved cards; the client reads localStorage after hydration.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const entries = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
    walletStore.getServerSnapshot,
  );

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["wait-times"],
    queryFn: fetchWaitTimes,
    initialData: initial ?? undefined,
    initialDataUpdatedAt: initial ? Date.parse(initial.fetchedAt) : undefined,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const ports = data?.ports ?? EMPTY_PORTS;
  const byNumber = useMemo(() => new Map(ports.map((p) => [p.portNumber, p])), [ports]);

  const items = useMemo<StackItem[]>(
    () =>
      entries.flatMap((entry) => {
        const port = byNumber.get(entry.portNumber);
        return port ? [{ port, mode: entry.mode }] : [];
      }),
    [entries, byNumber],
  );
  const saved = useMemo(() => new Set(entries.map((e) => e.portNumber)), [entries]);

  const [tab, setTab] = useState<Tab>("wallet");
  const [paneFrom, setPaneFrom] = useState(28);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // Derived: if the open card disappears (removed, or dropped from the feed), nothing is open.
  const expandedId =
    requestedId !== null && items.some((i) => i.port.portNumber === requestedId)
      ? requestedId
      : null;
  const openItem = items.find((i) => i.port.portNumber === expandedId) ?? null;

  const showToast = useCallback((next: Omit<ToastState, "id">) => {
    toastId.current += 1;
    setToast({ ...next, id: toastId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!expandedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRequestedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedId]);

  const changeTab = useCallback((next: Tab) => {
    setPaneFrom(next === "browse" ? 28 : -28);
    setTab(next);
  }, []);

  const expand = useCallback(
    (portNumber: string) => {
      setRequestedId(portNumber);
      // Bring the header (and the Done button) into view so the open card never lands off-screen.
      const behavior = reduce ? "auto" : "smooth";
      const header = headerRef.current;
      if (window.matchMedia("(min-width: 1024px)").matches) {
        // Desktop: the wallet scrolls inside its own sticky pane; leave the page where it is.
        header?.closest("section")?.scrollTo({ top: 0, behavior });
      } else {
        header?.scrollIntoView({ block: "start", behavior });
      }
    },
    [reduce],
  );

  const toggleSaved = useCallback(
    (port: PortWaitTime) => {
      const name = portName(port).title;
      if (saved.has(port.portNumber)) {
        const index = entries.findIndex((e) => e.portNumber === port.portNumber);
        const entry = entries[index];
        walletStore.remove(port.portNumber);
        showToast({
          message: `Removed ${name}`,
          action: { label: "Undo", onClick: () => walletStore.insertAt(entry, index) },
        });
      } else {
        walletStore.add({ portNumber: port.portNumber, mode: defaultMode(port) });
        showToast({
          message: `Added ${name}`,
          action: { label: "View", onClick: () => changeTab("wallet"), mobileOnly: true },
        });
      }
    },
    [saved, entries, showToast, changeTab],
  );

  const removeOpen = useCallback(
    (portNumber: string) => {
      const index = entries.findIndex((e) => e.portNumber === portNumber);
      const entry = entries[index];
      const port = byNumber.get(portNumber);
      if (!entry || !port) return;
      setRequestedId(null);
      walletStore.remove(portNumber);
      showToast({
        message: `Removed ${portName(port).title}`,
        action: { label: "Undo", onClick: () => walletStore.insertAt(entry, index) },
      });
    },
    [entries, byNumber, showToast],
  );

  const suggested = useMemo(
    () =>
      ports.filter(
        (p) =>
          p.border.toLowerCase().includes("mexic") &&
          portName(p).city === "Brownsville" &&
          !saved.has(p.portNumber),
      ),
    [ports, saved],
  );

  const addSuggested = useCallback(() => {
    walletStore.addMany(suggested.map((p) => ({ portNumber: p.portNumber, mode: defaultMode(p) })));
  }, [suggested]);

  const updatedAt = ports[0]?.time ? ports[0].time.slice(0, 5) : null;

  return (
    <div className="relative min-h-[100dvh]">
      <Glow palette={openItem && tab === "wallet" ? paletteFor(openItem.port.portNumber) : null} />

      <div className="relative mx-auto w-full max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 sm:px-6 lg:max-w-6xl lg:pb-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
          <section
            className="pane no-scrollbar lg:sticky lg:top-6 lg:-mx-3 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:px-3 lg:pb-6"
            data-active={tab === "wallet"}
            style={{ "--pane-from": `${paneFrom}px` } as CSSProperties}
            aria-label="Wallet"
          >
            <WalletPane
              ref={headerRef}
              items={items}
              hydrated={hydrated}
              loading={isPending && !data}
              refreshing={isFetching}
              updatedAt={updatedAt}
              expandedId={expandedId}
              suggested={suggested}
              onExpand={expand}
              onCollapse={() => setRequestedId(null)}
              onMode={(portNumber: string, mode: Mode) => walletStore.setMode(portNumber, mode)}
              onRemove={removeOpen}
              onRefresh={() => void refetch()}
              onBrowse={() => changeTab("browse")}
              onAddSuggested={addSuggested}
            />
          </section>

          <section
            className="pane"
            data-active={tab === "browse"}
            style={{ "--pane-from": `${paneFrom}px` } as CSSProperties}
            aria-label="Browse crossings"
          >
            <BrowsePane
              ports={ports}
              loading={isPending && !data}
              error={isError}
              saved={saved}
              onToggle={toggleSaved}
              onRetry={() => void refetch()}
            />
          </section>
        </div>
      </div>

      <TabBar tab={tab} count={items.length} onChange={changeTab} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
