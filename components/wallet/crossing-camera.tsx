"use client";

import { useLocale } from "@/components/locale-provider";
import { cameraPlaylistMissing, requestCameraStream } from "@/lib/camera-stream";
import { reportCameraExpanded, videoIsExpanded } from "@/lib/screen-orientation";
import { useEffect, useRef, useState } from "react";
import { useCameraStreams } from "./camera-streams";

/**
 * Plays one live HLS camera. Safari uses the video element. Other browsers
 * load hls.js only after this view mounts, and the effect tears it down on close.
 * A 404 playlist is saved through the alias, then played. Other visits read that address.
 */
export function CrossingCamera({
  src,
  alias,
  name,
}: {
  src: string;
  alias: string;
  name: string;
}) {
  const { copy } = useLocale();
  const { replace } = useCameraStreams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const tried = useRef(new Set<string>());
  const [playing, setPlaying] = useState(src);
  const [failed, setFailed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const poster = playing.endsWith("stream.m3u8")
    ? playing.replace(/stream\.m3u8$/, "snapshot.jpg")
    : undefined;

  useEffect(() => {
    setPlaying(src);
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
      setResolving(false);
      setFailed(true);
    }

    async function recover(knownNotFound: boolean) {
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

      const missing = knownNotFound || (await cameraPlaylistMissing(playing));
      if (gone) return;
      if (!missing) {
        looking = false;
        fail();
        return;
      }

      tried.current.add(playing);
      const next = await requestCameraStream(alias);
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
      void recover(false);
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
          const playlist =
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.url === playing;
          if (playlist && (status === 404 || status === undefined)) {
            void recover(status === 404);
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
          quiet
            ? "hidden"
            : "aspect-video w-full bg-[#10131a] object-contain"
        }
      />
      {quiet ? (
        <div className="flex aspect-video items-center justify-center px-6 text-center text-[13px] font-medium text-white/70">
          {failed ? copy.cameraUnavailable : null}
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
