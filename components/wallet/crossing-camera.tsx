"use client";

import { useLocale } from "@/components/locale-provider";
import { requestCameraStream } from "@/lib/camera-stream";
import type { FeedSource } from "@/lib/ports";
import { reportCameraExpanded, videoIsExpanded } from "@/lib/screen-orientation";
import { useEffect, useRef, useState } from "react";
import { CameraBar } from "./camera-bar";
import { useCameraStreams } from "./camera-streams";

/**
 * Plays one live HLS camera. Safari uses the video element. Other browsers
 * load hls.js only after this view mounts, and the effect tears it down on close.
 * A playlist that fails to load is checked on the server. A 404 is saved
 * through the alias, then played. Other visits read that address.
 */
export function CrossingCamera({
  src,
  alias,
  name,
  info,
}: {
  src: string;
  alias: string;
  name: string;
  info: FeedSource;
}) {
  const { copy } = useLocale();
  const { replace } = useCameraStreams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const tried = useRef(new Set<string>());
  const [playing, setPlaying] = useState(src);
  const [failed, setFailed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [ready, setReady] = useState(false);
  const poster = playing.endsWith("stream.m3u8")
    ? playing.replace(/stream\.m3u8$/, "snapshot.jpg")
    : undefined;

  const [source, setSource] = useState({ src, alias });
  if (source.src !== src || source.alias !== alias) {
    setSource({ src, alias });
    setPlaying(src);
  }

  useEffect(() => {
    tried.current = new Set();
  }, [src, alias]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const media: HTMLVideoElement = video;

    let gone = false;
    let looking = false;
    let player: { destroy: () => void } | null = null;
    setFailed(false);
    setResolving(false);
    video.muted = true;
    setReady(false);
    const onPlaying = () => setReady(true);
    video.addEventListener("playing", onPlaying);

    function stop() {
      gone = true;
      media.removeEventListener("playing", onPlaying);
      player?.destroy();
      player = null;
      video?.removeAttribute("src");
      video?.load();
    }

    function fail() {
      if (gone) return;
      player?.destroy();
      player = null;
      setResolving(false);
      setFailed(true);
    }

    async function recover() {
      if (gone || looking) return;
      if (tried.current.size >= 1) {
        fail();
        return;
      }
      looking = true;
      setResolving(true);
      player?.destroy();
      player = null;
      media.removeEventListener("error", onError);
      media.removeAttribute("src");
      media.load();

      tried.current.add(playing);
      const next = await requestCameraStream(alias, playing);
      if (gone) return;
      looking = false;
      if (!next || next === playing || tried.current.has(next)) {
        fail();
        return;
      }
      replace(alias, next);
      setResolving(false);
      setPlaying(next);
    }

    function onError() {
      void recover();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playing;
      void video.play().catch(() => {});
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("error", onError);
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
          if (!data.fatal || gone) return;
          const status = data.response?.code;
          const manifest = data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR;
          // Apache's 404 has no CORS header, so hls.js reports status 0.
          const hidden =
            data.url === playing && (status === 404 || status === 0 || status === undefined);
          if (manifest || hidden) {
            void recover();
            return;
          }
          fail();
        });
        next.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => {});
        });
        next.loadSource(playing);
        next.attachMedia(video);
      })
      .catch(() => fail());

    return stop;
  }, [playing, alias, replace]);

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
  }, [playing]);

  const quiet = failed || resolving;

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="relative bg-[#10131a]">
        <video
          ref={videoRef}
          poster={poster}
          muted
          playsInline
          autoPlay
          controls
          aria-label={copy.cameraLabel(name)}
          className={quiet ? "hidden" : "aspect-video w-full bg-[#10131a] object-contain"}
        />
        {quiet ? (
          <div className="flex aspect-video items-center justify-center px-6 text-center text-[13px] font-medium text-white/70">
            {failed ? copy.cameraUnavailable : null}
          </div>
        ) : !ready ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
            <div className="camera-shimmer absolute inset-0" />
            <div className="relative flex flex-col items-center gap-2.5 text-white/75">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-7 animate-spin motion-reduce:animate-pulse"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="9" className="opacity-25" />
                <path d="M21 12a9 9 0 0 0-9-9" />
              </svg>
              <span role="status" className="text-[12px] font-medium tracking-[0.01em]">
                {copy.cameraLoading}
              </span>
            </div>
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
      <CameraBar
        title={name}
        caption={failed ? copy.cameraOffline : copy.live}
        tone={failed ? "offline" : resolving ? "idle" : "fresh"}
        source={info}
      />
    </div>
  );
}
