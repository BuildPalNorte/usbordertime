import { isLocale } from "@/lib/i18n";
import { badRequest, NO_STORE, serverError } from "@/lib/session.server";
import { tooManyRequests, withinLimit } from "@/lib/throttle.server";
import { answerTramites, parseMessages } from "@/lib/tramites-ask.server";

/** A guest on /tramites asks what they need. No account. Rate limited by client address. */
export async function POST(request: Request) {
  if (!(await withinLimit("tramites-ask", 8, 60))) return tooManyRequests();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a question.");
  }
  const { messages: raw, locale } = (body ?? {}) as { messages?: unknown; locale?: unknown };
  const messages = parseMessages(raw);
  if (!messages) return badRequest("Expected a question.");

  try {
    const reply = await answerTramites(messages, isLocale(locale) ? locale : "en");
    return Response.json({ reply }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not answer right now.", error);
  }
}
