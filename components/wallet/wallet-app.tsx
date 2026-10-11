"use client";

import { useLocale } from "@/components/locale-provider";
import { NotFoundScreen } from "@/components/not-found-screen";
import type { BorderWaitTimes, PortWaitTime } from "@/lib/border-wait-times";
import { haptic } from "@/lib/haptics";
import { cityPinKey, pinStore } from "@/lib/pin-store";
import { defaultMode, paletteFor, portName, type Mode } from "@/lib/ports";
import { crossingPath, EXPLORE_PATH, parseAppPath } from "@/lib/routes";
import { walletStore } from "@/lib/wallet-store";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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

const NAV = { scroll: false } as const;

const EMPTY_PORTS: PortWaitTime[] = [];
const noopSubscribe = () => () => {};

async function fetchWaitTimes(): Promise<BorderWaitTimes> {
  const response = await fetch("/api/wait-times");
  if (!response.ok) throw new Error(`Wait times request failed (${response.status})`);
  return response.json();
}

export function WalletApp({ initial }: { initial: BorderWaitTimes | null }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const router = useRouter();
  const route = parseAppPath(pathname);
  const tab: Tab = route.tab;

  // Server renders no saved cards; the client reads localStorage after hydration.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const entries = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
    walletStore.getServerSnapshot,
  );
  const pins = useSyncExternalStore(
    pinStore.subscribe,
    pinStore.getSnapshot,
    pinStore.getServerSnapshot,
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

  const orderReady = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.isOrderReady,
    () => false,
  );

  const routePort = route.port ? byNumber.get(route.port) : undefined;

  const items = useMemo<StackItem[]>(() => {
    const list = entries.flatMap((entry) => {
      const port = byNumber.get(entry.portNumber);
      return port ? [{ port, mode: entry.mode }] : [];
    });
    // A shared card can open before it is saved. Keep it on the front of the stack.
    if (routePort && !list.some((item) => item.port.portNumber === routePort.portNumber)) {
      list.push({ port: routePort, mode: defaultMode(routePort) });
    }
    // Until the one-time seed, keep the old "bookmarks float" order so the stack doesn't jump.
    if (orderReady) return list;
    const pinIndex = new Map(pins.map((key, index) => [key, index]));
    return [...list].sort((a, b) => {
      const ai =
        pinIndex.get(cityPinKey(a.port.border, portName(a.port).city)) ?? Number.POSITIVE_INFINITY;
      const bi =
        pinIndex.get(cityPinKey(b.port.border, portName(b.port).city)) ?? Number.POSITIVE_INFINITY;
      return ai - bi;
    });
  }, [entries, byNumber, pins, orderReady, routePort]);
  const saved = useMemo(() => new Set(entries.map((e) => e.portNumber)), [entries]);

  const [paneFrom, setPaneFrom] = useState(28);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoSaved = useRef(new Set<string>());

  // The open card is the route. If that port leaves the feed, nothing is open.
  const expandedId =
    routePort && items.some((i) => i.port.portNumber === routePort.portNumber)
      ? routePort.portNumber
      : null;
  const openItem = items.find((i) => i.port.portNumber === expandedId) ?? null;
  const openCityPinned = openItem
    ? pins.includes(cityPinKey(openItem.port.border, portName(openItem.port).city))
    : false;

  const showToast = useCallback((next: Omit<ToastState, "id">) => {
    toastId.current += 1;
    setToast({ ...next, id: toastId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const go = useCallback(
    (href: string) => {
      router.push(href, NAV);
    },
    [router],
  );

  useEffect(() => {
    router.prefetch("/");
    router.prefetch(EXPLORE_PATH);
  }, [router]);

  useEffect(() => {
    document.title = openItem
      ? copy.pageTitle(portName(openItem.port).title)
      : tab === "browse"
        ? copy.pageTitle(copy.browse)
        : copy.metaTitle;
  }, [openItem, tab, copy]);

  useEffect(() => {
    if (!hydrated || orderReady) return;
    walletStore.adoptOrder(items.map((item) => item.port.portNumber));
  }, [hydrated, orderReady, items]);

  useEffect(() => {
    if (!hydrated || !routePort || saved.has(routePort.portNumber)) return;
    if (autoSaved.current.has(routePort.portNumber)) return;
    autoSaved.current.add(routePort.portNumber);
    walletStore.add({ portNumber: routePort.portNumber, mode: defaultMode(routePort) });
  }, [hydrated, routePort, saved]);

  useEffect(() => {
    if (!expandedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      haptic("light");
      go("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedId, go]);

  const prevTab = useRef(tab);
  useLayoutEffect(() => {
    if (prevTab.current === tab) return;
    setPaneFrom(tab === "browse" ? 28 : -28);
    prevTab.current = tab;
  }, [tab]);

  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      haptic("selection");
      setPaneFrom(next === "browse" ? 28 : -28);
      go(next === "browse" ? EXPLORE_PATH : "/");
    },
    [tab, go],
  );

  // Mobile scrolls inside the shell, not the document. Start each tab at the top
  // before paint, so the fixed frame (and the bar attached to it) never shifts.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || window.matchMedia("(min-width: 1024px)").matches) return;
    scroller.scrollTop = 0;
  }, [tab]);

  const expand = useCallback(
    (portNumber: string) => {
      haptic("light");
      go(crossingPath(portNumber));
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
    [go, reduce],
  );

  const collapse = useCallback(() => {
    go("/");
  }, [go]);

  const toggleSaved = useCallback(
    (port: PortWaitTime) => {
      const name = portName(port).title;
      if (saved.has(port.portNumber)) {
        const index = entries.findIndex((e) => e.portNumber === port.portNumber);
        const entry = entries[index];
        haptic("heavy");
        if (route.port === port.portNumber) go("/");
        walletStore.remove(port.portNumber);
        showToast({
          message: copy.removedToast(name),
          action: {
            label: copy.undo,
            onClick: () => {
              haptic("success");
              walletStore.insertAt(entry, index);
            },
          },
        });
      } else {
        haptic("success");
        walletStore.add({ portNumber: port.portNumber, mode: defaultMode(port) });
        showToast({
          message: copy.addedToast(name),
          action: {
            label: copy.view,
            onClick: () => go(crossingPath(port.portNumber)),
            mobileOnly: true,
          },
        });
      }
    },
    [saved, entries, showToast, go, copy, route.port],
  );

  const removeOpen = useCallback(
    (portNumber: string) => {
      const index = entries.findIndex((e) => e.portNumber === portNumber);
      const entry = entries[index];
      const port = byNumber.get(portNumber);
      if (!entry || !port) {
        go("/");
        return;
      }
      haptic("heavy");
      go("/");
      walletStore.remove(portNumber);
      showToast({
        message: copy.removedToast(portName(port).title),
        action: {
          label: copy.undo,
          onClick: () => {
            haptic("success");
            walletStore.insertAt(entry, index);
          },
        },
      });
    },
    [entries, byNumber, showToast, copy, go],
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

  const togglePin = useCallback(
    (border: string, city: string) => {
      const key = cityPinKey(border, city);
      const pinned = pinStore.toggle(key);
      haptic(pinned ? "success" : "light");
      if (pinned) {
        const portNumbers = entries.flatMap((entry) => {
          const port = byNumber.get(entry.portNumber);
          if (!port) return [];
          return cityPinKey(port.border, portName(port).city) === key ? [entry.portNumber] : [];
        });
        walletStore.bringToFront(portNumbers);
      }
      showToast({ message: pinned ? copy.bookmarkedToast(city) : copy.removedBookmarkToast(city) });
    },
    [entries, byNumber, showToast, copy],
  );

  const reorder = useCallback(
    (portNumber: string, toIndex: number) => {
      const ids = items.map((item) => item.port.portNumber);
      const from = ids.indexOf(portNumber);
      if (from < 0 || from === toIndex) return;
      const next = [...ids];
      const [id] = next.splice(from, 1);
      next.splice(toIndex, 0, id);
      walletStore.orderAs(next);
    },
    [items],
  );

  const addSuggested = useCallback(() => {
    if (suggested.length === 0) return;
    haptic("success");
    walletStore.addMany(suggested.map((p) => ({ portNumber: p.portNumber, mode: defaultMode(p) })));
  }, [suggested]);

  const updatedAt = ports[0]?.time ? ports[0].time.slice(0, 5) : null;

  // Manual refresh only. The minute poll should not scramble numbers someone is reading.
  // Held long enough that a fast response still shows the digits flip.
  const [checking, setChecking] = useState(false);
  const checkGen = useRef(0);
  const checkTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (checkTimer.current) window.clearTimeout(checkTimer.current);
    };
  }, []);

  const refresh = useCallback(() => {
    const gen = ++checkGen.current;
    if (checkTimer.current) window.clearTimeout(checkTimer.current);
    const started = performance.now();
    haptic("light");
    setChecking(true);
    void refetch().then((result) => {
      if (checkGen.current !== gen) return;
      const failed = result.isError;
      const wait = Math.max(0, 750 - (performance.now() - started));
      checkTimer.current = window.setTimeout(() => {
        checkTimer.current = null;
        if (checkGen.current !== gen) return;
        setChecking(false);
        haptic(failed ? "error" : "success");
      }, wait);
    });
  }, [refetch]);

  const feedReady = Boolean(data) && !isPending;
  const missingPort = Boolean(route.port && feedReady && !routePort);
  if (!route.known || missingPort) {
    return <NotFoundScreen />;
  }

  return (
    <div className="relative min-h-[100dvh] max-lg:fixed max-lg:inset-0 max-lg:min-h-0 max-lg:overflow-hidden">
      <Glow palette={openItem && tab === "wallet" ? paletteFor(openItem.port.portNumber) : null} />

      <div
        ref={scrollerRef}
        className="relative mx-auto w-full max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 sm:px-6 max-lg:h-full max-lg:overflow-x-hidden max-lg:overflow-y-auto max-lg:overscroll-y-contain lg:max-w-6xl lg:pb-16"
      >
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
          <section
            className="pane no-scrollbar lg:sticky lg:top-6 lg:-mx-3 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:px-3 lg:pb-6"
            data-active={tab === "wallet"}
            style={{ "--pane-from": `${paneFrom}px` } as CSSProperties}
            aria-label={copy.wallet}
          >
            <WalletPane
              ref={headerRef}
              items={items}
              hydrated={hydrated}
              loading={isPending && !data}
              refreshing={isFetching || checking}
              checking={checking}
              updatedAt={updatedAt}
              expandedId={expandedId}
              suggested={suggested}
              onExpand={expand}
              onCollapse={collapse}
              onMode={(portNumber: string, mode: Mode) => walletStore.setMode(portNumber, mode)}
              cityPinned={openCityPinned}
              onPinCity={() => {
                if (openItem) togglePin(openItem.port.border, portName(openItem.port).city);
              }}
              onRemove={removeOpen}
              onReorder={reorder}
              onRefresh={refresh}
              onBrowse={() => changeTab("browse")}
              onAddSuggested={addSuggested}
            />
          </section>

          <section
            className="pane"
            data-active={tab === "browse"}
            style={{ "--pane-from": `${paneFrom}px` } as CSSProperties}
            aria-label={copy.browseCrossings}
          >
            <BrowsePane
              ports={ports}
              loading={isPending && !data}
              error={isError}
              saved={saved}
              pins={pins}
              onToggle={toggleSaved}
              onPin={togglePin}
              onRetry={() => {
                haptic("light");
                const started = performance.now();
                void refetch().then((result) => {
                  if (result.isError) haptic("error");
                  else if (performance.now() - started > 280) haptic("success");
                });
              }}
            />
          </section>
        </div>
      </div>

      <TabBar tab={tab} onChange={changeTab} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
