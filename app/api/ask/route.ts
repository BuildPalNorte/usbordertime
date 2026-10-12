import { allow, answer, parseMessages } from "@/lib/ask.server";
import { isLocale } from "@/lib/i18n";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";
import { claimAsk } from "@/lib/usage.server";

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

  const ASK_LIMIT = 12;
  // The shared count when the database answers; this instance's own count when it does not.
  const claimed = await claimAsk(userId, ASK_LIMIT);
  if (claimed === false || (claimed === null && !allow(userId, ASK_LIMIT))) {
    return Response.json(
      { error: "Too many questions. Wait a minute." },
      { status: 429, headers: NO_STORE },
    );
  }

  try {
    const reply = await answer(messages, isLocale(locale) ? locale : "en");
    return Response.json({ reply }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not answer right now.", error);
  }
}
