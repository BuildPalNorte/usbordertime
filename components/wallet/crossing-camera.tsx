"use client";

import { useLocale } from "@/components/locale-provider";
import { reportCameraExpanded, videoIsExpanded } from "@/lib/screen-orientation";
import { useEffect, useRef, useState } from "react";

/**
 * Plays one live HLS camera. Safari uses the video element. Other browsers
 * load hls.js only after this view mounts, and the effect tears it down on close.
 */
export function CrossingCamera({ src, name }: { src: string; name: string }) {
  const { copy } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const poster = src.endsWith("stream.m3u8")
    ? src.replace(/stream\.m3u8$/, "snapshot.jpg")
    : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let gone = false;
    let player: { destroy: () => void } | null = null;
    setFailed(false);
    video.muted = true;

    function stop() {
      gone = true;
      player?.destroy();
      player = null;
      video?.removeAttribute("src");
      video?.load();
    }

    function fail() {
      if (gone) return;
      player?.destroy();
      player = null;
      setFailed(true);
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      void video.play().catch(() => {});
      video.addEventListener("error", fail);
      return () => {
        video.removeEventListener("error", fail);
        stop();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (gone) return;
        if (!Hls.isSupported()) {
          fail();
          return;
        }
        const next = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 15,
          maxBufferLength: 20,
        });
        player = next;
        next.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) fail();
        });
        next.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => {});
        });
        next.loadSource(src);
        next.attachMedia(video);
      })
      .catch(() => fail());

    return stop;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => reportCameraExpanded(video, videoIsExpanded(video));
    // Begin/end fire as the native player opens, before presentation mode updates.
    const expand = () => reportCameraExpanded(video, true);
    const inline = () => reportCameraExpanded(video, false);

    video.addEventListener("webkitbeginfullscreen", expand);
    video.addEventListener("webkitendfullscreen", inline);
    video.addEventListener("webkitpresentationmodechanged", sync);
    document.addEventListener("fullscreenchange", sync);

    return () => {
      video.removeEventListener("webkitbeginfullscreen", expand);
      video.removeEventListener("webkitendfullscreen", inline);
      video.removeEventListener("webkitpresentationmodechanged", sync);
      document.removeEventListener("fullscreenchange", sync);
      reportCameraExpanded(video, false);
    };
  }, [src]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#10131a]">
      <video
        ref={videoRef}
        poster={poster}
        muted
        playsInline
        autoPlay
        controls
        aria-label={copy.cameraLabel(name)}
        className={
          failed
            ? "hidden"
            : "aspect-video w-full bg-[#10131a] object-contain"
        }
      />
      {failed ? (
        <div className="flex aspect-video items-center justify-center px-6 text-center text-[13px] font-medium text-white/70">
          {copy.cameraUnavailable}
        </div>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white"
        >
          <span className="size-1.5 rounded-full bg-[#ff453a]" />
          {copy.live}
        </span>
      )}
    </div>
  );
}
