import { ExchangePublic } from "@/components/exchange-public";
import { COPY } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale.server";
import { EXCHANGE_PATH } from "@/lib/routes";
import type { Metadata } from "next";
import { cache } from "react";

const localeForRequest = cache(resolveLocale);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeForRequest();
  const copy = COPY[locale];
  const description = copy.exchangeSeoDescription;
  return {
    title: { absolute: copy.pageTitle(copy.exchangeSeoTitle) },
    description,
    alternates: { canonical: EXCHANGE_PATH },
    openGraph: {
      title: copy.exchangeSeoTitle,
      description,
      url: EXCHANGE_PATH,
      siteName: "Border Time",
      type: "website",
      locale: locale === "es" ? "es_MX" : "en_US",
    },
    twitter: {
      card: "summary",
      title: copy.exchangeSeoTitle,
      description,
    },
  };
}

export const instant = false;

export default async function ExchangePage() {
  return <ExchangePublic locale={await localeForRequest()} />;
}
