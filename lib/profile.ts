import { database } from "@/lib/db.server";
import { INVITE_COOKIE, isUserId } from "@/lib/invite";
import { type GeoPoint } from "@/lib/port-locations";
import { isReferral, type Referral } from "@/lib/referral";
import { cookies } from "next/headers";

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
      await sql`alter table profile add column if not exists referred_by text`;
      await sql`
        alter table profile
        add column if not exists location_pending boolean not null default false
      `;
      await sql`
        alter table profile
        add column if not exists latitude double precision,
        add column if not exists longitude double precision
      `;
      await sql`
        create index if not exists profile_referred_by_idx
        on profile (referred_by)
        where referred_by is not null
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
 * The sharer stored before sign-in, when that id is already a profile and is not this account.
 * A missing or forged id does not block the new profile.
 */
async function referrerFromVisit(userId: string): Promise<string | null> {
  const value = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!isUserId(value) || value === userId) return null;
  const sql = database();
  const rows = await sql`select id from profile where id = ${value} limit 1`;
  return rows.length > 0 ? value : null;
}

/**
 * Creates the profile on first sign-in and refreshes name, email, and photo when they change.
 * A returning visit with nothing new is a read, not a write.
 * `referred_by` is written only on the insert. A later visit does not change it.
 */
export async function ensureProfile(
  identity: ProfileIdentity,
): Promise<{ referralPending: boolean; locationPending: boolean }> {
  await ensureProfileColumns();
  const sql = database();
  const existing = (await sql`
    select email, name, image, referral_pending, location_pending
    from profile where id = ${identity.id} limit 1
  `) as {
    email: string;
    name: string;
    image: string | null;
    referral_pending?: unknown;
    location_pending?: unknown;
  }[];
  const row = existing[0];
  if (
    row &&
    row.email === identity.email &&
    row.name === identity.name &&
    (row.image ?? null) === identity.image
  ) {
    return {
      referralPending: pendingFrom(row.referral_pending),
      locationPending: pendingFrom(row.location_pending),
    };
  }
  const referredBy = row ? null : await referrerFromVisit(identity.id);
  const rows = await sql`
    insert into profile (id, email, name, image, referral_pending, location_pending, referred_by)
    values (${identity.id}, ${identity.email}, ${identity.name}, ${identity.image}, true, true, ${referredBy})
    on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updated_at = now()
    returning referral_pending, location_pending
  `;
  const saved = rows[0] as { referral_pending?: unknown; location_pending?: unknown } | undefined;
  return {
    referralPending: pendingFrom(saved?.referral_pending),
    locationPending: pendingFrom(saved?.location_pending),
  };
}

/**
 * Clears the location question for an account that still owes one, whichever way they
 * answered — sharing their position or picking manually both end the question.
 * A shared position is stored on that profile even when the question was already
 * cleared, so a replay can replace it. Picking by hand leaves latitude and longitude
 * as they were. A second call after it is cleared still reports success.
 */
export async function saveLocationChoice(userId: string, point: GeoPoint | null = null): Promise<boolean> {
  await ensureProfileColumns();
  const sql = database();
  const updated = point
    ? await sql`
        update profile
        set location_pending = false,
            latitude = ${point.lat},
            longitude = ${point.lng},
            updated_at = now()
        where id = ${userId}
        returning id
      `
    : await sql`
        update profile
        set location_pending = false,
            updated_at = now()
        where id = ${userId}
          and location_pending = true
        returning id
      `;
  if (updated.length > 0) return true;

  const rows = await sql`select location_pending from profile where id = ${userId} limit 1`;
  return rows.length > 0 && !pendingFrom((rows[0] as { location_pending?: unknown }).location_pending);
}

/** Development only. Puts the location question back in front of this account. */
export async function replayLocationPrompt(userId: string): Promise<void> {
  await ensureProfileColumns();
  const sql = database();
  await sql`update profile set location_pending = true, updated_at = now() where id = ${userId}`;
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
