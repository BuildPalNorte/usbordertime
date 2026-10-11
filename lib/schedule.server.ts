import { ensureTables as ensureAlertTables } from "@/lib/alert.server";
import { isLocale, type Locale } from "@/lib/i18n";
import { ensurePreferenceTable } from "@/lib/preference.server";
import { isMode } from "@/lib/ports";
import {
  daysToMask,
  localMoment,
  MAX_SCHEDULES,
  maskToDays,
  type Schedule,
  type ScheduleInput,
} from "@/lib/schedule";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

let ensuring: Promise<void> | null = null;

/** `schedule` belongs to a profile, like `wait_alert`, and is created on first use. */
function ensureTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await ensureAlertTables();
      await sql`
        create table if not exists schedule (
          id text primary key,
          user_id text not null references profile (id) on delete cascade,
          minute integer not null,
          days integer not null,
          time_zone text not null,
          mode text not null,
          ports jsonb not null,
          enabled boolean not null default true,
          last_sent_on text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint schedule_minute_check check (minute between 0 and 1439),
          constraint schedule_days_check check (days between 1 and 127)
        )
      `;
      await sql`create index if not exists schedule_user_idx on schedule (user_id)`;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

type Row = {
  id: string;
  minute: number;
  days: number;
  time_zone: string;
  mode: string;
  ports: unknown;
  enabled: boolean;
};

function fromRow(row: Row): Schedule | null {
  if (!isMode(row.mode) || !Array.isArray(row.ports)) return null;
  return {
    id: row.id,
    minute: row.minute,
    days: maskToDays(row.days),
    timeZone: row.time_zone,
    mode: row.mode,
    ports: row.ports.filter((port): port is string => typeof port === "string"),
    enabled: row.enabled,
  };
}

export async function listSchedules(userId: string): Promise<Schedule[]> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select id, minute, days, time_zone, mode, ports, enabled
    from schedule
    where user_id = ${userId}
    order by minute, created_at
  `) as Row[];
  return rows.flatMap((row) => {
    const schedule = fromRow(row);
    return schedule ? [schedule] : [];
  });
}

export type SaveResult =
  | { status: "ok"; schedule: Schedule }
  | { status: "limit" }
  | { status: "missing" };

/**
 * Saves a new schedule, or edits one the account already owns. A schedule saved after its time has
 * already passed today starts tomorrow, so setting one up never sends a message right away.
 */
export async function saveSchedule(userId: string, input: ScheduleInput): Promise<SaveResult> {
  await ensureTable();
  const sql = database();

  const now = localMoment(input.timeZone);
  const sentToday = now.minute >= input.minute ? now.date : null;
  const mask = daysToMask(input.days);
  const ports = JSON.stringify(input.ports);

  if (input.id) {
    const rows = (await sql`
      update schedule
      set minute = ${input.minute},
          days = ${mask},
          time_zone = ${input.timeZone},
          mode = ${input.mode},
          ports = ${ports}::jsonb,
          enabled = ${input.enabled},
          last_sent_on = ${sentToday},
          updated_at = now()
      where id = ${input.id} and user_id = ${userId}
      returning id
    `) as unknown[];
    return rows.length > 0
      ? { status: "ok", schedule: { ...input, id: input.id } }
      : { status: "missing" };
  }

  const count = (await sql`
    select count(*)::int as total from schedule where user_id = ${userId}
  `) as { total: number }[];
  if ((count[0]?.total ?? 0) >= MAX_SCHEDULES) return { status: "limit" };

  const id = randomUUID();
  await sql`
    insert into schedule (id, user_id, minute, days, time_zone, mode, ports, enabled, last_sent_on)
    values (${id}, ${userId}, ${input.minute}, ${mask}, ${input.timeZone}, ${input.mode},
            ${ports}::jsonb, ${input.enabled}, ${sentToday})
  `;
  return { status: "ok", schedule: { ...input, id } };
}

export async function deleteSchedule(userId: string, id: string): Promise<void> {
  await ensureTable();
  const sql = database();
  await sql`delete from schedule where id = ${id} and user_id = ${userId}`;
}

export type DueCandidate = Schedule & {
  userId: string;
  lastSentOn: string | null;
  locale: Locale;
};

/** Every running schedule, with the language its owner reads. Only people with a device can be told. */
export async function listRunningSchedules(): Promise<DueCandidate[]> {
  await ensureTable();
  await ensurePreferenceTable();
  const sql = database();
  const rows = (await sql`
    select s.id, s.user_id, s.minute, s.days, s.time_zone, s.mode, s.ports, s.enabled,
           s.last_sent_on, p.locale
    from schedule s
    left join preference p on p.user_id = s.user_id
    where s.enabled
      and exists (select 1 from push_subscription d where d.user_id = s.user_id)
  `) as (Row & { user_id: string; last_sent_on: string | null; locale: string | null })[];
  return rows.flatMap((row) => {
    const schedule = fromRow(row);
    if (!schedule) return [];
    return [
      {
        ...schedule,
        userId: row.user_id,
        lastSentOn: row.last_sent_on,
        locale: isLocale(row.locale) ? row.locale : "en",
      },
    ];
  });
}

/**
 * Marks today as sent in one statement. Of two overlapping runs, only one gets true, so a person
 * is told once.
 */
export async function claimSend(id: string, date: string): Promise<boolean> {
  const sql = database();
  const rows = (await sql`
    update schedule
    set last_sent_on = ${date}, updated_at = now()
    where id = ${id} and last_sent_on is distinct from ${date}
    returning 1 as claimed
  `) as unknown[];
  return rows.length > 0;
}

/** Nobody could be reached. Let the next minute inside the window try again. */
export async function releaseSend(id: string): Promise<void> {
  const sql = database();
  await sql`update schedule set last_sent_on = null, updated_at = now() where id = ${id}`;
}
