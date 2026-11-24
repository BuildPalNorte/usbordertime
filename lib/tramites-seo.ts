import { jsonLd } from "@/lib/guide-schema";
import { COPY, CONTACT_EMAIL, type Locale } from "@/lib/i18n";
import { siteOrigin } from "@/lib/site";
import { TRAMITES_PATH, TRAMITES_PATH_IDS } from "@/lib/tramites";
import type { Metadata } from "next";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_MX" };
const LANGUAGE: Record<Locale, string> = { en: "en-US", es: "es-MX" };

/** Title, description, canonical, and social cards for /tramites. */
export function tramitesMetadata(locale: Locale): Metadata {
  const t = COPY[locale].tramites;
  const title = t.metaTitle;
  const description = t.metaDescription;
  return {
    title: { absolute: COPY[locale].pageTitle(title) },
    description,
    alternates: { canonical: TRAMITES_PATH },
    openGraph: {
      title,
      description,
      url: TRAMITES_PATH,
      siteName: "Border Time",
      type: "website",
      locale: OG_LOCALE[locale],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Structured data for crawlers: the page, FAQ, how-to steps, and the four errands.
 * No live AI answers — those are not indexable content.
 */
export function tramitesJsonLd(locale: Locale) {
  const origin = siteOrigin();
  const page = `${origin}${TRAMITES_PATH}`;
  const copy = COPY[locale];
  const t = copy.tramites;
  const publisher = {
    "@type": "Organization",
    name: "BuildPalNorte",
    url: origin,
    email: CONTACT_EMAIL,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${page}#webpage`,
        url: page,
        name: t.metaTitle,
        description: t.metaDescription,
        inLanguage: LANGUAGE[locale],
        isPartOf: { "@type": "WebSite", name: "Border Time", url: origin },
        publisher,
        isAccessibleForFree: true,
        about: [
          "B1/B2 visitor visa",
          "Border crossing card",
          "DS-160",
          "Mexican citizens",
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Border Time", item: origin },
          { "@type": "ListItem", position: 2, name: t.metaTitle, item: page },
        ],
      },
      {
        "@type": "HowTo",
        name: t.howTitle,
        description: t.lead,
        url: `${page}#how`,
        inLanguage: LANGUAGE[locale],
        isAccessibleForFree: true,
        step: t.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
        })),
      },
      {
        "@type": "ItemList",
        name: t.servicesTitle,
        description: t.servicesLead,
        url: `${page}#errands`,
        numberOfItems: TRAMITES_PATH_IDS.length,
        itemListElement: TRAMITES_PATH_IDS.map((id, index) => {
          const path = t.paths[id];
          return {
            "@type": "ListItem",
            position: index + 1,
            name: path.label,
            description: path.what,
            url: `${page}?path=${id}`,
          };
        }),
      },
      {
        "@type": "FAQPage",
        "@id": `${page}#faq`,
        url: `${page}#faq`,
        inLanguage: LANGUAGE[locale],
        mainEntity: t.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}

export function tramitesJsonLdScript(locale: Locale): string {
  return jsonLd(tramitesJsonLd(locale));
}
