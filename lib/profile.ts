import { VISITOR_COOKIE } from "@/lib/analytics";
import { CAMPAIGN_COOKIE, campaignQuery } from "@/lib/campaign";
import { knownCampaign } from "@/lib/campaign.server";
import { database } from "@/lib/db.server";
import { claimVisitor } from "@/lib/visitor.server";
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
      // One statement, not five: this runs once per cold server and each call is a network trip.
      await sql`
        alter table profile
        add column if not exists referral text,
        add column if not exists referral_pending boolean not null default false,
        add column if not exists referred_by text,
        add column if not exists campaign text,
        add column if not exists location_pending boolean not null default false,
        add column if not exists latitude double precision,
        add column if not exists longitude double precision
      `;
      await sql`
        create index if not exists profile_referred_by_idx
        on profile (referred_by)
        where referred_by is not null
      `;
      await sql`
        create index if not exists profile_campaign_idx
        on profile (campaign)
        where campaign is not null
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
 * The campaign stored before sign-in, when that code is one an admin created.
 * A missing or unknown code does not block the new profile.
 */
async function campaignFromVisit(): Promise<string | null> {
  try {
    const value = (await cookies()).get(CAMPAIGN_COOKIE)?.value ?? null;
    return await knownCampaign(campaignQuery(value));
  } catch (error) {
    console.error("campaign", error);
    return null;
  }
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
 * `referred_by` and `campaign` are written only on the insert. A later visit does not change them.
 */
export async function ensureProfile(
  identity: ProfileIdentity,
): Promise<{ referralPending: boolean; locationPending: boolean }> {
  const result = await saveProfile(identity);
  // The profile exists now, so the sign-in screen this browser saw can be tied to it. Best effort.
  try {
    const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
    await claimVisitor(visitorId, identity.id, identity.email);
  } catch (error) {
    console.error("visitor claim", error);
  }
  return result;
}

async function saveProfile(
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
  const campaign = row ? null : await campaignFromVisit();
  const rows = await sql`
    insert into profile (id, email, name, image, referral_pending, location_pending, referred_by, campaign)
    values (${identity.id}, ${identity.email}, ${identity.name}, ${identity.image}, true, true, ${referredBy}, ${campaign})
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
