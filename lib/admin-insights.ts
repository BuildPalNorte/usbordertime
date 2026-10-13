import { isReferral, REFERRAL_LABEL, REFERRALS, type Referral } from "@/lib/referral";

/** Client-safe. No server imports here. Turns raw rows from every table into the admin's connected view. */

export type RawProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  referral: string | null;
  referralPending: boolean;
  referredBy: string | null;
};

export type RawFacts = {
  profiles: RawProfile[];
  streaks: { userId: string; current: number; longest: number; totalDays: number; lastDay: string | null }[];
  preferences: { userId: string; locale: string | null; wallet: { portNumber: string }[]; pins: number }[];
  alerts: { userId: string; portNumber: string }[];
  schedules: { userId: string; ports: string[]; enabled: boolean }[];
  devices: { userId: string; count: number }[];
  usage: { userId: string; total: number; lastActive: string | null; byKind: Record<string, number> }[];
};

/** Everything known about one account, from every table. */
export type Connected = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastActive: string | null;
  source: Referral | null;
  /** `choosing` when the question is still open, `skipped` for accounts that predate it. */
  sourceState: "answered" | "choosing" | "unknown";
  invitedBy: { id: string; name: string } | null;
  invited: { id: string; name: string; activated: boolean }[];
  locale: string | null;
  saved: number;
  pins: number;
  alerts: number;
  alarms: number;
  alarmsOn: number;
  devices: number;
  questions: number;
  days: number;
  streak: { current: number; longest: number };
  steps: Record<StepKey, boolean>;
  /** How many of the steps this account reached. */
  depth: number;
};

export const STEPS = ["answered", "returned", "saved", "watching", "notified", "asked"] as const;
export type StepKey = (typeof STEPS)[number];

export const STEP_LABEL: Record<StepKey, string> = {
  answered: "Said how they found us",
  returned: "Came back on another day",
  saved: "Saved a crossing",
  watching: "Set an alert or alarm",
  notified: "Turned on notifications",
  asked: "Asked a question",
};

export type FunnelStep = { key: "joined" | StepKey; label: string; count: number; share: number };

export type SourceRow = {
  key: string;
  label: string;
  accounts: number;
  returned: number;
  activated: number;
  /** Average days opened, one decimal. */
  avgDays: number;
};

export type InviterRow = {
  id: string;
  name: string;
  invited: { id: string; name: string; activated: boolean }[];
  activated: number;
};

export type CrossingRow = {
  portNumber: string;
  saved: number;
  alerts: number;
  alarms: number;
  /** Distinct accounts that touch this crossing in any way. */
  people: number;
};

export type GrowthDay = { day: string; count: number };

export type Insights = {
  /** When these figures were read, so the page never reads the clock while rendering. */
  generatedAt: string;
  accounts: Connected[];
  funnel: FunnelStep[];
  sources: SourceRow[];
  inviters: InviterRow[];
  crossings: CrossingRow[];
  growth: GrowthDay[];
  /** Accounts that reached no step beyond signing in. */
  idle: number;
  /** Seen in the last 7 days. */
  recent: number;
};

const DAY_MS = 86_400_000;

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Local calendar day in Chicago, the zone the dashboard already reports in. */
function chicagoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildInsights(facts: RawFacts, now: Date = new Date(), growthDays = 14): Insights {
  const streakOf = new Map(facts.streaks.map((row) => [row.userId, row]));
  const prefOf = new Map(facts.preferences.map((row) => [row.userId, row]));
  const usageOf = new Map(facts.usage.map((row) => [row.userId, row]));
  const deviceOf = new Map(facts.devices.map((row) => [row.userId, row.count]));
  const byId = new Map(facts.profiles.map((row) => [row.id, row]));

  const alertsOf = new Map<string, Set<string>>();
  for (const row of facts.alerts) {
    const set = alertsOf.get(row.userId) ?? new Set<string>();
    set.add(row.portNumber);
    alertsOf.set(row.userId, set);
  }
  const schedulesOf = new Map<string, RawFacts["schedules"]>();
  for (const row of facts.schedules) {
    const list = schedulesOf.get(row.userId) ?? [];
    list.push(row);
    schedulesOf.set(row.userId, list);
  }

  const activatedOf = (id: string): boolean => {
    const saved = (prefOf.get(id)?.wallet.length ?? 0) > 0;
    return saved || (alertsOf.get(id)?.size ?? 0) > 0 || (schedulesOf.get(id)?.length ?? 0) > 0;
  };

  const children = new Map<string, string[]>();
  for (const profile of facts.profiles) {
    if (!profile.referredBy || !byId.has(profile.referredBy)) continue;
    const list = children.get(profile.referredBy) ?? [];
    list.push(profile.id);
    children.set(profile.referredBy, list);
  }

  const accounts: Connected[] = facts.profiles.map((profile) => {
    const streak = streakOf.get(profile.id);
    const pref = prefOf.get(profile.id);
    const usage = usageOf.get(profile.id);
    const schedules = schedulesOf.get(profile.id) ?? [];
    const alerts = alertsOf.get(profile.id)?.size ?? 0;
    const devices = deviceOf.get(profile.id) ?? 0;
    const days = Math.max(streak?.totalDays ?? 0, usage?.byKind.visit ?? 0);
    const questions = usage?.byKind.ask ?? 0;
    const saved = pref?.wallet.length ?? 0;
    const source = isReferral(profile.referral) ? profile.referral : null;
    const inviter = profile.referredBy ? byId.get(profile.referredBy) : undefined;

    const steps: Record<StepKey, boolean> = {
      answered: source !== null,
      returned: days >= 2,
      saved: saved > 0,
      watching: alerts > 0 || schedules.length > 0,
      notified: devices > 0,
      asked: questions > 0,
    };

    return {
      id: profile.id,
      name: profile.name.trim() || profile.email,
      email: profile.email,
      joinedAt: profile.createdAt,
      lastActive: maxIso(usage?.lastActive ?? null, streak?.lastDay ? `${streak.lastDay}T12:00:00.000Z` : null),
      source,
      sourceState: source ? "answered" : profile.referralPending ? "choosing" : "unknown",
      invitedBy: inviter ? { id: inviter.id, name: inviter.name.trim() || inviter.email } : null,
      invited: (children.get(profile.id) ?? []).map((id) => {
        const child = byId.get(id)!;
        return { id, name: child.name.trim() || child.email, activated: activatedOf(id) };
      }),
      locale: pref?.locale ?? null,
      saved,
      pins: pref?.pins ?? 0,
      alerts,
      alarms: schedules.length,
      alarmsOn: schedules.filter((row) => row.enabled).length,
      devices,
      questions,
      days,
      streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
      steps,
      depth: STEPS.filter((key) => steps[key]).length,
    };
  });

  accounts.sort(
    (a, b) =>
      (b.lastActive ?? b.joinedAt).localeCompare(a.lastActive ?? a.joinedAt) || a.name.localeCompare(b.name),
  );

  const total = accounts.length;
  const share = (count: number) => (total === 0 ? 0 : count / total);
  const funnel: FunnelStep[] = [
    { key: "joined", label: "Signed in", count: total, share: total === 0 ? 0 : 1 },
    ...STEPS.map((key) => {
      const count = accounts.filter((account) => account.steps[key]).length;
      return { key, label: STEP_LABEL[key], count, share: share(count) };
    }),
  ];

  const groups = new Map<string, { label: string; rows: Connected[] }>();
  const add = (key: string, label: string, row: Connected) => {
    const group = groups.get(key) ?? { label, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  };
  for (const account of accounts) {
    if (account.source) add(account.source, REFERRAL_LABEL[account.source], account);
    else add(account.sourceState === "choosing" ? "choosing" : "unknown", account.sourceState === "choosing" ? "Still choosing" : "Joined before the question", account);
  }
  const order = [...REFERRALS, "choosing", "unknown"] as string[];
  const sources: SourceRow[] = [...groups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      accounts: group.rows.length,
      returned: group.rows.filter((row) => row.steps.returned).length,
      activated: group.rows.filter((row) => row.steps.saved || row.steps.watching).length,
      avgDays: Math.round((group.rows.reduce((sum, row) => sum + row.days, 0) / group.rows.length) * 10) / 10,
    }))
    .sort((a, b) => b.accounts - a.accounts || order.indexOf(a.key) - order.indexOf(b.key));

  const inviters: InviterRow[] = accounts
    .filter((account) => account.invited.length > 0)
    .map((account) => ({
      id: account.id,
      name: account.name,
      invited: account.invited,
      activated: account.invited.filter((child) => child.activated).length,
    }))
    .sort((a, b) => b.invited.length - a.invited.length || b.activated - a.activated || a.name.localeCompare(b.name));

  const crossingMap = new Map<string, { saved: number; alerts: number; alarms: number; people: Set<string> }>();
  const touch = (port: string, userId: string, field: "saved" | "alerts" | "alarms") => {
    const entry = crossingMap.get(port) ?? { saved: 0, alerts: 0, alarms: 0, people: new Set<string>() };
    entry[field] += 1;
    entry.people.add(userId);
    crossingMap.set(port, entry);
  };
  for (const pref of facts.preferences) {
    for (const port of new Set(pref.wallet.map((entry) => entry.portNumber))) touch(port, pref.userId, "saved");
  }
  for (const alert of facts.alerts) touch(alert.portNumber, alert.userId, "alerts");
  for (const schedule of facts.schedules) {
    for (const port of new Set(schedule.ports)) touch(port, schedule.userId, "alarms");
  }
  const crossings: CrossingRow[] = [...crossingMap.entries()]
    .map(([portNumber, entry]) => ({
      portNumber,
      saved: entry.saved,
      alerts: entry.alerts,
      alarms: entry.alarms,
      people: entry.people.size,
    }))
    .sort((a, b) => b.people - a.people || b.alerts + b.alarms - (a.alerts + a.alarms) || a.portNumber.localeCompare(b.portNumber));

  const growth: GrowthDay[] = Array.from({ length: growthDays }, (_, index) => ({
    day: chicagoDay(new Date(now.getTime() - (growthDays - 1 - index) * DAY_MS)),
    count: 0,
  }));
  const slot = new Map(growth.map((entry) => [entry.day, entry]));
  for (const account of accounts) {
    const entry = slot.get(chicagoDay(new Date(account.joinedAt)));
    if (entry) entry.count += 1;
  }

  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  return {
    generatedAt: now.toISOString(),
    accounts,
    funnel,
    sources,
    inviters,
    crossings,
    growth,
    idle: accounts.filter((account) => account.depth === 0).length,
    recent: accounts.filter((account) => (account.lastActive ?? "") >= weekAgo).length,
  };
}

export type ActivityFilter = "all" | "week" | "idle";
export type SourceFilter = "any" | Referral | "choosing" | "unknown";
export type LocaleFilter = "any" | "en" | "es" | "unset";
export type InviteFilter = "any" | "brought" | "invited";
export type StepFilter = "any" | StepKey;

/** Choices that narrow the account list. Each group is one value, and the groups combine. */
export type AccountFilter = {
  activity: ActivityFilter;
  source: SourceFilter;
  locale: LocaleFilter;
  invite: InviteFilter;
  step: StepFilter;
};

export const DEFAULT_ACCOUNT_FILTER: AccountFilter = {
  activity: "all",
  source: "any",
  locale: "any",
  invite: "any",
  step: "any",
};

const WEEK_MS = 7 * DAY_MS;

function accountMatches(account: Connected, filter: AccountFilter, now: number): boolean {
  if (filter.activity === "week" && (account.lastActive ?? "") < new Date(now - WEEK_MS).toISOString()) return false;
  if (filter.activity === "idle" && account.depth !== 0) return false;
  if (filter.source === "choosing" || filter.source === "unknown") {
    if (account.sourceState !== filter.source) return false;
  } else if (filter.source !== "any" && account.source !== filter.source) {
    return false;
  }
  if (filter.locale === "unset") {
    if (account.locale === "en" || account.locale === "es") return false;
  } else if (filter.locale !== "any" && account.locale !== filter.locale) {
    return false;
  }
  if (filter.invite === "brought" && account.invited.length === 0) return false;
  if (filter.invite === "invited" && !account.invitedBy) return false;
  if (filter.step !== "any" && !account.steps[filter.step]) return false;
  return true;
}

/** Accounts whose name or email contains `query`, and that match every chosen filter. Order stays as given. */
export function listedAccounts(accounts: Connected[], query: string, filter: AccountFilter, now: number): Connected[] {
  const needle = query.trim().toLowerCase();
  return accounts.filter((account) => {
    if (needle && !`${account.name} ${account.email}`.toLowerCase().includes(needle)) return false;
    return accountMatches(account, filter, now);
  });
}
