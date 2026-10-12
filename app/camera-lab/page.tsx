import { CameraLab } from "@/components/camera-lab";
import { fallbackFeedAddresses } from "@/lib/camera-feeds";
import { getCameraFeeds } from "@/lib/camera-feeds.server";
import type { Metadata } from "next";

// Temporary review page. Not linked anywhere, not indexed.
export const metadata: Metadata = {
  title: "Camera feeds",
  robots: { index: false, follow: false },
};

export default async function CameraLabPage() {
  let addresses: Record<string, string>;
  try {
    addresses = await getCameraFeeds();
  } catch (error) {
    console.error("camera feeds", error);
    addresses = fallbackFeedAddresses();
  }
  return <CameraLab addresses={addresses} />;
}
