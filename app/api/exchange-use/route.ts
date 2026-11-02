import { isExcludedFromAnalytics } from "@/lib/analytics";
import { EXCHANGE_MAX_AMOUNT } from "@/lib/exchange-use";
import { recordExchangeUse } from "@/lib/exchange-use.server";
import { badRequest, NO_STORE, serverError, sessionUser, unauthorized } from "@/lib/session.server";

/** One amount a signed-in rider settled on in the converter. */
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return unauthorized();

  let body: { from?: unknown; amount?: unknown; usd?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected an amount.");
  }
  const { from, amount, usd } = body ?? {};
  const valid = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 && value <= EXCHANGE_MAX_AMOUNT;
  if ((from !== "USD" && from !== "MXN") || !valid(amount) || !valid(usd)) {
    return badRequest("Expected an amount.");
  }

  if (isExcludedFromAnalytics(user.email)) return new Response(null, { status: 204, headers: NO_STORE });

  try {
    await recordExchangeUse(user.id, from, amount, usd);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the amount.", error);
  }
}
