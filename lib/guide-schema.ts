import { DISCOVER } from "@/lib/discover";
import { COPY, CONTACT_EMAIL, type Locale } from "@/lib/i18n";
import { GUIDES, guideIndexPath, guidePath, type Guide } from "@/lib/guides";
import { siteOrigin } from "@/lib/site";

/** Schema.org JSON-LD for the public guides. Absolute URLs, no live wait. */

const LANGUAGE: Record<Locale, string> = { en: "en-US", es: "es-MX" };

/** The public answers and guides were last revised on this day. */
const REVISED = "2026-10-12";

function abs(path: string): string {
  return `${siteOrigin()}${path}`;
}

function publisher(origin: string) {
  return { "@type": "Organization", name: "BuildPalNorte", url: origin, email: CONTACT_EMAIL };
}

export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Who runs the app, and what it is. Rendered on every page so a crawler that does not run JavaScript still reads it. */
export function entityJsonLd() {
  const origin = siteOrigin();
  const description = COPY.en.metaDescription;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "BuildPalNorte",
        url: origin,
        email: CONTACT_EMAIL,
      },
      {
        "@type": "WebSite",
        name: "Border Time",
        url: origin,
        description,
        inLanguage: ["en-US", "es-MX"],
        publisher: publisher(origin),
      },
      {
        "@type": "SoftwareApplication",
        name: "Border Time",
        url: origin,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        description,
        inLanguage: ["en", "es"],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: publisher(origin),
        featureList: [
          "Live U.S. land-port wait times from the public CBP feed",
          "English and Spanish",
          "Standard, Ready, SENTRI, pedestrian, commercial, and FAST lanes",
        ],
      },
    ],
  };
}

function faqEntity(locale: Locale) {
  return DISCOVER[locale].faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  }));
}

export function guideIndexJsonLd(locale: Locale) {
  const origin = siteOrigin();
  const copy = COPY[locale];
  const page = abs(guideIndexPath(locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Border Time",
        url: origin,
        description: copy.metaDescription,
        inLanguage: ["en-US", "es-MX"],
      },
      {
        "@type": "CollectionPage",
        name: copy.guidesTitle,
        description: copy.guidesDescription,
        url: page,
        dateModified: REVISED,
        inLanguage: LANGUAGE[locale],
        isPartOf: { "@type": "WebSite", name: "Border Time", url: origin },
        publisher: publisher(origin),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: GUIDES.map((guide, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: guide[locale].title,
            url: abs(guidePath(locale, guide)),
          })),
        },
      },
      {
        "@type": "FAQPage",
        url: page,
        inLanguage: LANGUAGE[locale],
        dateModified: REVISED,
        mainEntity: faqEntity(locale),
      },
    ],
  };
}

export function guideJsonLd(locale: Locale, guide: Guide) {
  const origin = siteOrigin();
  const text = guide[locale];
  const page = abs(guidePath(locale, guide));
  const index = abs(guideIndexPath(locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: text.title,
        description: text.description,
        url: page,
        mainEntityOfPage: page,
        dateModified: REVISED,
        inLanguage: LANGUAGE[locale],
        author: publisher(origin),
        publisher: publisher(origin),
        isPartOf: { "@type": "WebSite", name: "Border Time", url: origin },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Border Time", item: origin },
          { "@type": "ListItem", position: 2, name: COPY[locale].guidesTitle, item: index },
          { "@type": "ListItem", position: 3, name: text.title, item: page },
        ],
      },
    ],
  };
}
