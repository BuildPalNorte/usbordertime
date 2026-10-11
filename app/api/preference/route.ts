import { getAuth } from "@/lib/auth/server";
import { parsePreference } from "@/lib/preference";
import { getPreference, savePreference } from "@/lib/preference.server";
import { headers } from "next/headers";

const NO_STORE = { "Cache-Control": "private, no-store" };

async function sessionUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  try {
    const preference = await getPreference(userId);
    return Response.json(preference, { headers: NO_STORE });
  } catch {
    return Response.json({ error: "Could not load preferences." }, { status: 500, headers: NO_STORE });
  }
}

export async function PUT(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected preferences." }, { status: 400, headers: NO_STORE });
  }

  const preference = parsePreference(body);
  if (!preference) {
    return Response.json({ error: "Expected preferences." }, { status: 400, headers: NO_STORE });
  }

  try {
    const savedAt = await savePreference(userId, preference);
    return Response.json({ ...preference, savedAt }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: "Could not save preferences." }, { status: 500, headers: NO_STORE });
  }
}
