import { isLocale, type Locale } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";
import { isThemeChoice, type ThemeChoice } from "@/lib/theme";

/** Saved crossings, city bookmarks, language, and appearance for one account. */
export type Preference = {
  locale: Locale | null;
  theme: ThemeChoice | null;
  wallet: { portNumber: string; mode: Mode }[];
  pins: string[];
};

/** `savedAt` is the database clock, so two devices can tell which copy is newer. */
export type PreferenceRecord = Preference & { savedAt: string };

const MAX_WALLET = 120;
const MAX_PINS = 80;
const PORT = /^[A-Za-z0-9]{1,12}$/;
const PIN = /^(mx|ca):.{1,80}$/;

/**
 * The body of `PUT /api/preference`. Drops a duplicate port or city.
 * Returns null when the shape itself is wrong.
 */
export function parsePreference(value: unknown): Preference | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!("locale" in record) || !("theme" in record)) return null;
  if (!Array.isArray(record.wallet) || record.wallet.length > MAX_WALLET) return null;
  if (!Array.isArray(record.pins) || record.pins.length > MAX_PINS) return null;

  const locale = record.locale === null ? null : isLocale(record.locale) ? record.locale : undefined;
  const theme = record.theme === null ? null : isThemeChoice(record.theme) ? record.theme : undefined;
  if (locale === undefined || theme === undefined) return null;

  const wallet: Preference["wallet"] = [];
  const seenPorts = new Set<string>();
  for (const entry of record.wallet) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    if (typeof item.portNumber !== "string" || !PORT.test(item.portNumber) || !isMode(item.mode)) {
      return null;
    }
    if (seenPorts.has(item.portNumber)) continue;
    seenPorts.add(item.portNumber);
    wallet.push({ portNumber: item.portNumber, mode: item.mode });
  }

  const pins: string[] = [];
  const seenPins = new Set<string>();
  for (const pin of record.pins) {
    if (typeof pin !== "string" || !PIN.test(pin)) return null;
    if (seenPins.has(pin)) continue;
    seenPins.add(pin);
    pins.push(pin);
  }

  return { locale, theme, wallet, pins };
}
