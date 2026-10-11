import { GuideIndex } from "@/components/guides/guide-pages";
import { guideIndexMetadata } from "@/lib/guide-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = guideIndexMetadata("en");

export default function GuidesPage() {
  return <GuideIndex locale="en" />;
}
