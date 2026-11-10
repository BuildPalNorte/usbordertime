"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import {
  chatClosed,
  checkPresence,
  MAX_CHECK_IN_MESSAGE,
  POSITION_REUSE_MS,
  REACTIONS,
  REPORT_REASONS,
  type CheckIn,
  type CheckInProblem,
  type Reaction,
  type ReportReason,
} from "@/lib/check-in";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { hasProfanity } from "@/lib/profanity";
import type { GeoPoint } from "@/lib/port-locations";
import { PaperAirplaneIcon } from "@heroicons-animated/react/paper-airplane";
import { CameraIcon, type CameraIconHandle } from "@heroicons-animated/react/camera";
import { CheckIcon } from "@heroicons-animated/react/check";
import { ChevronRightIcon } from "@heroicons-animated/react/chevron-right";
import { FlagIcon } from "@heroicons-animated/react/flag";
import { MapPinIcon, type MapPinIconHandle } from "@heroicons-animated/react/map-pin";
import { TrashIcon } from "@heroicons-animated/react/trash";
import { XMarkIcon } from "@heroicons-animated/react/x-mark";
import {
  HandThumbUpIcon as HandThumbUpOutline,
  HeartIcon as HeartOutline,
} from "@heroicons/react/24/outline";
import {
  HandThumbUpIcon as HandThumbUpSolid,
  HeartIcon as HeartSolid,
} from "@heroicons/react/24/solid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import dynamic from "next/dynamic";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { useSignedIn } from "./account-context";
import { prepareJpeg } from "./check-in-photo";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { SignInButton } from "./sign-in-prompt";

// Only a computer without a camera app ever opens this, so it stays out of the chat's first load.
const CameraCapture = dynamic(() => import("./check-in-camera").then((m) => m.CameraCapture), {
  ssr: false,
});

type Stage = "idle" | "locating" | "sending";
type Problem = { kind: CheckInProblem; miles?: number };
type Fix = { point: GeoPoint; accuracy: number; at: number };

/**
 * Sits under the camera, in the accent color so it reads as the one thing to press. A tap opens
 * the bridge's chat. Anyone can read it and react to a post. Posting needs an account, and each
 * post is confirmed against where the rider is standing.
 */
export function CheckInButton({ port, name }: { port: PortWaitTime; name: string }) {
  const { copy } = useLocale();
  const pin = useRef<MapPinIconHandle>(null);
  const [open, setOpen] = useState(false);
  const closed = useChatClosed();

  // Overnight the chat shuts, even on a sheet that was left open.
  if (closed) {
    return (
      <div className="flex h-16 w-full items-center gap-3.5 rounded-2xl bg-surface pr-3 pl-3.5 text-muted">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-strong">
          <MapPinIcon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-tight font-semibold tracking-[-0.01em]">
            {copy.checkInClosed}
          </span>
          <span className="mt-1 block truncate text-[13px] leading-none">{copy.checkInClosedHint}</span>
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={copy.checkInOpen(name)}
        aria-haspopup="dialog"
        data-tour="detail-check-in"
        onClick={() => {
          haptic("selection");
          setOpen(true);
        }}
        onPointerEnter={() => pin.current?.startAnimation()}
        onPointerLeave={() => pin.current?.stopAnimation()}
        className="relative flex h-16 w-full items-center gap-3.5 rounded-2xl bg-accent pr-3 pl-3.5 text-left text-accent-ink transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        <HapticPad />
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-ink/15"
        >
          <MapPinIcon ref={pin} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-tight font-semibold tracking-[-0.01em]">
            {copy.checkIn}
          </span>
          <span className="mt-1 block truncate text-[13px] leading-none opacity-85">
            {copy.checkInHint}
          </span>
        </span>
        <ChevronRightIcon size={18} aria-hidden className="shrink-0 opacity-85" />
      </button>
      <AnimatePresence>
        {open && <CheckInSheet port={port} name={name} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function watchClock(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/** True overnight. The server render says open, so the first paint matches and the clock corrects it. */
function useChatClosed(): boolean {
  return useSyncExternalStore(watchClock, () => chatClosed(), () => false);
}

/** Where the rider is, or why we cannot tell. Asked for from a tap. */
function readPosition(): Promise<GeolocationPosition | "denied" | "unsupported" | "failed"> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => resolve(error.code === error.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}

/** Pointer, touch, and key events inside the sheet must not reach the card it was opened from. */
function contain(event: SyntheticEvent) {
  event.stopPropagation();
}

function threadKey(portNumber: string) {
  return ["check-ins", portNumber] as const;
}

function CheckInSheet({
  port,
  name,
  onClose,
}: {
  port: PortWaitTime;
  name: string;
  onClose: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const titleId = useId();
  const noteId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [webcam, setWebcam] = useState(false);  const camera = useRef<CameraIconHandle>(null);
  const fix = useRef<Fix | null>(null);
  const stick = useRef(true);
  /** Taps sent but not yet answered. */
  const inflight = useRef(0);
  /** Taps go to the server in the order they were made, so the last one wins. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSeq = useRef(0);
  const objectUrls = useRef<string[]>([]);

  const [stage, setStage] = useState<Stage>("idle");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [viewing, setViewing] = useState<{ src: string; alt: string } | null>(null);
  const [confirming, setConfirming] = useState<CheckIn | null>(null);
  const [reporting, setReporting] = useState<CheckIn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = stage === "locating";

  const thread = useQuery({
    queryKey: threadKey(port.portNumber),
    queryFn: async ({ signal }): Promise<CheckIn[]> => {
      const response = await fetch(`/api/check-in?port=${encodeURIComponent(port.portNumber)}`, {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("check-ins");
      const fresh = ((await response.json()) as { checkIns: CheckIn[] }).checkIns;
      // Keep what only this browser knows, so a refresh never remounts a row or refetches a photo
      // the rider just sent.
      const before = queryClient.getQueryData<CheckIn[]>(threadKey(port.portNumber)) ?? [];
      const local = new Map(before.map((item) => [item.id, item]));
      const merged = fresh.map((item) => {
        const known = local.get(item.id);
        return known?.ref || known?.localPhoto
          ? { ...item, ref: known.ref, localPhoto: known.localPhoto }
          : item;
      });
      // A post still on its way to the server is not in `fresh` yet. Keep it at the end.
      return [...merged, ...before.filter((item) => item.pending)];
    },
    staleTime: 10_000,
    // A chat that is open stays current, but never while a tap is still on its way to the server:
    // a refresh then would show the old state for a moment and the tap would seem not to land.
    refetchInterval: () => (inflight.current > 0 ? false : 15_000),
  });
  const items = thread.data;

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Capture, so the wallet's own Escape (close the card) sees this one as handled.
      // A photo open full screen closes first, then the chat.
      event.preventDefault();
      if (reporting) setReporting(null);
      else if (confirming) setConfirming(null);
      else if (viewing) setViewing(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, viewing, confirming, reporting]);

  // Stay at the newest message while the rider is there. Reading older ones is left alone.
  const count = items?.length ?? 0;
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !stick.current) return;
    scroller.scrollTo({ top: scroller.scrollHeight });
  }, [count, photo]);

  // The preview is an object URL. Release it when the photo changes or the sheet goes away.
  const previewUrl = photo?.url;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setPreparing(true);
    const blob = await prepareJpeg(file);
    setPreparing(false);
    if (!blob) {
      haptic("error");
      setProblem({ kind: "photo" });
      return;
    }
    haptic("selection");
    setPhoto({ blob, url: URL.createObjectURL(blob) });
  };

  /** Runs `job` after every earlier one, and holds the 15-second refresh back until it is done. */
  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    inflight.current += 1;
    const run = queue.current.then(job, job);
    queue.current = run.catch(() => {}).finally(() => {
      inflight.current -= 1;
    });
    return run;
  }, []);

  const portNumber = port.portNumber;
  const patch = useCallback(
    (change: (list: CheckIn[]) => CheckIn[]) => {
      queryClient.setQueryData<CheckIn[]>(threadKey(portNumber), (list) => change(list ?? []));
    },
    [queryClient, portNumber],
  );

  const send = () => {
    if (preparing) return;
    const text = note.trim();
    if (!text && !photo) {
      haptic("error");
      setProblem({ kind: "empty" });
      noteRef.current?.focus();
      return;
    }
    if (text && hasProfanity(text)) {
      haptic("error");
      setProblem({ kind: "language" });
      noteRef.current?.focus();
      return;
    }
    haptic("selection");
    setProblem(null);

    // The post is on screen the moment it is sent, dimmed until the server confirms it. Position,
    // upload and the check all happen behind it. If any of them says no, it goes away and the
    // words come back to the box.
    const sent = photo;
    const tempId = `pending-${(pendingSeq.current += 1)}`;
    const localPhoto = sent ? URL.createObjectURL(sent.blob) : undefined;
    if (localPhoto) objectUrls.current.push(localPhoto);
    patch((list) => [
      ...list,
      {
        id: tempId,
        ref: tempId,
        name: "",
        message: text || null,
        hasPhoto: Boolean(sent),
        at: new Date().toISOString(),
        mine: true,
        reactions: { like: 0, helpful: 0 },
        reacted: { like: false, helpful: false },
        pending: true,
        localPhoto,
      },
    ]);
    setNote("");
    setPhoto(null);
    if (noteRef.current) noteRef.current.style.height = "auto";
    stick.current = true;

    const fail = (next: Problem) => {
      patch((list) => list.filter((item) => item.id !== tempId));
      haptic("error");
      setProblem(next);
      // Give back what they wrote, unless they have already started something new.
      setNote((current) => current || text);
      if (sent) setPhoto((current) => current ?? { blob: sent.blob, url: URL.createObjectURL(sent.blob) });
    };

    void enqueue(async () => {
      // One position read carries a short conversation. The server still checks every post.
      let current = fix.current;
      if (!current || Date.now() - current.at > POSITION_REUSE_MS) {
        setStage("locating");
        const position = await readPosition();
        setStage("idle");
        if (typeof position === "string") {
          fail({ kind: position === "failed" ? "imprecise" : position });
          return;
        }
        current = {
          point: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracy: position.coords.accuracy,
          at: Date.now(),
        };
      }

      // The same check the server runs. A rider who is plainly elsewhere hears it before uploading a photo.
      const presence = checkPresence(port, current.point, current.accuracy);
      if (!presence.ok) {
        fix.current = null;
        fail({ kind: presence.reason, miles: presence.reason === "far" ? presence.miles : undefined });
        return;
      }
      fix.current = current;

      const form = new FormData();
      form.set("port", port.portNumber);
      form.set("lat", String(current.point.lat));
      form.set("lng", String(current.point.lng));
      form.set("accuracy", String(current.accuracy));
      if (text) form.set("message", text);
      if (sent) form.set("photo", sent.blob, "check-in.jpg");

      try {
        const response = await fetch("/api/check-in", { method: "POST", body: form });
        if (response.status === 201) {
          const { id } = (await response.json()) as { id: string };
          haptic("success");
          patch((list) =>
            list.map((item) => (item.id === tempId ? { ...item, id, pending: false } : item)),
          );
          return;
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        fix.current = null;
        if (response.status === 401) fail({ kind: "signin" });
        else if (response.status === 403 && body?.error === "far") fail({ kind: "far", miles: presence.miles });
        else if (response.status === 403 && (body?.error === "imprecise" || body?.error === "unknown"))
          fail({ kind: body.error });
        else if (body?.error === "photo") fail({ kind: "photo" });
        else if (body?.error === "empty") fail({ kind: "empty" });
        else if (body?.error === "language") fail({ kind: "language" });
        else if (response.status === 403 && body?.error === "muted") fail({ kind: "muted" });
        else if (response.status === 403 && body?.error === "closed") fail({ kind: "closed" });
        else fail({ kind: "failed" });
      } catch {
        fail({ kind: "failed" });
      }
    });
  };

  const remove = useCallback((id: string) => {
    haptic("selection");
    // Gone at once. If the server refuses, the next refresh brings it back.
    void queryClient.cancelQueries({ queryKey: threadKey(portNumber) });
    patch((list) => list.filter((item) => item.id !== id));
    void enqueue(async () => {
      try {
        const response = await fetch(`/api/check-in?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("delete");
      } catch {
        haptic("error");
        void queryClient.invalidateQueries({ queryKey: threadKey(portNumber) });
      }
    });
  }, [enqueue, patch, queryClient, portNumber]);

  const react = useCallback((id: string, kind: Reaction) => {
    // Read from the thread as it is now, not from the render the tap came from: a second tap
    // before the first has settled must flip the state the rider is looking at.
    const row = queryClient.getQueryData<CheckIn[]>(threadKey(portNumber))?.find((item) => item.id === id);
    if (!row || row.pending) return;
    const on = !row.reacted[kind];
    haptic(on ? "light" : "selection");
    void queryClient.cancelQueries({ queryKey: threadKey(portNumber) });
    patch((list) =>
      list.map((entry) =>
        entry.id !== id
          ? entry
          : {
              ...entry,
              reacted: { ...entry.reacted, [kind]: on },
              reactions: { ...entry.reactions, [kind]: Math.max(0, entry.reactions[kind] + (on ? 1 : -1)) },
            },
      ),
    );
    void enqueue(async () => {
      try {
        const response = await fetch("/api/check-in/react", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, kind, on }),
        });
        if (!response.ok) throw new Error("react");
      } catch {
        haptic("error");
        setProblem({ kind: "react" });
        void queryClient.invalidateQueries({ queryKey: threadKey(portNumber) });
      }
    });
  }, [enqueue, patch, queryClient, portNumber]);

  // Stable, so a keystroke in the box never re-renders the thread.
  const onReact = useCallback((item: CheckIn, kind: Reaction) => react(item.id, kind), [react]);
  const onAskRemove = useCallback((item: CheckIn) => {
    haptic("selection");
    setConfirming(item);
  }, []);
  const onAskReport = useCallback((item: CheckIn) => {
    haptic("selection");
    setReporting(item);
  }, []);
  const onOpenPhoto = useCallback((src: string, alt: string) => {
    haptic("light");
    setViewing({ src, alt });
  }, []);

  const report = (item: CheckIn, reason: ReportReason) => {
    haptic("medium");
    // Gone for the reporter at once, as the server will do on its side.
    void queryClient.cancelQueries({ queryKey: threadKey(port.portNumber) });
    patch((list) => list.filter((entry) => entry.id !== item.id));
    setNotice(copy.checkInReported);
    window.setTimeout(() => setNotice(null), 5000);
    void enqueue(async () => {
      try {
        const response = await fetch("/api/check-in/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, reason }),
        });
        // A post that was already gone is as reported as it needs to be.
        if (!response.ok && response.status !== 404) throw new Error("report");
      } catch {
        haptic("error");
        setNotice(null);
        setProblem({ kind: "failed" });
        void queryClient.invalidateQueries({ queryKey: threadKey(port.portNumber) });
      }
    });
  };

  const message = problem ? problemText(problem, name, copy) : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.22 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onPointerDown={(event) => {
        contain(event);
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      onPointerMove={contain}
      onPointerUp={contain}
      onTouchStart={contain}
      onTouchMove={contain}
      onTouchEnd={contain}
      onClick={contain}
      onKeyDown={contain}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={reduce ? { duration: 0.12 } : SPRING.move}
        className="flex h-[min(92dvh,46rem)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-line bg-background outline-none sm:rounded-[28px]"
        style={{
          boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 30px 80px -20px rgb(10 14 28 / 0.55)",
        }}
      >
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-5 pt-5">
          <span />
          <h2 id={titleId} className="truncate text-center text-[22px] font-bold tracking-[-0.03em]">
            {copy.checkInSheetTitle}
          </h2>
          <button
            type="button"
            aria-label={copy.checkInClose}
            onClick={() => {
              haptic("light");
              onClose();
            }}
            className="relative grid size-10 place-items-center justify-self-end rounded-full bg-surface text-foreground active:scale-95"
          >
            <HapticPad />
            <XMarkIcon size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-1 truncate px-5 text-center text-[13px] text-muted">{copy.checkInAt(name)}</p>

        <div
          ref={scrollerRef}
          role="log"
          aria-label={copy.checkInRecent}
          onScroll={(event) => {
            const el = event.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="no-scrollbar mt-4 flex-1 overflow-x-clip overflow-y-auto px-5 pb-3"
        >
          <p className="mb-4 text-center text-[12px] leading-snug text-muted">{copy.checkInPrivacy}</p>
          <Thread
            items={items}
            pending={thread.isPending}
            failed={thread.isError}
            reduce={Boolean(reduce)}
            onReact={onReact}
            onRemove={onAskRemove}
            onReport={onAskReport}
            onOpenPhoto={onOpenPhoto}
          />
        </div>

        <div className="bg-background px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p
            role={message ? "alert" : "status"}
            className={cn(
              "px-1 text-[13px] leading-snug",
              message
                ? "mb-2 text-danger"
                : notice || stage === "locating"
                  ? "mb-2 text-muted"
                  : "sr-only",
            )}
          >
            {message ??
              notice ??
              (stage === "locating" ? copy.checkInLocating : stage === "sending" ? copy.checkInSending : "")}
          </p>

          {signedIn ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Picking the same photo twice should still fire.
                  event.target.value = "";
                  void pick(file);
                }}
              />
              {/* `capture` opens the camera app directly. Android's picker alone offers no camera. */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void pick(file);
                }}
              />
              {webcam && (
                <CameraCapture
                  labels={{
                    capture: copy.checkInCapture,
                    cancel: copy.checkInCameraCancel,
                    unavailable: copy.checkInCameraUnavailable,
                  }}
                  onClose={() => setWebcam(false)}
                  onCapture={(file) => {
                    setWebcam(false);
                    void pick(file);
                  }}
                />
              )}
              <div className="relative rounded-[28px] p-1.5">
                <div
                  aria-hidden
                  className="glass ask-composer pointer-events-none absolute inset-0 rounded-[28px]"
                />
                <div className="relative">
                  {photo && (
                    <div className="flex items-center gap-3 px-2 pt-1.5 pb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, nothing to optimize */}
                      <img
                        src={photo.url}
                        alt={copy.checkInPhotoAlt}
                        className="size-14 rounded-2xl bg-surface-strong object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          haptic("light");
                          setPhoto(null);
                        }}
                        className="relative h-9 rounded-full bg-foreground/[0.08] px-3.5 text-[13px] font-medium text-danger active:scale-95"
                      >
                        <HapticPad />
                        {copy.checkInRemovePhoto}
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-1.5">
                    <label htmlFor={noteId} className="sr-only">
                      {copy.checkInNote}
                    </label>
                    <textarea
                      ref={noteRef}
                      id={noteId}
                      rows={1}
                      value={note}
                      maxLength={MAX_CHECK_IN_MESSAGE * 2}
                      enterKeyHint="send"
                      autoComplete="off"
                      autoCapitalize="sentences"
                      placeholder={copy.checkInComposer}
                      onChange={(event) => {
                        setProblem((current) =>
                          current?.kind === "empty" || current?.kind === "language" ? null : current,
                        );
                        setNote([...event.target.value].slice(0, MAX_CHECK_IN_MESSAGE).join(""));
                      }}
                      onKeyDown={(event) => {
                        // A keyboard sends on Enter. A phone keeps Enter for a new line.
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing &&
                          window.matchMedia("(pointer: fine)").matches
                        ) {
                          event.preventDefault();
                          send();
                        }
                      }}
                      className="ask-field max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-[11px] text-[16px] leading-snug text-foreground select-text placeholder:text-muted"
                      style={
                        {
                          fieldSizing: "content",
                          outline: "none",
                          boxShadow: "none",
                        } as React.CSSProperties
                      }
                    />

                    <div className="relative shrink-0">
                    {photoMenu && (
                      <>
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setPhotoMenu(false)}
                        />
                        <div
                          role="menu"
                          className="glass absolute right-0 bottom-full z-20 mb-2 w-max min-w-44 overflow-hidden rounded-2xl p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setPhotoMenu(false);
                              // A computer has no camera app to hand off to, so show its webcam here.
                              if (window.matchMedia("(pointer: fine)").matches) setWebcam(true);
                              else cameraRef.current?.click();
                            }}
                            className="block w-full rounded-xl px-3.5 py-2.5 text-left text-[15px] text-foreground active:bg-foreground/[0.08]"
                          >
                            {copy.checkInTakePhoto}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setPhotoMenu(false);
                              fileRef.current?.click();
                            }}
                            className="block w-full rounded-xl px-3.5 py-2.5 text-left text-[15px] text-foreground active:bg-foreground/[0.08]"
                          >
                            {copy.checkInChoosePhoto}
                          </button>
                        </div>
                      </>
                    )}
                    <motion.button
                      type="button"
                      aria-label={photo ? copy.checkInReplacePhoto : copy.checkInAddPhoto}
                      aria-haspopup="menu"
                      aria-expanded={photoMenu}
                      disabled={preparing}
                      aria-busy={preparing}
                      onClick={() => setPhotoMenu((value) => !value)}
                      onPointerEnter={() => camera.current?.startAnimation()}
                      onPointerLeave={() => camera.current?.stopAnimation()}
                      whileTap={reduce ? undefined : { scale: 0.92 }}
                      transition={SPRING.snap}
                      className={cn(
                        "relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-foreground/[0.08] text-foreground disabled:opacity-50",
                        preparing && !reduce && "animate-pulse",
                      )}
                    >
                      <HapticPad />
                      <CameraIcon ref={camera} size={20} aria-hidden />
                    </motion.button>
                    </div>
                    <motion.button
                      type="button"
                      aria-label={copy.checkInSendLabel}
                      disabled={preparing || (!note.trim() && !photo)}
                      onClick={() => send()}
                      whileTap={reduce ? undefined : { scale: 0.92 }}
                      transition={SPRING.snap}
                      className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
                    >
                      <HapticPad />
                      <PaperAirplaneIcon size={20} aria-hidden />
                    </motion.button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="min-w-0 flex-1 basis-40 text-[14px] leading-snug text-muted">{copy.checkInGuest}</p>
              <SignInButton />
            </div>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {reporting && (
          <ConfirmReport
            hasPhoto={reporting.hasPhoto}
            onCancel={() => setReporting(null)}
            onConfirm={(reason) => {
              const item = reporting;
              setReporting(null);
              report(item, reason);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirming && (
          <ConfirmDelete
            hasPhoto={confirming.hasPhoto}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              const id = confirming.id;
              setConfirming(null);
              remove(id);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

/**
 * Reporting names what is wrong, then hides the message for the reporter at once. Same sheet as
 * delete confirmation. Report stays off until a reason is chosen; the photo reason only appears
 * for a message that has one.
 */
function ConfirmReport({
  hasPhoto,
  onCancel,
  onConfirm,
}: {
  hasPhoto: boolean;
  onCancel: () => void;
  onConfirm: (reason: ReportReason) => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const label: Record<ReportReason, string> = {
    abuse: copy.checkInReportAbuse,
    spam: copy.checkInReportSpam,
    photo: copy.checkInReportPhoto,
    other: copy.checkInReportOther,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.2 }}
      className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={reduce ? { duration: 0.12 } : SPRING.snap}
        className="w-full max-w-sm rounded-[28px] border border-line bg-background p-5"
        style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 24px 60px -16px rgb(10 14 28 / 0.55)" }}
      >
        <h3 id={titleId} className="text-center text-[18px] font-bold tracking-[-0.02em]">
          {copy.checkInReportTitle}
        </h3>
        <p className="mx-auto mt-1.5 max-w-[32ch] text-center text-[14px] leading-snug text-muted">
          {copy.checkInReportBody}
        </p>
        <div role="radiogroup" aria-labelledby={titleId} className="mt-4 grid gap-1.5">
          {REPORT_REASONS.filter((item) => item !== "photo" || hasPhoto).map((item) => {
            const on = reason === item;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  haptic("selection");
                  setReason(item);
                }}
                className={cn(
                  "relative flex h-12 items-center justify-between gap-3 rounded-2xl px-4 text-left text-[15px] font-medium transition-colors duration-150 active:scale-[0.98]",
                  on ? "bg-accent/15 text-accent" : "bg-surface text-foreground",
                )}
              >
                <HapticPad />
                {label[item]}
                {on && <CheckIcon size={18} aria-hidden />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={!reason}
            onClick={() => reason && onConfirm(reason)}
            className="relative h-12 rounded-full bg-danger text-[16px] font-semibold text-background transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          >
            <HapticPad />
            {copy.checkInReportConfirm}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("light");
              onCancel();
            }}
            className="relative h-12 rounded-full bg-surface text-[16px] font-semibold active:scale-[0.98]"
          >
            <HapticPad />
            {copy.checkInDeleteCancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Deleting is permanent, so it asks first. A small sheet over the chat, anchored to the bottom like
 * the chat itself. Cancel is the safe default and holds focus; the backdrop and Escape also cancel.
 */
function ConfirmDelete({
  hasPhoto,
  onCancel,
  onConfirm,
}: {
  hasPhoto: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.2 }}
      className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={reduce ? { duration: 0.12 } : SPRING.snap}
        className="w-full max-w-sm rounded-[28px] border border-line bg-background p-5 text-center"
        style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 24px 60px -16px rgb(10 14 28 / 0.55)" }}
      >
        <h3 id={titleId} className="text-[18px] font-bold tracking-[-0.02em]">
          {copy.checkInDeleteTitle}
        </h3>
        <p className="mx-auto mt-1.5 max-w-[30ch] text-[14px] leading-snug text-muted">
          {hasPhoto ? copy.checkInDeleteBodyPhoto : copy.checkInDeleteBody}
        </p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              haptic("heavy");
              onConfirm();
            }}
            className="relative h-12 rounded-full bg-danger text-[16px] font-semibold text-background active:scale-[0.98]"
          >
            <HapticPad />
            {copy.checkInDeleteConfirm}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={() => {
              haptic("light");
              onCancel();
            }}
            className="relative h-12 rounded-full bg-surface text-[16px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
          >
            <HapticPad />
            {copy.checkInDeleteCancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * A photo full screen. It opens from a fade and a small scale, follows a finger dragged up or down
 * 1:1 while the backdrop thins out, and leaves when let go past a distance or on a flick. Inside the
 * sheet's portal, so its events stop here too. Tap the backdrop, the close button, or Escape.
 */
function PhotoViewer({
  photo,
  onClose,
}: {
  photo: { src: string; alt: string };
  onClose: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const y = useMotionValue(0);
  const backdrop = useTransform(y, [-320, 0, 320], [0.25, 1, 0.25]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.2 }}
      className="fixed inset-0 z-[60] grid place-items-center"
      onPointerDown={(event) => {
        // Only the empty backdrop closes it. A press on the photo is the start of a drag.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div aria-hidden style={{ opacity: backdrop }} className="absolute inset-0 bg-black/92" />
      <motion.img
        src={photo.src}
        alt={photo.alt}
        draggable={false}
        drag={reduce ? false : "y"}
        dragSnapToOrigin
        dragElastic={0.5}
        style={{ y }}
        initial={reduce ? false : { scale: 0.94 }}
        animate={{ scale: 1 }}
        transition={reduce ? { duration: 0.12 } : SPRING.move}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.y) > 110 || Math.abs(info.velocity.y) > 600) {
            haptic("light");
            onClose();
          }
        }}
        className="relative max-h-[100dvh] max-w-full touch-none object-contain select-none"
      />
      <button
        type="button"
        aria-label={copy.checkInClosePhoto}
        onClick={() => {
          haptic("light");
          onClose();
        }}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md active:scale-95 [@media(prefers-reduced-transparency:reduce)]:bg-white/30 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
      >
        <HapticPad />
        <XMarkIcon size={20} aria-hidden />
      </button>
    </motion.div>
  );
}

function problemText(
  problem: Problem,
  bridge: string,
  copy: ReturnType<typeof useLocale>["copy"],
): string {
  switch (problem.kind) {
    case "denied":
      return copy.checkInDenied;
    case "unsupported":
      return copy.checkInUnsupported;
    case "imprecise":
      return copy.checkInImprecise;
    case "far":
      return copy.checkInFar(Math.max(1, Math.round(problem.miles ?? 0)), bridge);
    case "unknown":
      return copy.checkInUnknown;
    case "empty":
      return copy.checkInEmptyPost;
    case "language":
      return copy.checkInLanguage;
    case "muted":
      return copy.checkInMuted;
    case "closed":
      return copy.checkInClosed;
    case "photo":
      return copy.checkInPhotoFailed;
    case "react":
      return copy.checkInReactFailed;
    case "signin":
      return copy.checkInGuest;
    default:
      return copy.checkInFailed;
  }
}

const Thread = memo(function Thread({
  items,
  pending,
  failed,
  reduce,
  onReact,
  onRemove,
  onReport,
  onOpenPhoto,
}: {
  items: CheckIn[] | undefined;
  pending: boolean;
  failed: boolean;
  reduce: boolean;
  onReact: (item: CheckIn, kind: Reaction) => void;
  onRemove: (item: CheckIn) => void;
  onReport: (item: CheckIn) => void;
  onOpenPhoto: (src: string, alt: string) => void;
}) {
  const { copy, locale } = useLocale();
  // The time on the rider's own clock. A post from another day also names the day. Building an
  // Intl formatter is slow, so each is made once per language, not once per render.
  const { clock, dayClock } = useMemo(() => {
    const tag = locale === "es" ? "es-US" : "en-US";
    return {
      clock: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }),
      dayClock: new Intl.DateTimeFormat(tag, { weekday: "short", hour: "numeric", minute: "2-digit" }),
    };
  }, [locale]);
  const today = new Date().toDateString();
  const sentAt = (iso: string) => {
    const at = new Date(iso);
    return (at.toDateString() === today ? clock : dayClock).format(at);
  };

  if (pending) {
    return (
      <div aria-hidden className="space-y-3">
        <div className="h-12 w-3/5 rounded-3xl rounded-bl-md bg-surface motion-safe:animate-pulse" />
        <div className="ml-auto h-10 w-2/5 rounded-3xl rounded-br-md bg-surface motion-safe:animate-pulse" />
        <div className="h-16 w-2/3 rounded-3xl rounded-bl-md bg-surface motion-safe:animate-pulse" />
      </div>
    );
  }
  if (failed && !items) {
    return <p className="py-8 text-center text-[14px] leading-snug text-muted">{copy.checkInLoadFailed}</p>;
  }
  if (!items || items.length === 0) {
    return (
      <p className="mx-auto max-w-[26ch] py-10 text-center text-[15px] leading-snug text-muted">
        {copy.checkInEmpty}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.ref ?? item.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0.12 } : SPRING.snap}
            className={cn(
              "flex flex-col transition-opacity duration-200",
              item.mine ? "items-end" : "items-start",
              item.pending && "opacity-60",
            )}
          >
            <p className="mb-1 px-1.5 text-[12px] leading-none text-muted">
              <span className="font-semibold text-foreground">{item.mine ? copy.checkInYou : item.name}</span>{" "}
              <time dateTime={item.at} className="tabular-nums">
                {sentAt(item.at)}
              </time>
            </p>
            <div
              className={cn(
                "max-w-[85%] overflow-hidden rounded-3xl",
                item.mine
                  ? "rounded-br-md bg-accent text-accent-ink"
                  : "rounded-bl-md bg-surface text-foreground",
              )}
            >
              {item.hasPhoto && (
                <button
                  type="button"
                  aria-label={copy.checkInOpenPhoto(item.mine ? copy.checkInYou : item.name)}
                  onClick={() =>
                    onOpenPhoto(
                      item.localPhoto ?? `/api/check-in/photo/${encodeURIComponent(item.id)}`,
                      copy.checkInPhotoOf(item.mine ? copy.checkInYou : item.name),
                    )
                  }
                  className="relative block transition-opacity active:opacity-80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already shrunk by the sender */}
                  <img
                    src={item.localPhoto ?? `/api/check-in/photo/${encodeURIComponent(item.id)}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-64 max-w-full bg-surface-strong object-cover"
                  />
                </button>
              )}
              {item.message && (
                <p className="px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-line select-text">
                  {item.message}
                </p>
              )}
            </div>
            {!item.pending && (
            <div className={cn("mt-1.5 flex items-center gap-1.5", item.mine && "flex-row-reverse")}>
              {REACTIONS.map((kind) => (
                <ReactionChip
                  key={kind}
                  kind={kind}
                  count={item.reactions[kind]}
                  active={item.reacted[kind]}
                  label={kind === "like" ? copy.checkInLike : copy.checkInHelpful}
                  onClick={() => onReact(item, kind)}
                />
              ))}
              {!item.mine && (
                <button
                  type="button"
                  aria-label={copy.checkInReport}
                  onClick={() => onReport(item)}
                  className="relative grid size-8 place-items-center rounded-full text-muted active:scale-95 active:text-danger"
                >
                  <HapticPad />
                  <FlagIcon size={15} aria-hidden />
                </button>
              )}
              {item.mine && (
                <button
                  type="button"
                  aria-label={copy.checkInRemove}
                  onClick={() => onRemove(item)}
                  className="relative grid size-8 place-items-center rounded-full text-muted active:scale-95 active:text-danger"
                >
                  <HapticPad />
                  <TrashIcon size={15} aria-hidden />
                </button>
              )}
            </div>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
});

/** A reaction anyone can give, signed in or not. The count only shows once someone has. */
function ReactionChip({
  kind,
  count,
  active,
  label,
  onClick,
}: {
  kind: Reaction;
  count: number;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const Icon =
    kind === "like"
      ? active
        ? HeartSolid
        : HeartOutline
      : active
        ? HandThumbUpSolid
        : HandThumbUpOutline;
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      transition={SPRING.snap}
      className={cn(
        "relative flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium tabular-nums transition-colors duration-150",
        active ? "bg-accent/15 text-accent" : "bg-foreground/[0.06] text-muted",
      )}
    >
      <HapticPad />
      {/* Solid when on, outline when off: a fill on the outline glyph leaves its inner strokes hollow. */}
      <motion.span
        key={String(active)}
        aria-hidden
        initial={reduce || !active ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={SPRING.pop}
        className="grid"
      >
        <Icon className="size-[17px]" />
      </motion.span>
      {count > 0 && <span>{count}</span>}
    </motion.button>
  );
}
