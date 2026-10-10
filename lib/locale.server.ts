import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { cookies, headers } from "next/headers";

/** Saved choice wins. Otherwise the browser's first preferred language. */
export async function resolveLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;

  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("es") ? "es" : "en";
}
