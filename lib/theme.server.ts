import { isThemeChoice, THEME_COOKIE, type ThemeChoice } from "@/lib/theme";
import { cookies } from "next/headers";

/** Saved choice, or null so the page follows the system color scheme. */
export async function resolveTheme(): Promise<ThemeChoice | null> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeChoice(saved) ? saved : null;
}
