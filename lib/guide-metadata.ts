import { COPY, type Locale } from "@/lib/i18n";
import { guideIndexPath, guidePath, type Guide } from "@/lib/guides";
import type { Metadata } from "next";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_MX" };

function alternates(en: string, es: string, canonical: string): Metadata["alternates"] {
  return { canonical, languages: { en, es, "x-default": en } };
}

function page(locale: Locale, title: string, description: string, path: string, alt: Metadata["alternates"]): Metadata {
  return {
    title: { absolute: COPY[locale].pageTitle(title) },
    description,
    alternates: alt,
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Border Time",
      type: "article",
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary", title, description },
  };
}

export function guideMetadata(locale: Locale, guide: Guide): Metadata {
  const text = guide[locale];
  const path = guidePath(locale, guide);
  return page(locale, text.title, text.description, path, alternates(guidePath("en", guide), guidePath("es", guide), path));
}

export function guideIndexMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];
  const path = guideIndexPath(locale);
  return page(locale, copy.guidesTitle, copy.guidesDescription, path, alternates(guideIndexPath("en"), guideIndexPath("es"), path));
}
