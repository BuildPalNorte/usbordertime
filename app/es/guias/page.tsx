import { GuideIndex } from "@/components/guides/guide-pages";
import { guideIndexMetadata } from "@/lib/guide-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = guideIndexMetadata("es");

export default function GuiasPage() {
  return <GuideIndex locale="es" />;
}
