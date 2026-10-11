import { allow, answer, parseMessages } from "@/lib/ask.server";
import { isLocale } from "@/lib/i18n";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";

/** A signed-in rider asks a question. The reply uses the live CBP snapshot and the hourly averages. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a question.");
  }
  const { messages: raw, locale } = (body ?? {}) as { messages?: unknown; locale?: unknown };
  const messages = parseMessages(raw);
  if (!messages) return badRequest("Expected a question.");

  if (!allow(userId, 12)) {
    return Response.json(
      { error: "Too many questions. Wait a minute." },
      { status: 429, headers: NO_STORE },
    );
  }

  try {
    const reply = await answer(messages, isLocale(locale) ? locale : "en");
    return Response.json({ reply }, { headers: NO_STORE });
  } catch {
    return serverError("Could not answer right now.");
  }
}
