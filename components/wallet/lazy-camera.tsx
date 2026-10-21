"use client";

import type { PortWaitTime } from "@/lib/border-wait-times";
import { feedsForPort } from "@/lib/camera-feeds";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

/**
 * The camera players (and their swipe, HLS and snapshot code) are only needed once a card or
 * row is open, so they load then instead of with the wallet. The placeholder is the same
 * 16:9 frame, so nothing moves when the player arrives.
 */
function Frame() {
  return <div aria-hidden className="aspect-video w-full rounded-2xl bg-[#10131a]" />;
}

const CrossingCameraLazy = dynamic(() => import("./crossing-camera").then((m) => m.CrossingCamera), {
  loading: Frame,
});

const CrossingFeedsLazy = dynamic(() => import("./crossing-feeds").then((m) => m.CrossingFeeds), {
  loading: Frame,
});

export function CrossingCamera(props: ComponentProps<typeof CrossingCameraLazy>) {
  return <CrossingCameraLazy {...props} />;
}

/** Renders nothing for a crossing without cameras, without loading the player to find out. */
export function CrossingFeeds(props: { port: PortWaitTime; name: string }) {
  if (feedsForPort(props.port.portNumber).length === 0) return null;
  return <CrossingFeedsLazy {...props} />;
}
