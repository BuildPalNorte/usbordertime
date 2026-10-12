import { getAuth } from "@/lib/auth/server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { listedCameras, portName } from "@/lib/ports";
import { ensureProfile, ensureProfileColumns } from "@/lib/profile";
import { isReferral, REFERRAL_LABEL, REFERRALS, type Referral } from "@/lib/referral";
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

const PEOPLE_LIMIT = 20;
const ALERT_LIMIT = 12;
const INVITE_LIMIT = 12;

const LANE_LABEL: Record<string, string> = {
  car: "Car",
  ready: "Ready lane",
  sentri: "SENTRI",
  walk: "Walking",
  truck: "Truck",
  fast: "FAST truck",
};

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  return adminEmails().some((entry) => entry.toLowerCase() === needle);
}

export type AdminViewer = { name: string; email: string };

export type AdminStat = { label: string; value: number; detail: string };

export type AdminAccount = {
  name: string;
  email: string;
  updatedAt: string;
  referral: string | null;
  invitedBy: string | null;
  usage: AdminUsage;
};

/** One account's activity. `byKind` is zero for kinds it never used. */
export type AdminUsage = {
  total: number;
  lastActive: string | null;
  byKind: Record<UsageKind, number>;
};

export type AdminReferral = { source: Referral; label: string; count: number };

export type AdminInvite = { name: string; email: string; count: number };

export type AdminAlertGroup = { portNumber: string; label: string; lane: string; count: number };

export type AdminCamera = {
  name: string;
  alias: string;
  src: string;
  source: "saved" | "fallback";
};

export type AdminUsageTotals = { active: number; byKind: Record<UsageKind, number> };

export type AdminData = {
  stats: AdminStat[];
  people: AdminAccount[];
  accountTotal: number;
  usage: AdminUsageTotals;
  referrals: AdminReferral[];
  referralPending: number;
  invites: AdminInvite[];
  alerts: AdminAlertGroup[];
  cameras: AdminCamera[];
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
  const peopleQuery = sql`
    select p.id, p.name, p.email, p.updated_at, p.referral,
           r.name as referrer_name, r.email as referrer_email
    from profile p
    left join profile r on r.id = p.referred_by
    order by p.updated_at desc
    limit ${PEOPLE_LIMIT}
  `;
  const referralsQuery = sql`
    select referral, count(*)::int as count
    from profile
    where referral is not null
    group by referral
  `;
  const referralPendingQuery = sql`
    select count(*)::int as count
    from profile
    where referral_pending
  `;
  const invitesQuery = sql`
    select r.name, r.email, count(*)::int as count
    from profile p
    join profile r on r.id = p.referred_by
    group by r.id, r.name, r.email
    order by count desc, r.name
    limit ${INVITE_LIMIT}
  `;
  const alertTotalsQuery = sql`
    select
      count(*)::int as alerts,
      count(*) filter (where below)::int as below
    from wait_alert
  `;
  const alertGroupsQuery = sql`
    select port_number, mode, count(*)::int as count
    from wait_alert
    group by port_number, mode
    order by count desc, port_number
    limit ${ALERT_LIMIT}
  `;
  const devicesQuery = sql`select count(*)::int as count from push_subscription`;
  const schedulesQuery = sql`
    select
      count(*)::int as total,
      count(*) filter (where enabled)::int as enabled
    from schedule
  `;
  const camerasQuery = sql`select alias, src from camera_stream`;
  const feedQuery = getBorderWaitTimes().then(
    (snapshot) => ({ fetchedAt: snapshot.fetchedAt, ports: snapshot.ports }),
    () => null,
  );

  const usageQuery = readUsageTotals().catch((error: unknown) => {
    mark(error, true);
    return [];
  });

  const [accounts, people, referralRows, referralPending, alertTotals, alertGroups, devices, schedules, cameras, feed, usageRows, inviteRows] =
    await Promise.all([
    accountsQuery.then(
      (rows) => asCount((rows[0] as { count?: unknown } | undefined)?.count),
      (error: unknown) => {
        mark(error, false);
        return 0;
      },
    ),
    peopleQuery.then(
      (rows) =>
        rows as {
          id: string;
          name: string | null;
          email: string;
          updated_at: unknown;
          referral: unknown;
          referrer_name: string | null;
          referrer_email: string | null;
        }[],
      (error: unknown) => {
        mark(error, false);
        return [];
      },
    ),
    referralsQuery.then(
      (rows) => rows as { referral: unknown; count: unknown }[],
      (error: unknown) => {
        mark(error, false);
        return [];
      },
    ),
    referralPendingQuery.then(
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
    alertGroupsQuery.then(
      (rows) => rows as { port_number: string; mode: string; count: unknown }[],
      (error: unknown) => {
        mark(error, true);
        return [];
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
    feedQuery,
    usageQuery,
    invitesQuery.then(
      (rows) => rows as { name: string | null; email: string; count: unknown }[],
      (error: unknown) => {
        mark(error, false);
        return [];
      },
    ),
  ]);

  const usageByUser = new Map(usageRows.map((row) => [row.userId, row]));
  const byNumber = new Map((feed?.ports ?? []).map((port) => [port.portNumber, port]));
  const alertCount = asCount(alertTotals.alerts);
  const below = asCount(alertTotals.below);
  const scheduleTotal = asCount(schedules.total);
  const scheduleOn = asCount(schedules.enabled);

  return {
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
    people: people.flatMap((row) => {
      const updatedAt = iso(row.updated_at);
      if (!row.email || !updatedAt) return [];
      return [
        {
          name: row.name?.trim() || row.email,
          email: row.email,
          updatedAt,
          referral: isReferral(row.referral) ? REFERRAL_LABEL[row.referral] : null,
          invitedBy: personName(row.referrer_name, row.referrer_email),
          usage: usageFor(usageByUser.get(row.id)),
        },
      ];
    }),
    usage: usageTotals(usageRows),
    accountTotal: accounts,
    referrals: referralCounts(referralRows),
    referralPending,
    invites: inviteRows.flatMap((row) => {
      const name = personName(row.name, row.email);
      const count = asCount(row.count);
      if (!name || !row.email || count < 1) return [];
      return [{ name, email: row.email, count }];
    }),
    alerts: alertGroups.map((row) => {
      const port = byNumber.get(row.port_number);
      const name = port ? portName(port) : null;
      const label =
        name && !name.subtitleIsRegion && name.subtitle !== name.title
          ? `${name.title} · ${name.subtitle}`
          : (name?.title ?? row.port_number);
      return {
        portNumber: row.port_number,
        label,
        lane: LANE_LABEL[row.mode] ?? row.mode,
        count: asCount(row.count),
      };
    }),
    cameras: camerasFrom(cameras),
    feed: feed ? { fetchedAt: feed.fetchedAt, ports: feed.ports.length } : null,
    problem,
  };
}

function personName(name: string | null | undefined, email: string | null | undefined): string | null {
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof email === "string" && email.trim()) return email.trim();
  return null;
}

function usageFor(entry: UsageTotals | undefined): AdminUsage {
  const byKind = Object.fromEntries(USAGE_KINDS.map((kind) => [kind, entry?.byKind[kind] ?? 0])) as Record<
    UsageKind,
    number
  >;
  return { total: entry?.total ?? 0, lastActive: entry?.lastActive ?? null, byKind };
}

/** Across every account: how many people used each feature, and how many were active at all. */
function usageTotals(rows: UsageTotals[]): AdminUsageTotals {
  const byKind = Object.fromEntries(USAGE_KINDS.map((kind) => [kind, 0])) as Record<UsageKind, number>;
  for (const row of rows) {
    for (const kind of USAGE_KINDS) byKind[kind] += row.byKind[kind] ?? 0;
  }
  return { active: rows.length, byKind };
}

function referralCounts(rows: { referral: unknown; count: unknown }[]): AdminReferral[] {
  const counts = new Map<Referral, number>();
  for (const row of rows) {
    if (!isReferral(row.referral)) continue;
    counts.set(row.referral, asCount(row.count));
  }
  return REFERRALS.flatMap((source) => {
    const count = counts.get(source) ?? 0;
    if (count === 0) return [];
    return [{ source, label: REFERRAL_LABEL[source], count }];
  }).sort((a, b) => b.count - a.count || REFERRALS.indexOf(a.source) - REFERRALS.indexOf(b.source));
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
