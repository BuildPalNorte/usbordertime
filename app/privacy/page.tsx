import { PrivacyScreen } from "@/components/privacy-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Border Time keeps when you sign in, and what stays in your browser.",
};

export default function PrivacyPage() {
  return <PrivacyScreen />;
}
