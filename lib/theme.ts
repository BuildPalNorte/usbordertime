/** Light or dark. Absent on the account means follow the device. */
export type ThemeChoice = "light" | "dark";

export const THEME_COOKIE = "usbordertime.theme";
export const THEME_STORAGE_KEY = "usbordertime.theme.v1";

/** Chrome behind the page. Keep in step with the palette in app/globals.css. */
export const THEME_COLOR: Record<ThemeChoice, string> = {
  light: "#f1f2f5",
  dark: "#0a0b0f",
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark";
}
