"use client";

import {
  ACCOUNT_SORT,
  accountLocationUrl,
  DEFAULT_ACCOUNT_FILTER,
  formatAccountLocation,
  listedAccounts,
  sortedAccounts,
  STEP_LABEL,
  STEPS,
  type AccountFilter,
  type AccountSort,
  type Connected,
} from "@/lib/admin-insights";
import { formatAgo, formatMoment } from "@/lib/admin-time";
import { haptic } from "@/lib/haptics";
import { REFERRAL_LABEL, REFERRALS } from "@/lib/referral";
import { cn } from "@/lib/cn";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const ACTIVITY: { value: AccountFilter["activity"]; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "week", label: "Active this week" },
  { value: "idle", label: "Did nothing yet" },
];

const SOURCE: { value: AccountFilter["source"]; label: string }[] = [
  { value: "any", label: "Any" },
  ...REFERRALS.map((key) => ({ value: key, label: REFERRAL_LABEL[key] })),
  { value: "choosing", label: "Still choosing" },
  { value: "unknown", label: "Joined before we asked" },
];

const LOCALE: { value: AccountFilter["locale"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "unset", label: "Not chosen" },
];

const INVITE: { value: AccountFilter["invite"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "brought", label: "Brought someone" },
  { value: "invited", label: "Came from someone" },
];

const REACHED: { value: AccountFilter["step"]; label: string }[] = [
  { value: "any", label: "Any" },
  ...STEPS.map((key) => ({ value: key, label: STEP_LABEL[key] })),
];

const GROUPS = [
  { key: "activity", options: ACTIVITY },
  { key: "source", options: SOURCE },
  { key: "locale", options: LOCALE },
  { key: "invite", options: INVITE },
  { key: "step", options: REACHED },
] as const;

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** Small stats an account owns, in the order a person would ask about them. */
function facts(account: Connected): { label: string; value: string; href?: string }[] {
  return [
    {
      label: "Location",
      value: account.location ? formatAccountLocation(account.location) : "Not shared",
      href: account.location ? accountLocationUrl(account.location) : undefined,
    },
    { label: "Days opened", value: account.days.toLocaleString("en-US") },
    {
      label: "Streak",
      value: `${account.streak.current} now, ${account.streak.longest} best`,
    },
    { label: "Crossings saved", value: String(account.saved) },
    { label: "City bookmarks", value: String(account.pins) },
    { label: "Wait alerts", value: String(account.alerts) },
    { label: "Alarms", value: `${account.alarmsOn} on of ${account.alarms}` },
    { label: "Devices", value: String(account.devices) },
    { label: "Questions", value: String(account.questions) },
    { label: "Language", value: account.locale === "es" ? "Spanish" : account.locale === "en" ? "English" : "Not chosen" },
  ];
}

function activeChoices(filter: AccountFilter): string[] {
  return GROUPS.flatMap((group) => {
    if (filter[group.key] === DEFAULT_ACCOUNT_FILTER[group.key]) return [];
    const label = group.options.find((option) => option.value === filter[group.key])?.label;
    return label ? [label] : [];
  });
}

function FilterRow<K extends keyof AccountFilter>({
  name,
  label,
  options,
  filter,
  accounts,
  query,
  now,
  onPick,
}: {
  name: K;
  label: string;
  options: readonly { value: AccountFilter[K]; label: string }[];
  filter: AccountFilter;
  accounts: Connected[];
  query: string;
  now: number;
  onPick: <Key extends keyof AccountFilter>(key: Key, value: AccountFilter[Key]) => void;
}) {
  return (
    <FilterGroup
      label={label}
      value={filter[name]}
      options={options}
      count={(value) => listedAccounts(accounts, query, { ...filter, [name]: value }, now).length}
      onChange={(value) => onPick(name, value)}
    />
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  count,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  count: (value: T) => number;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap",
                selected ? "bg-foreground text-background" : "border border-line text-foreground",
              )}
            >
              {option.label}
              <span className={cn("tabular-nums", selected ? "opacity-70" : "text-muted")}>{count(option.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PAGE = 25;

export function AccountList({ accounts, now }: { accounts: Connected[]; now: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccountFilter>(DEFAULT_ACCOUNT_FILTER);
  const [sort, setSort] = useState<AccountSort>("active");
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const jump = useRef<string | null>(null);
  const panelId = useId();

  const byId = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const ordered = useMemo(() => sortedAccounts(accounts, sort), [accounts, sort]);
  const shown = useMemo(() => listedAccounts(ordered, query, filter, now), [ordered, query, filter, now]);
  const page = shown.slice(0, limit);
  const remaining = shown.length - page.length;
  const chosen = activeChoices(filter);
  const narrowed = query.trim().length > 0 || chosen.length > 0;

  // Following a link to another account clears filters that would hide it, then scrolls to it.
  useEffect(() => {
    const id = jump.current;
    if (!id) return;
    jump.current = null;
    document.getElementById(`account-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, shown]);

  function go(id: string) {
    if (!byId.has(id)) return;
    jump.current = id;
    setLimit(accounts.length);
    setQuery("");
    setFilter(DEFAULT_ACCOUNT_FILTER);
    setOpen(id);
  }

  function clear() {
    setLimit(PAGE);
    setQuery("");
    setFilter(DEFAULT_ACCOUNT_FILTER);
  }

  function pick<K extends keyof AccountFilter>(key: K, value: AccountFilter[K]) {
    if (filter[key] === value) return;
    haptic("selection");
    setLimit(PAGE);
    setFilter({ ...filter, [key]: value });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setLimit(PAGE);
            setQuery(event.target.value);
          }}
          placeholder="Search name or email"
          aria-label="Search accounts"
          className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-base outline-none focus-visible:border-foreground"
        />
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          aria-label={chosen.length > 0 ? `Filter accounts, ${chosen.length} selected` : "Filter accounts"}
          onClick={() => {
            if (!filtersOpen) haptic("light");
            setFiltersOpen((value) => !value);
          }}
          className={cn(
            "inline-flex h-11 shrink-0 items-center rounded-2xl border px-3.5 text-[14px] font-medium whitespace-nowrap",
            filtersOpen || chosen.length > 0
              ? "border-foreground bg-foreground text-background"
              : "border-line bg-surface text-foreground",
          )}
        >
          Filter{chosen.length > 0 ? ` (${chosen.length})` : ""}
        </button>
      </div>

      {filtersOpen && (
        <div id={panelId} className="mt-3 flex flex-col gap-4 rounded-3xl border border-line bg-surface px-4 py-4">
          <FilterRow name="activity" label="Activity" options={ACTIVITY} filter={filter} accounts={accounts} query={query} now={now} onPick={pick} />
          <FilterRow name="source" label="Found us" options={SOURCE} filter={filter} accounts={accounts} query={query} now={now} onPick={pick} />
          <FilterRow name="locale" label="Language" options={LOCALE} filter={filter} accounts={accounts} query={query} now={now} onPick={pick} />
          <FilterRow name="invite" label="Invites" options={INVITE} filter={filter} accounts={accounts} query={query} now={now} onPick={pick} />
          <FilterRow name="step" label="Reached" options={REACHED} filter={filter} accounts={accounts} query={query} now={now} onPick={pick} />
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-[13px] text-muted">
          {plural(shown.length, "account", "accounts")}
          {shown.length !== accounts.length ? ` of ${accounts.length.toLocaleString("en-US")}` : ""}
          {chosen.length > 0 ? `, ${chosen.join(", ")}` : ""}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {narrowed && (
            <button type="button" onClick={clear} className="inline-flex h-11 items-center text-[13px] font-medium text-foreground">
              Clear
            </button>
          )}
          <label className="inline-flex h-11 items-center gap-1.5 text-[13px] text-muted">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                haptic("selection");
                setLimit(PAGE);
                setSort(event.target.value as AccountSort);
              }}
              className="h-9 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-foreground outline-none focus-visible:border-foreground"
            >
              {ACCOUNT_SORT.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">No one matches.</p>
      ) : (
        <div className="@container mt-3 overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
        <ul className="w-max min-w-full divide-y divide-line">
          {page.map((account) => {
            const expanded = open === account.id;
            return (
              <li key={account.id} id={`account-${account.id}`}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : account.id)}
                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left whitespace-nowrap"
                >
                  <div>
                    <p className="text-[15px] font-medium">{account.name}</p>
                    <p className="text-[13px] text-muted">{account.email}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Location {account.location ? formatAccountLocation(account.location) : "not shared"}
                    </p>
                    <div className="mt-2 flex gap-1" role="img" aria-label={`${account.depth} of ${STEPS.length} steps reached`}>
                      {STEPS.map((key) => (
                        <span
                          key={key}
                          title={STEP_LABEL[key]}
                          className={`h-1.5 w-6 rounded-full ${account.steps[key] ? "bg-foreground" : "bg-surface-strong"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[13px] text-muted">
                    <p className="font-medium text-foreground" title={formatMoment(account.lastActive, now)}>
                      {account.lastActive ? `Active ${formatAgo(account.lastActive, now)}` : "Never active"}
                    </p>
                    <p className="mt-1" title={formatMoment(account.joinedAt, now)}>
                      Joined {formatAgo(account.joinedAt, now)}
                    </p>
                  </div>
                </button>

                {expanded && (
                  <div className="sticky left-0 w-[100cqw] border-t border-line px-4 py-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                      {facts(account).map((item) => (
                        <div key={item.label}>
                          <dt className="text-[12px] text-muted">{item.label}</dt>
                          <dd className="mt-0.5 text-[14px] font-medium break-words tabular-nums">
                            {item.href ? (
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2"
                              >
                                {item.value}
                              </a>
                            ) : (
                              item.value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <ul className="mt-4 flex flex-col gap-1.5">
                      {STEPS.map((key) => (
                        <li
                          key={key}
                          className={`flex items-center gap-2 text-[13px] ${account.steps[key] ? "" : "text-muted"}`}
                        >
                          <span aria-hidden>{account.steps[key] ? "●" : "○"}</span>
                          {STEP_LABEL[key]}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex flex-col gap-2 text-[13px] text-muted">
                      <p>
                        Found us:{" "}
                        <span className="text-foreground">
                          {account.source
                            ? REFERRAL_LABEL[account.source]
                            : account.sourceState === "choosing"
                              ? "still choosing"
                              : "joined before we asked"}
                        </span>
                      </p>
                      {account.invitedBy && (
                        <p>
                          Came from{" "}
                          <button
                            type="button"
                            onClick={() => go(account.invitedBy!.id)}
                            className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-2"
                          >
                            {account.invitedBy.name}
                          </button>
                        </p>
                      )}
                      {account.invited.length > 0 && (
                        <div>
                          <p>Brought {plural(account.invited.length, "person", "people")}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {account.invited.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => go(child.id)}
                                className="inline-flex min-h-11 max-w-full items-center rounded-full border border-line px-3 text-[13px] font-medium break-words text-foreground"
                              >
                                {child.name}
                                {child.activated ? "" : " (idle)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {remaining > 0 && (
          <div className="sticky left-0 w-[100cqw] border-t border-line">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setLimit(limit + PAGE);
              }}
              className="inline-flex min-h-11 w-full items-center justify-center text-[14px] font-medium text-foreground active:bg-surface-strong"
            >
              Show {Math.min(PAGE, remaining)} more
              <span className="ml-1.5 font-normal text-muted tabular-nums">{remaining.toLocaleString("en-US")} left</span>
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
