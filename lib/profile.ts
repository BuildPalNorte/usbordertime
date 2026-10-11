import { neon } from "@neondatabase/serverless";

export type ProfileIdentity = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

/** Creates the profile on first sign-in and refreshes name, email, and photo after that. */
export async function ensureProfile(identity: ProfileIdentity): Promise<void> {
  const sql = database();
  await sql`
    insert into profile (id, email, name, image)
    values (${identity.id}, ${identity.email}, ${identity.name}, ${identity.image})
    on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updated_at = now()
  `;
}
