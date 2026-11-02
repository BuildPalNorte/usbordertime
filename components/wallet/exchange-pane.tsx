"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { trackExchange } from "@/lib/exchange-use";
import { haptic } from "@/lib/haptics";
import type { Copy } from "@/lib/i18n";
import {
  amountField,
  cleanAmount,
  convert,
  fetchRate,
  freshAmount,
  otherCurrency,
  parseAmount,
  RATE_CREDIT_URL,
  RATE_REFRESH_MS,
  type Currency,
  type Rate,
} from "@/lib/rate";
import { rateStore } from "@/lib/rate-store";
import { fetchTrend, TREND_REFRESH_MS, withLatest } from "@/lib/rate-trend";
import { rateTrendStore } from "@/lib/rate-trend-store";
import {
  ArrowsUpDownIcon,
  type ArrowsUpDownIconHandle,
} from "@heroicons-animated/react/arrows-up-down";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { usePublishPaneChrome } from "./pane-header";
import { RateTrend } from "./rate-trend";

type Props = {
  /** This tab owns the phone header, which stays put while the body slides. */
  ownsHeader: boolean;
};

/** Round amounts a rider reaches for, in the currency they are holding. */
const QUICK: Record<Currency, readonly number[]> = {
  USD: [20, 50, 100, 200, 500],
  MXN: [200, 500, 1000, 2000, 5000],
};

/** One dollar, so the two fields open on the rate itself. Typing replaces it. */
const START_AMOUNT = "1";

/** Long numbers step down so they stay on one line inside the card. */
function amountSize(text: string): string {
  if (text.length > 14) return "text-[26px]";
  if (text.length > 10) return "text-[32px]";
  return "text-[40px]";
}

/** The first clause of the quote line: a local moment, or the weekend's daily fix. */
function quoteWhen(rate: Rate, tag: string, copy: Copy): string | null {
  const at = Date.parse(rate.asOf);
  if (Number.isNaN(at)) return null;
  const when = new Date(at);
  if (rate.live) {
    return new Intl.DateTimeFormat(tag, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(when);
  }
  // A daily reference belongs to a calendar day, not a moment. Read that day as UTC.
  const day = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(when);
  return copy.exchangeDaily(day);
}

/**
 * Google's quote footer: when the rate was taken, who published it, and the disclaimer.
 * The credit link is required on the free plan.
 */
function QuoteMeta({
  when,
  asOf,
  stale,
  copy,
}: {
  when: string | null;
  asOf: string;
  stale: boolean;
  copy: Copy;
}) {
  const [open, setOpen] = useState(false);
  const noteId = useId();

  return (
    <div className="px-4">
      <p className="text-[13px] leading-snug text-muted">
        {when && (
          <>
            <time dateTime={asOf} className="tabular-nums">
              {when}
            </time>
            <span aria-hidden>{" · "}</span>
          </>
        )}
        <a
          href={RATE_CREDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-foreground/25 underline-offset-[3px]"
        >
          {copy.exchangeCredit}
        </a>
        <span aria-hidden>{" · "}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={noteId}
          onClick={() => {
            haptic("selection");
            setOpen((value) => !value);
          }}
          className="cursor-pointer underline decoration-foreground/25 underline-offset-[3px]"
        >
          {copy.exchangeDisclaimer}
        </button>
      </p>
      {stale && <p className="mt-1.5 text-[13px] leading-snug text-muted">{copy.exchangeStale}</p>}
      {open && (
        <p id={noteId} className="mt-1.5 text-[13px] leading-snug text-muted">
          {copy.exchangeNote}
        </p>
      )}
    </div>
  );
}

export function ExchangePane({ ownsHeader }: Props) {
  const { locale, copy } = useLocale();
  const reduce = useReducedMotion();
  const tag = locale === "es" ? "es-MX" : "en-US";
  const [from, setFrom] = useState<Currency>("USD");
  const [amount, setAmount] = useState(START_AMOUNT);
  const swapIcon = useRef<ArrowsUpDownIconHandle>(null);
  // True from pointer down until pointer up, so a click can be told from a keyboard focus.
  const pointing = useRef(false);
  // A finger tap must not select the number: the phone opens its edit menu for a selection.
  // The next key replaces the amount instead.
  const replaceOnType = useRef(false);
  const touchedAt = useRef(0);

  usePublishPaneChrome(
    ownsHeader,
    {
      subtitle: copy.exchangeSubtitle,
      action: "none",
      checking: false,
      refreshing: false,
    },
    { onRefresh: () => {}, onDone: () => {}, onAdd: () => {} },
  );

  // The last rate this browser got, so there is a number before the call comes back.
  const saved = useSyncExternalStore(
    rateStore.subscribe,
    rateStore.getSnapshot,
    rateStore.getServerSnapshot,
  );
  // Only while this tab is open. The feed is capped per IP address, and a phone that
  // never opens Cambio should not spend any of it.
  const query = useQuery({
    queryKey: ["rate"],
    queryFn: async ({ signal }) => {
      const next = await fetchRate(signal);
      rateStore.save(next);
      return next;
    },
    enabled: ownsHeader,
    staleTime: RATE_REFRESH_MS / 2,
    refetchInterval: RATE_REFRESH_MS,
    retry: false,
  });
  const rate: Rate | null = query.data ?? saved;

  // One daily range, once, and cached for hours: it costs the same shared IP budget as the
  // rate. The line ends on the converter's own number when that number is a live quote.
  const savedTrend = useSyncExternalStore(
    rateTrendStore.subscribe,
    rateTrendStore.getSnapshot,
    rateTrendStore.getServerSnapshot,
  );
  const trendQuery = useQuery({
    queryKey: ["rate-trend"],
    queryFn: async ({ signal }) => {
      const next = await fetchTrend(signal);
      rateTrendStore.save(next);
      return next;
    },
    enabled: ownsHeader,
    staleTime: TREND_REFRESH_MS,
    refetchInterval: TREND_REFRESH_MS,
    retry: false,
  });
  const dailyPoints = trendQuery.data ?? savedTrend;
  const trendPoints = useMemo(
    () => (dailyPoints ? withLatest(dailyPoints, rate) : null),
    [dailyPoints, rate],
  );

  const money = useMemo(
    () => new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [tag],
  );
  const chip = useMemo(() => new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }), [tag]);

  const to = otherCurrency(from);
  const value = parseAmount(amount);
  const result = rate && value !== null ? convert(value, rate.mxn, from) : null;
  // A rate that never loaded is a dash, not a zero someone could read as a result.
  const resultText = result !== null ? money.format(result) : rate ? money.format(0) : "-";
  const when = rate ? quoteWhen(rate, tag, copy) : null;

  // Count what they settle on, not every key: the amount must sit still for a moment. The
  // untouched starting amount and a repeat of the last one are not counted.
  const lastTracked = useRef(`USD:${START_AMOUNT}`);
  const rateMxn = rate?.mxn ?? null;
  useEffect(() => {
    if (!ownsHeader || value === null || value <= 0 || rateMxn === null) return;
    const key = `${from}:${amount}`;
    if (key === lastTracked.current) return;
    const timer = setTimeout(() => {
      lastTracked.current = key;
      trackExchange(from, value, from === "USD" ? value : value / rateMxn);
    }, 2000);
    return () => clearTimeout(timer);
  }, [ownsHeader, from, amount, value, rateMxn]);

  function swap() {
    haptic("selection");
    if (!reduce) swapIcon.current?.startAnimation();
    // What you would get becomes what you have, so the two numbers trade places.
    if (result !== null) setAmount(amountField(result));
    setFrom(to);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
  }

  function armTouch() {
    replaceOnType.current = true;
    touchedAt.current = Date.now();
  }

  function onAmountPointerDown(event: ReactPointerEvent<HTMLInputElement>) {
    pointing.current = true;
    if (event.pointerType === "touch") armTouch();
  }

  function onAmountPointerUp() {
    pointing.current = false;
  }

  function onAmountFocus(event: FocusEvent<HTMLInputElement>) {
    // A mouse click selects once the button is up. Selecting while it is down makes the
    // desktop open the edit menu. A touch never selects; the phone would open its menu.
    if (pointing.current || replaceOnType.current) return;
    if (!event.currentTarget.matches(":focus-visible")) return;
    event.currentTarget.select();
  }

  function onAmountClick(event: MouseEvent<HTMLInputElement>) {
    if (replaceOnType.current) return;
    event.currentTarget.select();
  }

  function onAmountContextMenu(event: MouseEvent<HTMLInputElement>) {
    // A tap can still raise the menu on its own. A long press, which is how you paste, is slower.
    if (Date.now() - touchedAt.current < 400) event.preventDefault();
  }

  function onAmountChange(event: ChangeEvent<HTMLInputElement>) {
    const next = cleanAmount(event.target.value);
    if (!replaceOnType.current) {
      setAmount(next);
      return;
    }
    replaceOnType.current = false;
    setAmount(freshAmount(amount, next));
  }

  return (
    <div className="lg:max-w-lg">
      <header className="hidden min-h-[4.5rem] shrink-0 items-end justify-between gap-4 pb-5 lg:flex">
        <div className="min-w-0">
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">
            {copy.exchange}
          </h2>
          <p className="mt-2 truncate text-[14px] leading-none text-muted">
            {copy.exchangeSubtitle}
          </p>
        </div>
      </header>

      <div className="pane-body flex flex-col gap-5">
        <div className="relative rounded-3xl bg-surface">
          {[from, to].map((code, index) => (
            <motion.div
              key={code}
              layout={reduce ? false : "position"}
              transition={SPRING.move}
              className={cn(
                "px-5 py-6",
                index === 0 && "rounded-t-3xl focus-within:bg-foreground/[0.04]",
              )}
            >
              <p className="text-[13px] leading-none text-muted">
                {index === 0 ? copy.exchangeHave : copy.exchangeGet}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                {index === 0 ? (
                  <input
                    value={amount}
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="0"
                    aria-label={`${copy.exchangeHave} ${code}`}
                    onChange={onAmountChange}
                    onTouchStart={armTouch}
                    onPointerDown={onAmountPointerDown}
                    onPointerUp={onAmountPointerUp}
                    onPointerCancel={onAmountPointerUp}
                    onFocus={onAmountFocus}
                    onClick={onAmountClick}
                    onContextMenu={onAmountContextMenu}
                    onBlur={() => {
                      replaceOnType.current = false;
                    }}
                    onKeyDown={onKeyDown}
                    className={cn(
                      "min-w-0 flex-1 bg-transparent leading-[1.15] font-bold tracking-[-0.03em] tabular-nums caret-accent placeholder:text-muted",
                      amountSize(amount),
                    )}
                  />
                ) : (
                  <output
                    aria-live="polite"
                    aria-busy={!rate && !query.isError}
                    className={cn(
                      "block min-w-0 flex-1 truncate leading-[1.15] font-bold tracking-[-0.03em] tabular-nums",
                      amountSize(resultText),
                      (result === null || value === 0) && "text-muted",
                    )}
                  >
                    {!rate && !query.isError ? (
                      <span aria-hidden className="shimmer block h-[46px] w-40 rounded-2xl" />
                    ) : (
                      resultText
                    )}
                  </output>
                )}
                <span className="shrink-0 rounded-full bg-foreground/[0.07] px-3 py-1.5 text-[15px] font-semibold tracking-wide">
                  {code}
                </span>
              </div>
            </motion.div>
          ))}

          <div aria-hidden className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-foreground/10" />
          <div className="absolute top-1/2 right-5 -translate-y-1/2">
            <motion.button
              type="button"
              onClick={swap}
              aria-label={copy.exchangeSwap}
              whileTap={reduce ? undefined : { scale: 0.92 }}
              transition={SPRING.snap}
              className="relative grid size-10 cursor-pointer place-items-center rounded-full bg-accent text-accent-ink ring-4 ring-surface"
            >
              <HapticPad />
              <ArrowsUpDownIcon ref={swapIcon} size={20} aria-hidden />
            </motion.button>
          </div>
        </div>

        <div className="no-scrollbar -mt-1 flex gap-2 overflow-x-auto">
          {QUICK[from].map((quick) => {
            const active = value === quick;
            return (
              <motion.button
                key={`${from}-${quick}`}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  haptic("selection");
                  setAmount(String(quick));
                }}
                whileTap={reduce ? undefined : { scale: 0.95 }}
                transition={SPRING.snap}
                className={cn(
                  "relative h-10 shrink-0 cursor-pointer rounded-full px-4 text-[14px] font-medium tabular-nums",
                  active ? "bg-accent text-accent-ink" : "bg-surface text-foreground",
                )}
              >
                <HapticPad />
                {chip.format(quick)}
              </motion.button>
            );
          })}
        </div>

        {!rate && query.isError ? (
          <div className="flex flex-col items-start gap-3 px-2">
            <p role="alert" className="text-[15px] leading-snug text-muted">
              {copy.exchangeError}
            </p>
            <motion.button
              type="button"
              onClick={() => {
                haptic("light");
                void query.refetch();
              }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={SPRING.snap}
              className="relative h-10 cursor-pointer rounded-full bg-surface px-5 text-[15px] font-semibold"
            >
              <HapticPad />
              {copy.tryAgain}
            </motion.button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <RateTrend
            points={trendPoints}
            pending={trendQuery.isPending}
            failed={trendQuery.isError}
            onRetry={() => void trendQuery.refetch()}
          />
          {rate ? (
            <QuoteMeta when={when} asOf={rate.asOf} stale={query.isError} copy={copy} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
