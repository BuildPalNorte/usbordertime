import { TramitesScreen } from "@/components/tramites/tramites-screen";
import { COPY } from "@/lib/i18n";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: COPY.en.tramites.metaTitle,
  description: COPY.en.tramites.metaDescription,
};

export default function TramitesPage() {
  return (
    <Suspense fallback={null}>
      <TramitesScreen />
    </Suspense>
  );
}
