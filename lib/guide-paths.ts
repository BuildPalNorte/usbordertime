import type { Locale } from "@/lib/i18n";

/** Public crossing guides. English and Spanish each have their own index. */
export const GUIDE_INDEX_PATH: Record<Locale, string> = {
  en: "/guides",
  es: "/es/guias",
};
