"use client";

import { STEP_LABEL, STEPS, type Connected } from "@/lib/admin-insights";
import { REFERRAL_LABEL } from "@/lib/referral";
import { useEffect, useMemo, useRef, useState } from "react";

const WHEN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : WHEN.format(date);
}

type Filter = "all" | "week" | "idle" | "inviters";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "week", label: "Active this week" },
  { key: "idle", label: "Did nothing yet" },
  { key: "inviters", label: "Brought someone" },
];

const WEEK_MS = 7 * 86_400_000;

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** Small stats an account owns, in the order a person would ask about them. */
function facts(account: Connected): { label: string; value: string }[] {
  return [
    { label: "Days opened", value: account.days.toLocaleString("en-US") },
    {
      label: "Streak",
      value: `${account.streak.current} now · ${account.streak.longest} best`,
    },
    { label: "Crossings saved", value: String(account.saved) },
    { label: "City bookmarks", value: String(account.pins) },
    { label: "Wait alerts", value: String(account.alerts) },
    { label: "Alarms", value: `${account.alarmsOn} on of ${account.alarms}` },
    { label: "Devices", value: String(account.devices) },
    { label: "Questions", value: String(account.questions) },
    { label: "Language", value: account.locale === "es" ? "Spanish" : account.locale === "en" ? "English" : "—" },
  ];
}

export function AccountList({ accounts, now }: { accounts: Connected[]; now: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const jump = useRef<string | null>(null);

  const byId = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((account) => {
      if (needle && !`${account.name} ${account.email}`.toLowerCase().includes(needle)) return false;
      if (filter === "week") return (account.lastActive ?? "") >= new Date(now - WEEK_MS).toISOString();
      if (filter === "idle") return account.depth === 0;
      if (filter === "inviters") return account.invited.length > 0;
      return true;
    });
  }, [accounts, query, filter, now]);

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
    setQuery("");
    setFilter("all");
    setOpen(id);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search accounts"
          className="h-11 w-full min-w-0 rounded-2xl border border-line bg-surface px-4 text-base outline-none focus-visible:border-foreground sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter accounts">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3.5 text-[13px] font-medium whitespace-nowrap text-muted transition-colors aria-pressed:border-foreground aria-pressed:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[13px] text-muted">
        {plural(shown.length, "account", "accounts")}
        {shown.length !== accounts.length ? ` of ${accounts.length.toLocaleString("en-US")}` : ""}
      </p>

      {shown.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">No one matches.</p>
      ) : (
        <div className="@container mt-3 overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
        <ul className="w-max min-w-full divide-y divide-line">
          {shown.map((account) => {
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
                    <p>Joined {formatWhen(account.joinedAt)}</p>
                    <p className="mt-1">Active {formatWhen(account.lastActive)}</p>
                  </div>
                </button>

                {expanded && (
                  <div className="sticky left-0 w-[100cqw] border-t border-line px-4 py-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                      {facts(account).map((item) => (
                        <div key={item.label}>
                          <dt className="text-[12px] text-muted">{item.label}</dt>
                          <dd className="mt-0.5 text-[14px] font-medium break-words tabular-nums">{item.value}</dd>
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
                                {child.activated ? "" : " · idle"}
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
        </div>
      )}
    </div>
  );
}
