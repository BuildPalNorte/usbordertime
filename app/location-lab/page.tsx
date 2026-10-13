import { LocationLab } from "@/components/wallet/location-lab";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Development only. Not linked anywhere, not indexed. See lib/port-locations.ts and
// components/wallet/location-prompt.tsx for the real flow this previews.
export const metadata: Metadata = {
  title: "Location prompt",
  robots: { index: false, follow: false },
};

export default function LocationLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LocationLab />;
}
