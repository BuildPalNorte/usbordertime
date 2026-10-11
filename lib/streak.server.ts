import { ensureTables as ensureAlertTables } from "@/lib/alert.server";
import {
  dayIn,
  EMPTY_STREAK,
  recordDay,
  viewStreak,
  type StreakRecord,
  type StreakView,
} from "@/lib/streak";
import { neon } from "@neondatabase/serverless";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

let ensuring: Promise<void> | null = null;

/** `streak` belongs to a profile, like `schedule`, and is created on first use. */
function ensureTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await ensureAlertTables();
      await sql`
        create table if not exists streak (
          user_id text primary key references profile (id) on delete cascade,
          current_run integer not null default 0,
          longest_run integer not null default 0,
          total_days integer not null default 0,
          last_day text,
          updated_at timestamptz not null default now()
        )
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

type Row = { current_run: number; longest_run: number; total_days: number; last_day: string | null };

async function readRecord(userId: string): Promise<StreakRecord> {
  const sql = database();
  const rows = (await sql`
    select current_run, longest_run, total_days, last_day from streak where user_id = ${userId}
  `) as Row[];
  const row = rows[0];
  if (!row) return EMPTY_STREAK;
  return {
    current: row.current_run,
    longest: row.longest_run,
    totalDays: row.total_days,
    lastDay: row.last_day,
  };
}

/** The account's streak as of today in `timeZone`, without counting a visit. */
export async function getStreak(userId: string, timeZone: string): Promise<StreakView> {
  await ensureTable();
  return viewStreak(await readRecord(userId), dayIn(timeZone));
}

/** Counts today's visit once. Calling it again the same day returns the same streak. */
export async function recordVisit(userId: string, timeZone: string): Promise<StreakView> {
  await ensureTable();
  const sql = database();
  const today = dayIn(timeZone);
  const { record, advanced } = recordDay(await readRecord(userId), today);
  if (advanced) {
    await sql`
      insert into streak (user_id, current_run, longest_run, total_days, last_day)
      values (${userId}, ${record.current}, ${record.longest}, ${record.totalDays}, ${record.lastDay})
      on conflict (user_id) do update
      set current_run = excluded.current_run,
          longest_run = excluded.longest_run,
          total_days = excluded.total_days,
          last_day = excluded.last_day,
          updated_at = now()
    `;
  }
  return viewStreak(record, today, advanced);
}
