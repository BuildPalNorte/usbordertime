import { isExcludedFromAnalytics, OFTEN_OPENS } from "@/lib/analytics";
import { type GeoPoint } from "@/lib/port-locations";
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
  /** Latitude and longitude they shared, or null when they picked bridges by hand. */
  location: GeoPoint | null;
};

export type RawFacts = {
  profiles: RawProfile[];
  streaks: { userId: string; current: number; longest: number; totalDays: number; lastDay: string | null }[];
  preferences: { userId: string; locale: string | null; wallet: { portNumber: string }[]; pins: number }[];
  alerts: { userId: string; portNumber: string }[];
  schedules: { userId: string; ports: string[]; enabled: boolean }[];
  devices: { userId: string; count: number }[];
  usage: { userId: string; total: number; lastActive: string | null; byKind: Record<string, number> }[];
  /** How many times each account opened each crossing's details. */
  views: { userId: string; portNumber: string; opens: number; lastOpenedAt: string | null }[];
};

/** A crossing one account opened, with how often and when last. */
export type OpenedBridge = { portNumber: string; opens: number; lastOpenedAt: string | null };

/** An account that keeps opening a crossing it has no alert or alarm for. */
export type OftenRow = {
  userId: string;
  name: string;
  portNumber: string;
  opens: number;
  lastOpenedAt: string | null;
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
  /** Latitude and longitude they shared, or null when they picked bridges by hand. */
  location: GeoPoint | null;
  saved: number;
  pins: number;
  alerts: number;
  alarms: number;
  alarmsOn: number;
  devices: number;
  questions: number;
  days: number;
  /** Total opens of any crossing's details. */
  opens: number;
  /** The crossings they opened most, up to `TOP_BRIDGES`. */
  topBridges: OpenedBridge[];
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
  /** Distinct accounts that opened this crossing's details. */
  viewers: number;
  /** Total opens of this crossing's details. */
  opens: number;
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
  /** Opened at least `OFTEN_OPENS` times with no alert or alarm on that crossing, most opens first. */
  often: OftenRow[];
  growth: GrowthDay[];
  /** Accounts that reached no step beyond signing in. */
  idle: number;
  /** Seen in the last 7 days. */
  recent: number;
};

const DAY_MS = 86_400_000;

/** How many days of sign-ups the Growth chart can look back. The chart picks a shorter range from this. */
export const GROWTH_DAYS = 90;

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

/** The accounts that never count toward any figure, and every table with their rows removed. */
function withoutExcluded(facts: RawFacts): RawFacts {
  const out = new Set(facts.profiles.filter((row) => isExcludedFromAnalytics(row.email)).map((row) => row.id));
  if (out.size === 0) return facts;
  const keep = <T extends { userId: string }>(rows: T[]) => rows.filter((row) => !out.has(row.userId));
  return {
    profiles: facts.profiles.filter((row) => !out.has(row.id)),
    streaks: keep(facts.streaks),
    preferences: keep(facts.preferences),
    alerts: keep(facts.alerts),
    schedules: keep(facts.schedules),
    devices: keep(facts.devices),
    usage: keep(facts.usage),
    views: keep(facts.views),
  };
}

const TOP_BRIDGES = 5;

export function buildInsights(raw: RawFacts, now: Date = new Date(), growthDays = GROWTH_DAYS): Insights {
  const facts = withoutExcluded(raw);
  const viewsOf = new Map<string, RawFacts["views"]>();
  for (const row of facts.views) {
    const list = viewsOf.get(row.userId) ?? [];
    list.push(row);
    viewsOf.set(row.userId, list);
  }
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
    const opened = [...(viewsOf.get(profile.id) ?? [])].sort(
      (a, b) => b.opens - a.opens || (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "") || a.portNumber.localeCompare(b.portNumber),
    );

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
      location: profile.location,
      saved,
      pins: pref?.pins ?? 0,
      alerts,
      alarms: schedules.length,
      alarmsOn: schedules.filter((row) => row.enabled).length,
      devices,
      questions,
      days,
      opens: opened.reduce((sum, row) => sum + row.opens, 0),
      topBridges: opened.slice(0, TOP_BRIDGES).map((row) => ({
        portNumber: row.portNumber,
        opens: row.opens,
        lastOpenedAt: row.lastOpenedAt,
      })),
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

  const crossingMap = new Map<
    string,
    { saved: number; alerts: number; alarms: number; opens: number; viewers: Set<string>; people: Set<string> }
  >();
  const entryFor = (port: string) => {
    const entry = crossingMap.get(port) ?? {
      saved: 0,
      alerts: 0,
      alarms: 0,
      opens: 0,
      viewers: new Set<string>(),
      people: new Set<string>(),
    };
    crossingMap.set(port, entry);
    return entry;
  };
  const touch = (port: string, userId: string, field: "saved" | "alerts" | "alarms") => {
    const entry = entryFor(port);
    entry[field] += 1;
    entry.people.add(userId);
  };
  for (const view of facts.views) {
    const entry = entryFor(view.portNumber);
    entry.opens += view.opens;
    entry.viewers.add(view.userId);
    entry.people.add(view.userId);
  }
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
      viewers: entry.viewers.size,
      opens: entry.opens,
      people: entry.people.size,
    }))
    .sort((a, b) => b.people - a.people || b.alerts + b.alarms - (a.alerts + a.alarms) || b.opens - a.opens || a.portNumber.localeCompare(b.portNumber));

  const watched = new Map<string, Set<string>>();
  for (const alert of facts.alerts) {
    const set = watched.get(alert.userId) ?? new Set<string>();
    set.add(alert.portNumber);
    watched.set(alert.userId, set);
  }
  for (const schedule of facts.schedules) {
    const set = watched.get(schedule.userId) ?? new Set<string>();
    for (const port of schedule.ports) set.add(port);
    watched.set(schedule.userId, set);
  }
  const often: OftenRow[] = facts.views
    .filter((view) => view.opens >= OFTEN_OPENS && byId.has(view.userId) && !watched.get(view.userId)?.has(view.portNumber))
    .map((view) => {
      const profile = byId.get(view.userId)!;
      return {
        userId: view.userId,
        name: profile.name.trim() || profile.email,
        portNumber: view.portNumber,
        opens: view.opens,
        lastOpenedAt: view.lastOpenedAt,
      };
    })
    .sort((a, b) => b.opens - a.opens || (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "") || a.name.localeCompare(b.name));

  // Step back on the calendar, not by 24-hour chunks, so a daylight-saving change never repeats or skips a day.
  const [year, month, dayOfMonth] = chicagoDay(now).split("-").map(Number);
  const growth: GrowthDay[] = Array.from({ length: growthDays }, (_, index) => ({
    day: new Date(Date.UTC(year, month - 1, dayOfMonth - (growthDays - 1 - index))).toISOString().slice(0, 10),
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
    often,
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

/** Four decimal places, about 10 meters, with the hemisphere spelled out. */
export function formatAccountLocation(location: GeoPoint): string {
  const lat = Math.abs(location.lat).toFixed(4);
  const lng = Math.abs(location.lng).toFixed(4);
  return `${lat}° ${location.lat >= 0 ? "N" : "S"}, ${lng}° ${location.lng >= 0 ? "E" : "W"}`;
}

/** Opens this point in Google Maps. The query keeps the full stored precision. */
export function accountLocationUrl(location: GeoPoint): string {
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

export type AccountSort = "active" | "newest" | "engaged";

export const ACCOUNT_SORT: { value: AccountSort; label: string }[] = [
  { value: "active", label: "Last active" },
  { value: "newest", label: "Newest" },
  { value: "engaged", label: "Most engaged" },
];

/** A sorted copy. `active` is the order `buildInsights` already returns, so it only copies. */
export function sortedAccounts(accounts: Connected[], sort: AccountSort): Connected[] {
  const copy = [...accounts];
  if (sort === "newest") copy.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  if (sort === "engaged") {
    copy.sort((a, b) => b.depth - a.depth || b.days - a.days || (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));
  }
  return copy;
}

/** Accounts whose name or email contains `query`, and that match every chosen filter. Order stays as given. */
export function listedAccounts(accounts: Connected[], query: string, filter: AccountFilter, now: number): Connected[] {
  const needle = query.trim().toLowerCase();
  return accounts.filter((account) => {
    if (needle && !`${account.name} ${account.email}`.toLowerCase().includes(needle)) return false;
    return accountMatches(account, filter, now);
  });
}
