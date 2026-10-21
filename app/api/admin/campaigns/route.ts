import { isAdminEmail } from "@/lib/admin.server";
import { createCampaign } from "@/lib/campaign.server";
import { getAuth } from "@/lib/auth/server";
import { badRequest, NO_STORE, serverError, unauthorized } from "@/lib/session.server";
import { headers } from "next/headers";

/** Only an admin email (`ADMIN_EMAILS`) may create one. Everyone else gets the same 401 as a missing session. */
async function requireAdmin(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id || !isAdminEmail(user.email)) return null;
  return user.id;
}

/** Creates a campaign and returns the link's code. The page already listed the rest. */
export async function POST(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Give the campaign a name.");
  }
  const name = body && typeof body === "object" && "name" in body ? body.name : null;

  try {
    const result = await createCampaign(name);
    if (result.status === "empty") return badRequest("Give the campaign a name.");
    if (result.status === "invalid") {
      return badRequest("Use at least two letters or numbers, up to 60 characters.");
    }
    if (result.status === "taken") {
      return Response.json(
        { error: "A campaign already uses that link. Try a different name." },
        { status: 409, headers: NO_STORE },
      );
    }
    return Response.json({ campaign: result.campaign }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not create that campaign.", error);
  }
}
