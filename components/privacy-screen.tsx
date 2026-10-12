"use client";

import { LegalScreen } from "@/components/legal-screen";
import { useLocale } from "@/components/locale-provider";

export function PrivacyScreen() {
  const { copy } = useLocale();
  return (
    <LegalScreen
      title={copy.privacyTitle}
      updated={copy.privacyUpdated}
      lead={copy.privacyLead}
      sections={copy.privacySections}
    />
  );
}
