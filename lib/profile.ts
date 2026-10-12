import { isReferral, type Referral } from "@/lib/referral";
import { database } from "@/lib/db.server";

export type ProfileIdentity = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};


let ensuring: Promise<void> | null = null;

/** Adds the referral columns. Existing accounts stay unanswered and are not asked. */
export function ensureProfileColumns(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`alter table profile add column if not exists referral text`;
      await sql`
        alter table profile
        add column if not exists referral_pending boolean not null default false
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

function pendingFrom(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

/**
 * Creates the profile on first sign-in and refreshes name, email, and photo when they change.
 * A returning visit with nothing new is a read, not a write.
 */
export async function ensureProfile(identity: ProfileIdentity): Promise<{ referralPending: boolean }> {
  await ensureProfileColumns();
  const sql = database();
  const existing = (await sql`
    select email, name, image, referral_pending from profile where id = ${identity.id} limit 1
  `) as { email: string; name: string; image: string | null; referral_pending?: unknown }[];
  const row = existing[0];
  if (
    row &&
    row.email === identity.email &&
    row.name === identity.name &&
    (row.image ?? null) === identity.image
  ) {
    return { referralPending: pendingFrom(row.referral_pending) };
  }
  const rows = await sql`
    insert into profile (id, email, name, image, referral_pending)
    values (${identity.id}, ${identity.email}, ${identity.name}, ${identity.image}, true)
    on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updated_at = now()
    returning referral_pending
  `;
  const pending = (rows[0] as { referral_pending?: unknown } | undefined)?.referral_pending;
  return { referralPending: pendingFrom(pending) };
}

/**
 * Saves the choice for an account that still owes one.
 * A second save after the answer is stored reports success and leaves the first choice.
 */
export async function saveReferral(userId: string, source: Referral): Promise<boolean> {
  await ensureProfileColumns();
  const sql = database();
  const updated = await sql`
    update profile
    set referral = ${source},
        referral_pending = false,
        updated_at = now()
    where id = ${userId}
      and referral_pending = true
    returning id
  `;
  if (updated.length > 0) return true;

  const rows = await sql`
    select referral
    from profile
    where id = ${userId}
    limit 1
  `;
  return isReferral((rows[0] as { referral?: unknown } | undefined)?.referral);
}
