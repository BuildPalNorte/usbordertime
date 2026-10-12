import { TermsScreen } from "@/components/terms-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Border Time is an independent app. Wait times, Ask, and the guides are not a promise and not official advice.",
};

export default function TermsPage() {
  return <TermsScreen />;
}
