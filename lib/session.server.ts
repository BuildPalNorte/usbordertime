import { getAuth } from "@/lib/auth/server";
import { headers } from "next/headers";

export const NO_STORE = { "Cache-Control": "private, no-store" };

/** The signed-in account id for this request, or null. */
export async function sessionUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/** The signed-in account id and email for this request, or null. */
export async function sessionUser(): Promise<{ id: string; email: string | null } | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user;
  return user?.id ? { id: user.id, email: user.email ?? null } : null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400, headers: NO_STORE });
}

/** A 500. Pass the caught error so the real cause reaches the server log, not the rider. */
export function serverError(message: string, cause?: unknown): Response {
  if (cause !== undefined) console.error(message, cause);
  return Response.json({ error: message }, { status: 500, headers: NO_STORE });
}
