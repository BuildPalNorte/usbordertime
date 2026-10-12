import { isAdminEmail } from "@/lib/admin.server";
import { listAnnouncements, sendAnnouncement } from "@/lib/announcement.server";
import { parseAnnouncementInput } from "@/lib/announcement";
import { getAuth } from "@/lib/auth/server";
import { badRequest, NO_STORE, serverError, unauthorized } from "@/lib/session.server";
import { headers } from "next/headers";

/** Only an admin email (`ADMIN_EMAILS`) may read or send. Everyone else gets the same 401 as a missing session. */
async function requireAdmin(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id || !isAdminEmail(user.email)) return null;
  return user.id;
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return unauthorized();

  try {
    const announcements = await listAnnouncements();
    return Response.json({ announcements }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not load announcements.", error);
  }
}

/** Sends one push to every device on file right now and records it for the history list. */
export async function POST(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a title, body, and url.");
  }
  const input = parseAnnouncementInput(body);
  if (!input) return badRequest("Expected a title, body, and url.");

  try {
    const result = await sendAnnouncement(adminId, input.title, input.body, input.url);
    if (result.status === "empty") return badRequest("Title and body can't be empty.");
    if (result.status === "no-devices") {
      return Response.json({ error: "No device has notifications on yet." }, { status: 409, headers: NO_STORE });
    }
    return Response.json({ announcement: result.announcement }, { headers: NO_STORE });
  } catch (error) {
    return serverError("The announcement did not go out.", error);
  }
}
