"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A live webcam view for a computer, where `<input capture>` only opens a file picker. It asks for
 * the camera when it mounts, draws one frame to a canvas on Capture, and hands that frame back as a
 * file. The stream is stopped on every way out.
 */
export function CameraCapture({
  onCapture,
  onClose,
  labels,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  labels: { capture: string; cancel: string; unavailable: string };
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        const element = video.current;
        if (element) {
          element.srcObject = media;
          void element.play().then(
            () => setReady(true),
            () => setFailed(true),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, []);

  const snap = () => {
    const element = video.current;
    if (!element || !element.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], "check-in.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-surface p-3">
        {failed ? (
          <p className="px-2 py-8 text-center text-[15px] text-muted">{labels.unavailable}</p>
        ) : (
          <video
            ref={video}
            muted
            playsInline
            className="aspect-[4/3] w-full rounded-2xl bg-black object-cover"
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full bg-foreground/[0.08] px-5 text-[15px] font-medium text-foreground active:scale-95"
          >
            {labels.cancel}
          </button>
          {!failed && (
            <button
              type="button"
              disabled={!ready}
              onClick={snap}
              className="h-11 rounded-full bg-accent px-5 text-[15px] font-medium text-accent-ink active:scale-95 disabled:opacity-40"
            >
              {labels.capture}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
