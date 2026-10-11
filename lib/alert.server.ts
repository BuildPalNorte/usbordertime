import { MAX_ALERTS, type PushDevice, type WaitAlert } from "@/lib/alert";
import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { ensurePreferenceTable } from "@/lib/preference.server";
import { isMode } from "@/lib/ports";
import { neon } from "@neondatabase/serverless";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

let ensuring: Promise<void> | null = null;

/** `wait_alert` is the rule; `push_subscription` is the device. Both belong to a profile. */
export function ensureTables(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists wait_alert (
          user_id text not null references profile (id) on delete cascade,
          port_number text not null,
          mode text not null,
          threshold integer not null,
          below boolean not null default false,
          notified_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          primary key (user_id, port_number, mode),
          constraint wait_alert_threshold_check check (threshold between 5 and 180)
        )
      `;
      await sql`
        create table if not exists push_subscription (
          endpoint text primary key,
          user_id text not null references profile (id) on delete cascade,
          p256dh text not null,
          auth text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists push_subscription_user_idx on push_subscription (user_id)
      `;
      await sql`
        alter table push_subscription add column if not exists device_key text
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

type AlertRow = {
  port_number: string;
  mode: string;
  threshold: number;
};

export async function listAlerts(userId: string): Promise<WaitAlert[]> {
  await ensureTables();
  const sql = database();
  const rows = (await sql`
    select port_number, mode, threshold
    from wait_alert
    where user_id = ${userId}
    order by created_at
  `) as AlertRow[];
  return rows.flatMap((row) =>
    isMode(row.mode)
      ? [{ portNumber: row.port_number, mode: row.mode, threshold: row.threshold }]
      : [],
  );
}

/**
 * Saves the alert. `below` is where the lane stands right now, so setting an alert on a lane that
 * is already short does not fire at once. It fires the next time the wait drops under.
 * Returns false when the account is at its limit.
 */
export async function saveAlert(
  userId: string,
  alert: WaitAlert,
  below: boolean,
): Promise<boolean> {
  await ensureTables();
  const sql = database();
  const rows = (await sql`
    select port_number, mode from wait_alert where user_id = ${userId}
  `) as { port_number: string; mode: string }[];
  const exists = rows.some((row) => row.port_number === alert.portNumber && row.mode === alert.mode);
  if (!exists && rows.length >= MAX_ALERTS) return false;

  await sql`
    insert into wait_alert (user_id, port_number, mode, threshold, below)
    values (${userId}, ${alert.portNumber}, ${alert.mode}, ${alert.threshold}, ${below})
    on conflict (user_id, port_number, mode) do update
    set threshold = excluded.threshold,
        below = excluded.below,
        updated_at = now()
  `;
  return true;
}

export async function deleteAlert(
  userId: string,
  portNumber: string,
  mode: string,
): Promise<void> {
  await ensureTables();
  const sql = database();
  await sql`
    delete from wait_alert
    where user_id = ${userId} and port_number = ${portNumber} and mode = ${mode}
  `;
}

/**
 * A device belongs to whoever signed in last. The same phone never serves two accounts.
 * `deviceKey` is this browser. Saving replaces that browser's previous address, and any address
 * saved before device keys existed, so one browser does not collect a stack of them.
 */
export async function savePushDevice(
  userId: string,
  device: PushDevice,
  deviceKey: string | null,
): Promise<void> {
  await ensureTables();
  const sql = database();
  await sql`
    insert into push_subscription (endpoint, user_id, p256dh, auth, device_key)
    values (${device.endpoint}, ${userId}, ${device.keys.p256dh}, ${device.keys.auth}, ${deviceKey})
    on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        device_key = coalesce(excluded.device_key, push_subscription.device_key),
        updated_at = now()
  `;
  if (!deviceKey) return;
  await sql`
    delete from push_subscription
    where user_id = ${userId}
      and endpoint <> ${device.endpoint}
      and (device_key is null or device_key = ${deviceKey})
  `;
}

/** Only the owner can drop a device. Another account's endpoint is left alone. */
export async function deletePushDevice(userId: string, endpoint: string): Promise<void> {
  await ensureTables();
  const sql = database();
  await sql`
    delete from push_subscription where endpoint = ${endpoint} and user_id = ${userId}
  `;
}

/** The push service said this address is gone. */
export async function forgetPushDevice(endpoint: string): Promise<void> {
  await ensureTables();
  const sql = database();
  await sql`delete from push_subscription where endpoint = ${endpoint}`;
}

export async function listPushDevices(userId: string): Promise<PushDevice[]> {
  await ensureTables();
  const sql = database();
  const rows = (await sql`
    select endpoint, p256dh, auth from push_subscription where user_id = ${userId}
  `) as { endpoint: string; p256dh: string; auth: string }[];
  return rows.map((row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }));
}

export type ArmedAlert = WaitAlert & {
  userId: string;
  below: boolean;
  locale: Locale;
};

/** Every alert, with the language its owner reads. Only people with a device can be told. */
export async function listArmedAlerts(): Promise<ArmedAlert[]> {
  await ensureTables();
  await ensurePreferenceTable();
  const sql = database();
  const rows = (await sql`
    select a.user_id, a.port_number, a.mode, a.threshold, a.below, p.locale
    from wait_alert a
    left join preference p on p.user_id = a.user_id
    where exists (select 1 from push_subscription s where s.user_id = a.user_id)
  `) as (AlertRow & { user_id: string; below: boolean; locale: string | null })[];
  return rows.flatMap((row) =>
    isMode(row.mode)
      ? [
          {
            userId: row.user_id,
            portNumber: row.port_number,
            mode: row.mode,
            threshold: row.threshold,
            below: row.below,
            locale: isLocale(row.locale) ? row.locale : "en",
          },
        ]
      : [],
  );
}

export async function setBelow(alert: ArmedAlert, below: boolean): Promise<void> {
  const sql = database();
  await sql`
    update wait_alert
    set below = ${below}, updated_at = now()
    where user_id = ${alert.userId} and port_number = ${alert.portNumber} and mode = ${alert.mode}
  `;
}

/**
 * Flips `below` from false to true in one statement. Of two overlapping runs, only one gets true,
 * so a person is told once.
 */
export async function claimBelow(alert: ArmedAlert): Promise<boolean> {
  const sql = database();
  const rows = (await sql`
    update wait_alert
    set below = true, notified_at = now(), updated_at = now()
    where user_id = ${alert.userId}
      and port_number = ${alert.portNumber}
      and mode = ${alert.mode}
      and below = false
    returning 1 as claimed
  `) as unknown[];
  return rows.length > 0;
}
