"use client";

import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import {
  cardBackground,
  defaultMode,
  modeLabel,
  paletteFor,
  portName,
  readLane,
  TONE_DOT,
} from "@/lib/ports";
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

const FILTERS: { id: BorderFilter; label: string }[] = [
  { id: "mexican", label: "Mexico" },
  { id: "canadian", label: "Canada" },
  { id: "all", label: "All" },
];

type Props = {
  ports: PortWaitTime[];
  loading: boolean;
  error: boolean;
  saved: ReadonlySet<string>;
  onToggle: (port: PortWaitTime) => void;
  onRetry: () => void;
};

type Row = { port: PortWaitTime; city: string; title: string; search: string };

export function BrowsePane({ ports, loading, error, saved, onToggle, onRetry }: Props) {
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
            search: `${name.city} ${name.crossing ?? ""} ${port.portNumber}`.toLowerCase(),
          };
        })
        .sort((a, b) => COLLATOR.compare(a.city, b.city) || COLLATOR.compare(a.title, b.title)),
    [ports],
  );

  const counts = useMemo(
    () => ({
      mexican: rows.filter((r) => r.port.border.toLowerCase().includes("mexic")).length,
      canadian: rows.filter((r) => r.port.border.toLowerCase().includes("canad")).length,
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
    // Group by city. A city with one crossing named after itself needs no header,
    // so those fold into a single headerless run instead of repeating "Andrade / Andrade".
    const blocks: { city: string | null; rows: Row[] }[] = [];
    const byCity = new Map<string, Row[]>();
    for (const row of visible) {
      const list = byCity.get(row.city);
      if (list) list.push(row);
      else byCity.set(row.city, [row]);
    }
    for (const [city, list] of byCity) {
      const bare = list.length === 1 && list[0].title === city;
      const last = blocks[blocks.length - 1];
      if (bare && last && last.city === null) last.rows.push(list[0]);
      else blocks.push({ city: bare ? null : city, rows: list });
    }
    return blocks;
  }, [rows, border, query]);

  let rowIndex = 0;

  return (
    <div>
      <header className="flex min-h-[4.5rem] items-end pb-5">
        <div>
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">Crossings</h2>
          <p className="mt-2 text-[14px] leading-none text-muted">
            {loading ? "Loading live data" : `${counts.all} crossings reported by CBP`}
          </p>
        </div>
      </header>

      <SearchField value={query} onChange={setQuery} />

      <div
        role="radiogroup"
        aria-label="Border"
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
              onClick={() => setBorder(filter.id)}
              className={cn(
                "relative h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-200",
                active ? "text-accent-ink" : "text-foreground active:opacity-60",
              )}
            >
              {active && (
                <motion.span
                  layoutId="border-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={SPRING.snap}
                />
              )}
              {!active && (
                <span aria-hidden className="absolute inset-0 rounded-full bg-surface" />
              )}
              <span className="relative">
                {filter.label}
                <span className={cn("ml-1.5 tabular-nums", active ? "opacity-75" : "text-muted")}>
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
          groups.map((block) => (
            <section key={block.rows[0].port.portNumber} aria-label={block.city ?? undefined}>
              {block.city && (
                <h3 className="mb-2.5 px-1 text-[13px] leading-none font-semibold tracking-[0.01em] text-muted">
                  {block.city}
                </h3>
              )}
              <ul className="space-y-2">
                {block.rows.map((row) => {
                  const index = rowIndex++;
                  return (
                    <li key={row.port.portNumber} className="rise" style={{ "--i": index } as CSSProperties}>
                      <CrossingRow
                        row={row}
                        added={saved.has(row.port.portNumber)}
                        onToggle={() => onToggle(row.port)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <label htmlFor="crossing-search" className="sr-only">
        Search crossings
      </label>
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
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
        placeholder="Search a bridge or city"
        className="h-12 w-full appearance-none rounded-2xl bg-surface pr-11 pl-11 text-[16px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:hidden"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={SPRING.snap}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface-strong text-muted"
          >
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
}: {
  row: Row;
  added: boolean;
  onToggle: () => void;
}) {
  const { port } = row;
  const mode = defaultMode(port);
  const reading = readLane(port, mode);
  const palette = paletteFor(port.portNumber);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
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
            <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[reading.tone])} />
          )}
          <span className="truncate">
            {modeLabel(mode, port)}, {reading.statusText}
          </span>
        </p>
      </div>

      <AddButton added={added} label={row.title} onToggle={onToggle} />
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
  const reduce = useReducedMotion();
  const plus = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
  const check = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);

  return (
    <motion.button
      type="button"
      aria-pressed={added}
      aria-label={added ? `Remove ${label} from wallet` : `Add ${label} to wallet`}
      onClick={onToggle}
      onPointerEnter={() => (added ? check : plus).current?.startAnimation()}
      onPointerLeave={() => (added ? check : plus).current?.stopAnimation()}
      whileTap={reduce ? undefined : { scale: 0.93 }}
      transition={SPRING.snap}
      className={cn(
        "relative grid h-10 w-[5.5rem] shrink-0 place-items-center overflow-hidden rounded-full text-[14px] font-semibold transition-colors duration-200",
        added ? "bg-surface-strong text-accent" : "bg-accent text-accent-ink",
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={added ? "added" : "add"}
          className="flex items-center gap-1"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, filter: "blur(4px)" }}
          transition={SPRING.pop}
        >
          {added ? (
            <>
              <CheckIcon ref={check} size={16} aria-hidden />
              Added
            </>
          ) : (
            <>
              <PlusIcon ref={plus} size={16} aria-hidden />
              Add
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
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div className="shimmer h-9 w-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3.5 w-2/3 rounded-full" />
            <div className="shimmer h-3 w-1/3 rounded-full" />
          </div>
          <div className="shimmer h-10 w-[5.5rem] rounded-full" />
        </div>
      ))}
    </div>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-10 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.02em]">
        {query ? `No crossings match "${query}"` : "No crossings here"}
      </p>
      <p className="mt-1.5 text-[14px] text-muted">Try a city name or switch borders.</p>
      {query && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 h-11 rounded-full px-5 text-[15px] font-medium text-accent active:opacity-60"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-surface px-6 py-10 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.02em]">Could not load wait times</p>
      <p className="mt-1.5 text-[14px] text-muted">
        The CBP feed did not respond. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink active:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
