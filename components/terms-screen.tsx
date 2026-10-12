"use client";

import { LegalScreen } from "@/components/legal-screen";
import { useLocale } from "@/components/locale-provider";

export function TermsScreen() {
  const { copy } = useLocale();
  return (
    <LegalScreen
      title={copy.termsTitle}
      updated={copy.termsUpdated}
      lead={copy.termsLead}
      sections={copy.termsSections}
    />
  );
}
