import { PacketScreen } from "@/components/tramites/packet-screen";
import { TramitesSkeleton } from "@/components/tramites/tramites-skeleton";
import { resolveLocale } from "@/lib/locale.server";
import { COPY } from "@/lib/i18n";
import { PACKET_PATH } from "@/lib/tramites-packet";
import type { Metadata } from "next";
import { cache, Suspense } from "react";

const localeForRequest = cache(resolveLocale);

/** Personal tooling, not a landing page: kept out of search results. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeForRequest();
  const t = COPY[locale].tramites.packet;
  return {
    title: { absolute: COPY[locale].pageTitle(t.metaTitle) },
    description: t.metaDescription,
    alternates: { canonical: PACKET_PATH },
    robots: { index: false, follow: false },
  };
}

export default function PacketPage() {
  return (
    <Suspense fallback={<TramitesSkeleton />}>
      <PacketScreen />
    </Suspense>
  );
}
