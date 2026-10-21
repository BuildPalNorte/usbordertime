import { ANALYTICS_EXCLUDED_EMAILS } from "@/lib/analytics";
import { campaignName, isCampaignSlug, slugFromName, type Campaign } from "@/lib/campaign";
import { database } from "@/lib/db.server";
import { ensureVisitorTable } from "@/lib/visitor.server";

/** Recording a campaign is best effort on the sign-in path: a failed lookup must not block the profile. */

let ensuring: Promise<void> | null = null;

/** `campaign` is one row per link an admin created. Created on first use. */
export function ensureCampaignTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists campaign (
          slug text primary key,
          name text not null,
          created_at timestamptz not null default now()
        )
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

/**
 * The slug from a link, when an admin has created that campaign.
 * Anything else is ignored, the same way a forged invite id is ignored.
 */
export async function knownCampaign(value: string | null): Promise<string | null> {
  if (!isCampaignSlug(value)) return null;
  await ensureCampaignTable();
  const sql = database();
  const rows = await sql`select slug from campaign where slug = ${value} limit 1`;
  return rows.length > 0 ? value : null;
}

export type CreateCampaignResult =
  | { status: "created"; campaign: Campaign }
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "taken" };

/** Stores a campaign and returns it with empty counts. A repeated code is `taken`, not a second row. */
export async function createCampaign(input: unknown): Promise<CreateCampaignResult> {
  const name = campaignName(input);
  if (typeof input !== "string" || !input.trim()) return { status: "empty" };
  if (!name) return { status: "invalid" };
  const slug = slugFromName(name);
  if (!slug) return { status: "invalid" };

  await ensureCampaignTable();
  const sql = database();
  const existing = await sql`select slug from campaign where slug = ${slug} limit 1`;
  if (existing.length > 0) return { status: "taken" };

  const rows = await sql`
    insert into campaign (slug, name)
    values (${slug}, ${name})
    on conflict (slug) do nothing
    returning slug, name, created_at
  `;
  const row = rows[0] as { slug: string; name: string; created_at: unknown } | undefined;
  if (!row) return { status: "taken" };
  const createdAt = iso(row.created_at);
  if (!createdAt) return { status: "taken" };
  return { status: "created", campaign: { slug: row.slug, name: row.name, createdAt, users: 0, opened: 0 } };
}

/**
 * Every campaign, newest first, with how many new accounts signed in from it and how many
 * browsers opened the link. The operator's own account is left out of the user count.
 * `profile.campaign` must already exist; the dashboard adds that column before this runs.
 */
export async function listCampaigns(): Promise<Campaign[]> {
  await ensureCampaignTable();
  await ensureVisitorTable();
  const sql = database();
  const excluded = ANALYTICS_EXCLUDED_EMAILS.map((email) => email.trim().toLowerCase());
  const rows = (await sql`
    select
      c.slug,
      c.name,
      c.created_at,
      (
        select count(*)::int
        from profile p
        where p.campaign = c.slug
          and lower(p.email) <> all(${excluded})
      ) as users,
      (
        select count(*)::int
        from visitor v
        where v.campaign = c.slug
      ) as opened
    from campaign c
    order by c.created_at desc
  `) as { slug: string; name: string; created_at: unknown; users: unknown; opened: unknown }[];

  return rows.flatMap((row) => {
    const createdAt = iso(row.created_at);
    if (!isCampaignSlug(row.slug) || !createdAt) return [];
    return [{ slug: row.slug, name: row.name, createdAt, users: count(row.users), opened: count(row.opened) }];
  });
}
