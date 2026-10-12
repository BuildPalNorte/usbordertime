import { getAuth } from "@/lib/auth/server";
import { buildInsights, type Insights, type RawFacts } from "@/lib/admin-insights";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { FEED_GROUPS, type FeedKind } from "@/lib/camera-feeds";
import { defaultMode, laneFor, listedCameras, portName } from "@/lib/ports";
import { ensureProfile, ensureProfileColumns } from "@/lib/profile";
import { USAGE_KINDS, type UsageKind } from "@/lib/usage";
import { readUsageTotals, type UsageTotals } from "@/lib/usage.server";
import { database } from "@/lib/db.server";
import { headers } from "next/headers";

/**
 * Google account emails that can open `/admin`, from `ADMIN_EMAILS` (comma-separated).
 * Read it here. A computed `process.env[name]` is empty in the production bundle.
 * An empty value lets nobody in. Do not import this module from a client component.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw.split(",").flatMap((entry) => {
    const email = entry.trim();
    return email ? [email] : [];
  });
}

const ACCOUNT_LIMIT = 500;
const CROSSING_LIMIT = 15;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  return adminEmails().some((entry) => entry.toLowerCase() === needle);
}

export type AdminViewer = { name: string; email: string };

export type AdminStat = { label: string; value: number; detail: string };

export type AdminCamera = {
  name: string;
  alias: string;
  src: string;
  source: "saved" | "fallback";
};

/** One public camera from `camera_feed`, or the address in `lib/camera-feeds.ts` when no row exists. */
export type AdminFeed = {
  id: string;
  label: string;
  kind: FeedKind | null;
  src: string;
  source: "saved" | "fallback";
};

export type AdminFeedGroup = {
  id: string;
  name: string;
  detail: string;
  feeds: AdminFeed[];
};

export type AdminUsageTotals = { active: number; byKind: Record<UsageKind, number> };

/** A crossing with who is watching it, joined with what the feed says right now. */
export type AdminCrossing = {
  portNumber: string;
  label: string;
  saved: number;
  alerts: number;
  alarms: number;
  people: number;
  /** Current wait in minutes for the crossing's main lane, or null when the feed has none. */
  waitMinutes: number | null;
};

export type AdminData = {
  insights: Insights;
  crossings: AdminCrossing[];
  stats: AdminStat[];
  accountTotal: number;
  usage: AdminUsageTotals;
  cameras: AdminCamera[];
  feedGroups: AdminFeedGroup[];
  feed: { fetchedAt: string; ports: number } | null;
  problem: boolean;
};

export type AdminOpen =
  | { kind: "anonymous" }
  | { kind: "denied" }
  | { kind: "ready"; viewer: AdminViewer; data: AdminData };


function asCount(value: unknown): number {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(count) ? count : 0;
}

function iso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function missingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "42P01") return true;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return /relation ["']?\w+["']? does not exist/i.test(message);
}

/** Session plus the allowlist. Anonymous and denied never receive the figures. */
export async function openAdmin(): Promise<AdminOpen> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id || !user.email) return { kind: "anonymous" };
  if (!isAdminEmail(user.email)) return { kind: "denied" };

  const viewer = { name: user.name?.trim() || user.email, email: user.email };
  try {
    await ensureProfile({
      id: user.id,
      email: user.email,
      name: viewer.name,
      image: user.image ?? null,
    });
  } catch (error) {
    console.error("admin profile", error);
  }

  return { kind: "ready", viewer, data: await readDashboard() };
}

async function readDashboard(): Promise<AdminData> {
  const sql = database();
  let problem = false;

  const mark = (error: unknown, quietWhenMissing: boolean) => {
    if (quietWhenMissing && missingTable(error)) return;
    console.error("admin dashboard", error);
    problem = true;
  };

  await ensureProfileColumns().catch((error: unknown) => {
    mark(error, false);
  });

  const accountsQuery = sql`select count(*)::int as count from profile`;
  const alertTotalsQuery = sql`
    select
      count(*)::int as alerts,
      count(*) filter (where below)::int as below
    from wait_alert
  `;
  const devicesQuery = sql`select count(*)::int as count from push_subscription`;
  const schedulesQuery = sql`
    select
      count(*)::int as total,
      count(*) filter (where enabled)::int as enabled
    from schedule
  `;
  const camerasQuery = sql`select alias, src from camera_stream`;
  const feedsQuery = sql`select id, src from camera_feed`;
  const feedQuery = getBorderWaitTimes().then(
    (snapshot) => ({ fetchedAt: snapshot.fetchedAt, ports: snapshot.ports }),
    () => null,
  );

  const usageQuery = readUsageTotals().catch((error: unknown) => {
    mark(error, true);
    return [];
  });

  const factsQuery = readFacts(mark);

  const [facts, accounts, alertTotals, devices, schedules, cameras, feeds, feed, usageRows] =
    await Promise.all([
    factsQuery,
    accountsQuery.then(
      (rows) => asCount((rows[0] as { count?: unknown } | undefined)?.count),
      (error: unknown) => {
        mark(error, false);
        return 0;
      },
    ),
    alertTotalsQuery.then(
      (rows) =>
        (rows[0] as { alerts?: unknown; below?: unknown } | undefined) ?? {
          alerts: 0,
          below: 0,
        },
      (error: unknown) => {
        mark(error, true);
        return { alerts: 0, below: 0 };
      },
    ),
    devicesQuery.then(
      (rows) => asCount((rows[0] as { count?: unknown } | undefined)?.count),
      (error: unknown) => {
        mark(error, true);
        return 0;
      },
    ),
    schedulesQuery.then(
      (rows) =>
        (rows[0] as { total?: unknown; enabled?: unknown } | undefined) ?? { total: 0, enabled: 0 },
      (error: unknown) => {
        mark(error, true);
        return { total: 0, enabled: 0 };
      },
    ),
    camerasQuery.then(
      (rows) => rows as { alias: string; src: string }[],
      (error: unknown) => {
        mark(error, true);
        return [];
      },
    ),
    feedsQuery.then(
      (rows) => rows as { id: string; src: string }[],
      (error: unknown) => {
        mark(error, true);
        return [];
      },
    ),
    feedQuery,
    usageQuery,
  ]);

  const insights = buildInsights({
    ...facts,
    usage: usageRows.map((row) => ({
      userId: row.userId,
      total: row.total,
      lastActive: row.lastActive,
      byKind: row.byKind as Record<string, number>,
    })),
  });
  const byNumber = new Map((feed?.ports ?? []).map((port) => [port.portNumber, port]));
  const alertCount = asCount(alertTotals.alerts);
  const below = asCount(alertTotals.below);
  const scheduleTotal = asCount(schedules.total);
  const scheduleOn = asCount(schedules.enabled);

  return {
    insights,
    crossings: insights.crossings.slice(0, CROSSING_LIMIT).map((row) => {
      const port = byNumber.get(row.portNumber);
      const name = port ? portName(port) : null;
      const label =
        name && !name.subtitleIsRegion && name.subtitle !== name.title
          ? `${name.title} · ${name.subtitle}`
          : (name?.title ?? row.portNumber);
      const minutes = port ? laneFor(port, defaultMode(port)).delayMinutes : null;
      return { ...row, label, waitMinutes: typeof minutes === "number" ? minutes : null };
    }),
    stats: [
      { label: "Accounts", value: accounts, detail: "Profiles" },
      {
        label: "Alerts",
        value: alertCount,
        detail: below === 1 ? "1 under the limit" : `${below} under the limit`,
      },
      { label: "Devices", value: devices, detail: "Push addresses" },
      {
        label: "Alarms",
        value: scheduleTotal,
        detail: scheduleOn === 1 ? "1 turned on" : `${scheduleOn} turned on`,
      },
    ],
    usage: usageTotals(usageRows),
    accountTotal: accounts,
    cameras: camerasFrom(cameras),
    feedGroups: feedGroupsFrom(feeds),
    feed: feed ? { fetchedAt: feed.fetchedAt, ports: feed.ports.length } : null,
    problem,
  };
}

/** Across every account: how many people used each feature, and how many were active at all. */
function usageTotals(rows: UsageTotals[]): AdminUsageTotals {
  const byKind = Object.fromEntries(USAGE_KINDS.map((kind) => [kind, 0])) as Record<UsageKind, number>;
  for (const row of rows) {
    for (const kind of USAGE_KINDS) byKind[kind] += row.byKind[kind] ?? 0;
  }
  return { active: rows.length, byKind };
}

function camerasFrom(rows: { alias: string; src: string }[]): AdminCamera[] {
  const saved = new Map(rows.map((row) => [row.alias, row.src]));
  const known = listedCameras();
  const knownAliases = new Set(known.map((camera) => camera.alias));
  const listed = known.map((camera) => {
    const src = saved.get(camera.alias);
    return {
      name: camera.name,
      alias: camera.alias,
      src: src || camera.src,
      source: src ? ("saved" as const) : ("fallback" as const),
    };
  });
  const extra = rows
    .filter((row) => !knownAliases.has(row.alias))
    .map((row) => ({
      name: row.alias,
      alias: row.alias,
      src: row.src,
      source: "saved" as const,
    }));
  return [...listed, ...extra];
}

function feedGroupsFrom(rows: { id: string; src: string }[]): AdminFeedGroup[] {
  const saved = new Map(rows.map((row) => [row.id, row.src]));
  const known = new Set<string>();
  const groups: AdminFeedGroup[] = FEED_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    detail: `${group.border} · ${group.provider}`,
    feeds: group.feeds.map((feed) => {
      known.add(feed.id);
      const src = saved.get(feed.id);
      return {
        id: feed.id,
        label: feed.label,
        kind: feed.kind,
        src: src || feed.src,
        source: src ? ("saved" as const) : ("fallback" as const),
      };
    }),
  }));
  const extra = rows.filter((row) => row.id && !known.has(row.id));
  if (extra.length === 0) return groups;
  return [
    ...groups,
    {
      id: "other",
      name: "Other",
      detail: "Saved in the database",
      feeds: extra.map((row) => ({
        id: row.id,
        label: row.id,
        kind: null,
        src: row.src,
        source: "saved" as const,
      })),
    },
  ];
}

function jsonList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * One cheap read per table, joined in memory by account id. A table that does not exist yet counts
 * as empty, so a fresh database still renders.
 */
async function readFacts(mark: (error: unknown, quietWhenMissing: boolean) => void): Promise<Omit<RawFacts, "usage">> {
  const sql = database();
  const safe = <T,>(query: PromiseLike<unknown>, quiet: boolean): Promise<T[]> =>
    Promise.resolve(query).then(
      (rows) => rows as T[],
      (error: unknown) => {
        mark(error, quiet);
        return [];
      },
    );

  const [profiles, streaks, preferences, alerts, schedules, devices] = await Promise.all([
    safe<{
      id: string;
      name: string | null;
      email: string;
      created_at: unknown;
      updated_at: unknown;
      referral: string | null;
      referral_pending: unknown;
      referred_by: string | null;
    }>(
      sql`
        select id, name, email, created_at, updated_at, referral, referral_pending, referred_by
        from profile
        order by created_at desc
        limit ${ACCOUNT_LIMIT}
      `,
      false,
    ),
    safe<{ user_id: string; current_run: unknown; longest_run: unknown; total_days: unknown; last_day: string | null }>(
      sql`select user_id, current_run, longest_run, total_days, last_day from streak`,
      true,
    ),
    safe<{ user_id: string; locale: string | null; wallet: unknown; pins: unknown }>(
      sql`select user_id, locale, wallet, pins from preference`,
      true,
    ),
    safe<{ user_id: string; port_number: string }>(sql`select user_id, port_number from wait_alert`, true),
    safe<{ user_id: string; ports: unknown; enabled: boolean }>(
      sql`select user_id, ports, enabled from schedule`,
      true,
    ),
    safe<{ user_id: string; count: unknown }>(
      sql`select user_id, count(*)::int as count from push_subscription group by user_id`,
      true,
    ),
  ]);

  return {
    profiles: profiles.flatMap((row) => {
      const createdAt = iso(row.created_at);
      if (!row.email || !createdAt) return [];
      return [
        {
          id: row.id,
          name: row.name ?? "",
          email: row.email,
          createdAt,
          updatedAt: iso(row.updated_at) ?? createdAt,
          referral: row.referral,
          referralPending: row.referral_pending === true || row.referral_pending === "t",
          referredBy: row.referred_by,
        },
      ];
    }),
    streaks: streaks.map((row) => ({
      userId: row.user_id,
      current: asCount(row.current_run),
      longest: asCount(row.longest_run),
      totalDays: asCount(row.total_days),
      lastDay: row.last_day,
    })),
    preferences: preferences.map((row) => ({
      userId: row.user_id,
      locale: row.locale,
      wallet: jsonList(row.wallet).flatMap((entry) =>
        entry && typeof entry === "object" && "portNumber" in entry && typeof entry.portNumber === "string"
          ? [{ portNumber: entry.portNumber }]
          : [],
      ),
      pins: jsonList(row.pins).length,
    })),
    alerts: alerts.map((row) => ({ userId: row.user_id, portNumber: row.port_number })),
    schedules: schedules.map((row) => ({
      userId: row.user_id,
      ports: jsonList(row.ports).filter((port): port is string => typeof port === "string"),
      enabled: row.enabled,
    })),
    devices: devices.map((row) => ({ userId: row.user_id, count: asCount(row.count) })),
  };
}
