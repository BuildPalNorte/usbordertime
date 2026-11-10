import { isAdminEmail } from "@/lib/admin.server";
import { openRangeIssue, parseOpenRange } from "@/lib/app-opens";
import { getAuth } from "@/lib/auth/server";
import { badRequest, NO_STORE, serverError, unauthorized } from "@/lib/session.server";
import { readAppOpens } from "@/lib/usage.server";
import { headers } from "next/headers";

/** Only an admin email (`ADMIN_EMAILS`) may read this. Everyone else gets the same 401 as a missing session. */
async function requireAdmin(): Promise<boolean> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user;
  return Boolean(user?.id && isAdminEmail(user.email));
}

/** Unique accounts and every app open between two Central calendar days, inclusive. */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = parseOpenRange(from, to);
  if (!range) return badRequest(openRangeIssue(from ?? "", to ?? "") ?? "Pick a start and an end.");

  try {
    return Response.json(await readAppOpens(range.from, range.to), { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not read uses for that time.", error);
  }
}
