import { COPY, type Locale } from "@/lib/i18n";
import { GUIDES, guideIndexPath, guidePath, type Guide } from "@/lib/guides";
import { siteOrigin } from "@/lib/site";

/** Schema.org JSON-LD for the public guides. Absolute URLs, no live wait. */

const LANGUAGE: Record<Locale, string> = { en: "en-US", es: "es-MX" };

function abs(path: string): string {
  return `${siteOrigin()}${path}`;
}

function publisher(origin: string) {
  return { "@type": "Organization", name: "Border Time", url: origin };
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
        inLanguage: LANGUAGE[locale],
        isPartOf: { "@type": "WebSite", name: "Border Time", url: origin },
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
