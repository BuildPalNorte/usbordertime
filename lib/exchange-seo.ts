import { COPY, type Locale } from "@/lib/i18n";
import { EXCHANGE_PATH } from "@/lib/routes";
import { siteOrigin } from "@/lib/site";

const LANGUAGE: Record<Locale, string> = { en: "en-US", es: "es-MX" };

/**
 * What /exchange is, for a crawler that does not run the converter.
 * No rate: the number changes through the day and is not ours to republish.
 */
export function exchangeJsonLd(locale: Locale) {
  const copy = COPY[locale];
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: copy.exchangeSeoTitle,
    url: `${origin}${EXCHANGE_PATH}`,
    description: copy.exchangeSeoDescription,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: LANGUAGE[locale],
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "BuildPalNorte", url: origin },
    featureList: [copy.exchangeSeoUpdatedBody, copy.exchangeSeoMoveBody],
  };
}
