import { TramitesScreen } from "@/components/tramites/tramites-screen";
import { resolveLocale } from "@/lib/locale.server";
import { tramitesJsonLdScript, tramitesMetadata } from "@/lib/tramites-seo";
import type { Metadata } from "next";
import { cache, Suspense } from "react";

const localeForRequest = cache(resolveLocale);

export async function generateMetadata(): Promise<Metadata> {
  return tramitesMetadata(await localeForRequest());
}

export default async function TramitesPage() {
  const locale = await localeForRequest();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: tramitesJsonLdScript(locale) }}
      />
      <Suspense fallback={null}>
        <TramitesScreen />
      </Suspense>
    </>
  );
}
