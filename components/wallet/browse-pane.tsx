"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import {
  lanesLabel,
  modeName,
  presentClock,
  presentHours,
  presentPortStatus,
  waitLabel,
} from "@/lib/i18n";
import { cityPinKey } from "@/lib/pin-store";
import {
  cardBackground,
  crossingStream,
  defaultMode,
  MODE_IDS,
  paletteFor,
  portName,
  readLane,
  TONE_DOT,
} from "@/lib/ports";
import { AverageWait } from "./average-wait";
import { CrossingCamera } from "./crossing-camera";
import { HapticPad } from "./haptic-pad";
import { shownAverage, useLaneAverages } from "./use-lane-averages";
import { haptic } from "@/lib/haptics";
import { AccountButton } from "./account-button";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch";
import {
  BookmarkIcon,
  type BookmarkIconHandle,
} from "@heroicons-animated/react/bookmark";
import { CheckIcon } from "@heroicons-animated/react/check";
import { MagnifyingGlassIcon } from "@heroicons-animated/react/magnifying-glass";
import { PlusIcon } from "@heroicons-animated/react/plus";
import { XMarkIcon } from "@heroicons-animated/react/x-mark";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { SPRING } from "./motion";

// Fixed locale so server and client sort identically (avoids hydration mismatches).
const COLLATOR = new Intl.Collator("en-US");

type BorderFilter = "mexican" | "canadian" | "all";

const FILTERS: { id: BorderFilter; label: "mexico" | "canada" | "all" }[] = [
  { id: "mexican", label: "mexico" },
  { id: "canadian", label: "canada" },
  { id: "all", label: "all" },
];

type Props = {
  ports: PortWaitTime[];
  loading: boolean;
  error: boolean;
  saved: ReadonlySet<string>;
  /** Newest pin first. */
  pins: readonly string[];
  onToggle: (port: PortWaitTime) => void;
  onPin: (border: string, city: string) => void;
  onRetry: () => void;
};

type Row = {
  port: PortWaitTime;
  city: string;
  title: string;
  search: string;
  pinKey: string;
};

type Block = {
  id: string;
  city: string | null;
  pinKey: string | null;
  rows: Row[];
  pinned: boolean;
};

export function BrowsePane({
  ports,
  loading,
  error,
  saved,
  pins,
  onToggle,
  onPin,
  onRetry,
}: Props) {
  const { copy } = useLocale();
  const [border, setBorder] = useState<BorderFilter>("mexican");
  const [query, setQuery] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      ports
        .map((port) => {
          const name = portName(port);
          return {
            port,
            city: name.city,
            title: name.title,
            pinKey: cityPinKey(port.border, name.city),
            search:
              `${name.city} ${name.crossing ?? ""} ${port.crossingName ?? ""} ${port.portNumber}`.toLowerCase(),
          };
        })
        .sort(
          (a, b) =>
            COLLATOR.compare(a.city, b.city) ||
            COLLATOR.compare(a.title, b.title),
        ),
    [ports],
  );

  const counts = useMemo(
    () => ({
      mexican: rows.filter((r) => r.port.border.toLowerCase().includes("mexic"))
        .length,
      canadian: rows.filter((r) =>
        r.port.border.toLowerCase().includes("canad"),
      ).length,
      all: rows.length,
    }),
    [rows],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = rows.filter((row) => {
      const borderOk =
        border === "all" ||
        (border === "mexican"
          ? row.port.border.toLowerCase().includes("mexic")
          : row.port.border.toLowerCase().includes("canad"));
      return borderOk && (needle === "" || row.search.includes(needle));
    });
    const pinIndex = new Map(pins.map((key, index) => [key, index]));
    const byCity = new Map<string, Row[]>();
    for (const row of visible) {
      const list = byCity.get(row.pinKey);
      if (list) list.push(row);
      else byCity.set(row.pinKey, [row]);
    }

    // Pinned cities lead, in the order they were pinned. Everyone else stays alphabetical.
    // A city with one crossing named after itself needs no header, so those fold into a
    // headerless run instead of repeating "Andrade / Andrade". A pinned city always gets a header.
    const pinned: Block[] = [];
    const rest: Block[] = [];
    let loose: Row[] = [];
    const flush = () => {
      if (loose.length === 0) return;
      rest.push({
        id: `loose-${loose[0].port.portNumber}`,
        city: null,
        pinKey: null,
        rows: loose,
        pinned: false,
      });
      loose = [];
    };

    for (const [pinKey, list] of byCity) {
      const city = list[0].city;
      const bare = list.length === 1 && list[0].title === city;
      if (pinIndex.has(pinKey)) {
        flush();
        pinned.push({ id: pinKey, city, pinKey, rows: list, pinned: true });
      } else if (bare) {
        loose.push(list[0]);
      } else {
        flush();
        rest.push({ id: pinKey, city, pinKey, rows: list, pinned: false });
      }
    }
    flush();
    pinned.sort(
      (a, b) => (pinIndex.get(a.id) ?? 0) - (pinIndex.get(b.id) ?? 0),
    );
    return [...pinned, ...rest];
  }, [rows, border, query, pins]);

  let rowIndex = 0;

  return (
    <div>
      <header className="flex min-h-[4.5rem] items-end justify-between gap-4 pb-5">
        <div>
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">
            {copy.crossings}
          </h2>
          <p className="mt-2 text-[14px] leading-none text-muted">
            {loading ? copy.loading : copy.reportedCount(counts.all)}
          </p>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeSwitch />
          <LanguageSwitch />
          <AccountButton />
        </div>
      </header>

      <SearchField value={query} onChange={setQuery} />

      <div
        role="radiogroup"
        aria-label={copy.border}
        className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 py-1"
      >
        {FILTERS.map((filter) => {
          const active = filter.id === border;
          return (
            <button
              key={filter.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (active) return;
                haptic("selection");
                setBorder(filter.id);
              }}
              className={cn(
                "relative h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-200",
                active
                  ? "text-accent-ink"
                  : "text-foreground active:opacity-60",
              )}
            >
              {!active && <HapticPad />}
              {active && (
                <motion.span
                  layoutId="border-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={SPRING.snap}
                />
              )}
              {!active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-surface"
                />
              )}
              <span className="relative">
                {copy[filter.label]}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    active ? "opacity-75" : "text-muted",
                  )}
                >
                  {counts[filter.id]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-7" key={border}>
        {loading ? (
          <ListSkeleton />
        ) : error && ports.length === 0 ? (
          <ErrorState onRetry={onRetry} />
        ) : groups.length === 0 ? (
          <NoResults query={query} onClear={() => setQuery("")} />
        ) : (
          groups.map((block) => {
            const start = rowIndex;
            rowIndex += block.rows.length;
            return (
              <CityBlock
                key={block.id}
                block={block}
                start={start}
                saved={saved}
                onToggle={onToggle}
                onPin={onPin}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function CityBlock({
  block,
  start,
  saved,
  onToggle,
  onPin,
}: {
  block: Block;
  start: number;
  saved: ReadonlySet<string>;
  onToggle: (port: PortWaitTime) => void;
  onPin: (border: string, city: string) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      layout={reduce ? false : "position"}
      transition={SPRING.move}
      aria-label={block.city ?? undefined}
    >
      {block.city && block.pinKey && (
        <div className="mb-2.5 flex h-9 items-center justify-between gap-3 pl-1">
          <h3
            className={cn(
              "truncate text-[13px] leading-none font-semibold tracking-[0.01em]",
              block.pinned ? "text-foreground" : "text-muted",
            )}
          >
            {block.city}
          </h3>
          <PinButton
            pinned={block.pinned}
            label={block.city}
            onClick={() => onPin(block.rows[0].port.border, block.city!)}
          />
        </div>
      )}
      <ul className="space-y-2">
        {block.rows.map((row, index) => (
          <li
            key={row.port.portNumber}
            className="rise"
            style={{ "--i": start + index } as CSSProperties}
          >
            <CrossingRow
              row={row}
              added={saved.has(row.port.portNumber)}
              onToggle={() => onToggle(row.port)}
              onPin={
                block.city === null
                  ? () => onPin(row.port.border, row.city)
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function PinButton({
  pinned,
  label,
  onClick,
}: {
  pinned: boolean;
  label: string;
  onClick: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const icon = useRef<BookmarkIconHandle>(null);

  return (
    <motion.button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? copy.removeBookmark(label) : copy.bookmark(label)}
      onClick={onClick}
      onPointerEnter={() => icon.current?.startAnimation()}
      onPointerLeave={() => icon.current?.stopAnimation()}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      transition={SPRING.snap}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full",
        pinned
          ? "bg-accent/15 text-accent"
          : "text-muted active:bg-surface-strong",
      )}
    >
      <HapticPad />
      <BookmarkIcon
        ref={icon}
        size={18}
        aria-hidden
        className={pinned ? "[&_svg]:fill-current" : undefined}
      />
    </motion.button>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { copy } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <label htmlFor="crossing-search" className="sr-only">
        {copy.searchLabel}
      </label>
      <span className="search-glyph pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
        <MagnifyingGlassIcon size={18} aria-hidden />
      </span>
      <input
        ref={inputRef}
        id="crossing-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={copy.searchPlaceholder}
        className="search-field h-12 w-full appearance-none rounded-2xl pr-11 pl-11 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:hidden"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            aria-label={copy.clearSearch}
            onClick={() => {
              haptic("light");
              onChange("");
              inputRef.current?.focus();
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={SPRING.snap}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface-strong text-muted"
          >
            <HapticPad />
            <XMarkIcon size={16} aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function CrossingRow({
  row,
  added,
  onToggle,
  onPin,
}: {
  row: Row;
  added: boolean;
  onToggle: () => void;
  /** Present when this row is the whole city, so the pin lives on the row. */
  onPin?: () => void;
}) {
  const { copy } = useLocale();
  const { port } = row;
  const mode = defaultMode(port);
  const reading = readLane(port, mode);
  const palette = paletteFor(port.portNumber);
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();
  const panelId = `details-${port.portNumber}`;
  const lanes = MODE_IDS.filter((id) => readLane(port, id).available);
  const averages = useLaneAverages(open ? port.portNumber : null);
  const stream = crossingStream(port);

  return (
    <div className="rounded-2xl bg-surface">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            open ? copy.hideDetails(row.title) : copy.showDetails(row.title)
          }
          onClick={() => {
            haptic("light");
            setOpen((v) => !v);
          }}
          className="relative flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
        >
          <HapticPad />
          <div
            aria-hidden
            className="relative h-9 w-14 shrink-0 overflow-hidden rounded-lg"
            style={{
              background: cardBackground(palette),
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.25)",
            }}
          >
            <span className="absolute inset-x-1.5 top-1.5 h-0.5 rounded-full bg-white/40" />
            <span className="absolute inset-x-1.5 top-3 h-0.5 w-5 rounded-full bg-white/25" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] leading-tight font-semibold tracking-[-0.015em]">
              {row.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] leading-none text-muted">
              {reading.minutes !== null && (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    TONE_DOT[reading.tone],
                  )}
                />
              )}
              <span className="truncate">
                {modeName(mode, port, copy)}, {waitLabel(reading, copy)}
              </span>
            </p>
          </div>

          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={cn(
              "size-4 shrink-0 text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 8 5 5 5-5" />
          </svg>
        </button>

        {onPin && <PinButton pinned={false} label={row.city} onClick={onPin} />}
        <AddButton added={added} label={row.title} onToggle={onToggle} />
      </div>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="space-y-2.5 px-3 pb-3">
            {open && stream && <CrossingCamera src={stream} name={row.title} />}
            <div className="grid grid-cols-2 gap-2">
              {lanes.map((id) => {
                const lane = readLane(port, id);
                const average = shownAverage(
                  averages.data,
                  id,
                  port.time,
                  lane.available,
                );
                return (
                  <div
                    key={id}
                    className="rounded-xl bg-surface-strong px-3 py-2.5"
                  >
                    <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-muted">
                      {modeName(id, port, copy)}
                      {lane.minutes !== null && (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            TONE_DOT[lane.tone],
                          )}
                        />
                      )}
                    </span>
                    <span className="mt-1 block text-[18px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
                      {lane.minutes !== null ? (
                        <>
                          {lane.minutes}
                          <span className="ml-1 text-[12px] font-medium tracking-normal text-muted">
                            {copy.minuteUnit}
                          </span>
                        </>
                      ) : (
                        <span className="text-[14px]">
                          {waitLabel(lane, copy)}
                        </span>
                      )}
                    </span>
                    <AverageWait
                      minutes={average}
                      className="mt-1 block text-[11px] leading-none font-medium text-muted tabular-nums"
                    />
                    <span className="mt-1 block truncate text-[11px] leading-none text-muted">
                      {lanesLabel(lane, copy)}
                    </span>
                  </div>
                );
              })}
            </div>

            {port.constructionNotice && (
              <p className="rounded-xl bg-surface-strong px-3 py-2.5 text-[13px] leading-snug">
                {port.constructionNotice}
              </p>
            )}

            <dl className="rounded-xl bg-surface-strong px-3 text-[13px]">
              <DetailRow
                label={copy.status}
                value={presentPortStatus(port.portStatus, copy)}
              />
              <DetailRow
                label={copy.hours}
                value={presentHours(port.hours, locale, copy)}
              />
              <DetailRow
                label={copy.reported}
                value={
                  reading.reportedAt
                    ? presentClock(reading.reportedAt, locale)
                    : copy.localTime(port.time.slice(0, 5))
                }
              />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function AddButton({
  added,
  label,
  onToggle,
}: {
  added: boolean;
  label: string;
  onToggle: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const plus = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const check = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  return (
    <motion.button
      type="button"
      aria-pressed={added}
      aria-label={
        added ? copy.removeFromWalletNamed(label) : copy.addToWallet(label)
      }
      onClick={onToggle}
      onPointerEnter={() => (added ? check : plus).current?.startAnimation()}
      onPointerLeave={() => (added ? check : plus).current?.stopAnimation()}
      whileTap={reduce ? undefined : { scale: 0.93 }}
      transition={SPRING.snap}
      className={cn(
        "relative grid h-10 w-[6.75rem] shrink-0 place-items-center overflow-hidden rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-200",
        added ? "bg-surface-strong text-accent" : "bg-accent text-accent-ink",
      )}
    >
      <HapticPad />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={added ? "added" : "add"}
          className="flex items-center gap-1"
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.7, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.7, filter: "blur(4px)" }
          }
          transition={SPRING.pop}
        >
          {added ? (
            <>
              <CheckIcon ref={check} size={16} aria-hidden />
              {copy.added}
            </>
          ) : (
            <>
              <PlusIcon ref={plus} size={16} aria-hidden />
              {copy.add}
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl bg-surface p-3"
        >
          <div className="shimmer h-9 w-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3.5 w-2/3 rounded-full" />
            <div className="shimmer h-3 w-1/3 rounded-full" />
          </div>
          <div className="shimmer h-10 w-[6.75rem] rounded-full" />
        </div>
      ))}
    </div>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  const { copy } = useLocale();
  return (
    <div className="rounded-2xl bg-surface px-6 py-10 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.02em]">
        {query ? copy.noMatch(query) : copy.noCrossings}
      </p>
      <p className="mt-1.5 text-[14px] text-muted">{copy.noMatchHint}</p>
      {query && (
        <button
          type="button"
          onClick={() => {
            haptic("light");
            onClear();
          }}
          className="relative mt-4 h-11 rounded-full px-5 text-[15px] font-medium text-accent active:opacity-60"
        >
          <HapticPad />
          {copy.clearSearch}
        </button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { copy } = useLocale();
  return (
    <div role="alert" className="rounded-2xl bg-surface px-6 py-10 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.02em]">
        {copy.loadErrorTitle}
      </p>
      <p className="mt-1.5 text-[14px] text-muted">{copy.loadErrorBody}</p>
      <button
        type="button"
        onClick={onRetry}
        className="relative mt-4 h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink active:opacity-80"
      >
        <HapticPad />
        {copy.tryAgain}
      </button>
    </div>
  );
}
