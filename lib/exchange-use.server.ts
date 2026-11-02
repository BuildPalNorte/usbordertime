import { ANALYTICS_EXCLUDED_EMAILS } from "@/lib/analytics";
import { database } from "@/lib/db.server";

let ensuring: Promise<void> | null = null;

/** `exchange_use` is one row per amount a rider settled on in the converter. */
export function ensureExchangeUseTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists exchange_use (
          id bigserial primary key,
          user_id text not null references profile (id) on delete cascade,
          currency text not null check (currency in ('USD', 'MXN')),
          amount numeric not null,
          usd numeric not null,
          created_at timestamptz not null default now()
        )
      `;
      await sql`create index if not exists exchange_use_created_idx on exchange_use (created_at)`;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

export async function recordExchangeUse(
  userId: string,
  currency: "USD" | "MXN",
  amount: number,
  usd: number,
): Promise<void> {
  await ensureExchangeUseTable();
  const sql = database();
  await sql`
    insert into exchange_use (user_id, currency, amount, usd)
    values (${userId}, ${currency}, ${amount}, ${usd})
  `;
}

export type ExchangeSummary = {
  conversions: number;
  people: number;
  last7: number;
  /** Dollar worth of the middle and the largest amount looked at. */
  medianUsd: number;
  maxUsd: number;
  /** Conversions that started from each currency. */
  fromUsd: number;
  fromMxn: number;
};

/** Totals in SQL, so the dashboard never reads every row. The people who run the app are left out. */
export async function readExchangeSummary(): Promise<ExchangeSummary> {
  await ensureExchangeUseTable();
  const sql = database();
  const out = ANALYTICS_EXCLUDED_EMAILS.map((email) => email.toLowerCase());
  const rows = (await sql`
    select
      count(*)::int as conversions,
      count(distinct e.user_id)::int as people,
      count(*) filter (where e.created_at > now() - interval '7 days')::int as last7,
      coalesce(percentile_cont(0.5) within group (order by e.usd), 0)::float as median_usd,
      coalesce(max(e.usd), 0)::float as max_usd,
      count(*) filter (where e.currency = 'USD')::int as from_usd,
      count(*) filter (where e.currency = 'MXN')::int as from_mxn
    from exchange_use e
    join profile p on p.id = e.user_id
    where lower(p.email) <> all(${out})
  `) as Record<string, number>[];
  const row = rows[0] ?? {};
  const n = (key: string) => Number(row[key]) || 0;
  return {
    conversions: n("conversions"),
    people: n("people"),
    last7: n("last7"),
    medianUsd: n("median_usd"),
    maxUsd: n("max_usd"),
    fromUsd: n("from_usd"),
    fromMxn: n("from_mxn"),
  };
}
