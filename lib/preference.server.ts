import { parsePreference, type Preference, type PreferenceRecord } from "@/lib/preference";
import { neon } from "@neondatabase/serverless";

type PreferenceRow = {
  locale: string | null;
  theme: string | null;
  wallet: unknown;
  pins: unknown;
  updated_at: Date | string;
};

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function savedAtFrom(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

let ensuring: Promise<void> | null = null;

export function ensurePreferenceTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = sql`
      create table if not exists preference (
        user_id text primary key references profile (id) on delete cascade,
        locale text,
        theme text,
        wallet jsonb not null default '[]'::jsonb,
        pins jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now(),
        constraint preference_locale_check check (locale is null or locale in ('en', 'es')),
        constraint preference_theme_check check (theme is null or theme in ('light', 'dark'))
      )
    `
      .then(() => undefined)
      .catch((error: unknown) => {
        ensuring = null;
        throw error;
      });
  }
  return ensuring;
}

/** The account copy, or null when this account has not saved one yet. */
export async function getPreference(userId: string): Promise<PreferenceRecord | null> {
  await ensurePreferenceTable();
  const sql = database();
  const rows = (await sql`
    select locale, theme, wallet, pins, updated_at
    from preference
    where user_id = ${userId}
    limit 1
  `) as PreferenceRow[];
  const row = rows[0];
  if (!row) return null;
  const preference = parsePreference({
    locale: row.locale,
    theme: row.theme,
    wallet: jsonValue(row.wallet),
    pins: jsonValue(row.pins),
  });
  if (!preference) return null;
  return { ...preference, savedAt: savedAtFrom(row.updated_at) };
}

/** Replaces the account copy. Returns the database time of that write. */
export async function savePreference(userId: string, preference: Preference): Promise<string> {
  await ensurePreferenceTable();
  const sql = database();
  const rows = (await sql`
    insert into preference (user_id, locale, theme, wallet, pins)
    values (
      ${userId},
      ${preference.locale},
      ${preference.theme},
      ${JSON.stringify(preference.wallet)}::jsonb,
      ${JSON.stringify(preference.pins)}::jsonb
    )
    on conflict (user_id) do update
    set locale = excluded.locale,
        theme = excluded.theme,
        wallet = excluded.wallet,
        pins = excluded.pins,
        updated_at = now()
    returning updated_at
  `) as { updated_at: Date | string }[];
  return savedAtFrom(rows[0]?.updated_at ?? new Date(0));
}
