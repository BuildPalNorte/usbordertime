"use client";

import { useLocale } from "@/components/locale-provider";
import { friendlyDate } from "@/components/tramites/packet-review";
import { REDUCED, SPRING } from "@/components/wallet/motion";
import { haptic } from "@/lib/haptics";
import { mrzAnswers } from "@/lib/mrz";
import { scanDocument } from "@/lib/mrz-scan";
import type { OptionKey } from "@/lib/tramites-packet";
import { packetStore } from "@/lib/tramites-packet-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; progress: number }
  | { kind: "found"; answers: Record<string, string>; confident: boolean }
  | { kind: "applied"; count: number }
  | { kind: "error"; message: "noStrip" | "failed" };

const BUTTON =
  "relative inline-flex h-11 items-center rounded-full px-5 text-[14px] font-medium transition-transform active:scale-[0.97] disabled:opacity-60";

/** Read order, so the confirm list reads like the form. */
const ORDER = ["surname", "givenNames", "sex", "birthDate", "nationality", "curp", "passportNumber", "issueCountry", "expiryDate"];

/**
 * Photo of a passport or ID card in, packet answers out. The read happens in this browser; the picture
 * is not uploaded and is gone as soon as the read ends. Nothing is filled in until the person says so.
 * `offer` is whether the screen still has something to gain; once applied, it stays to confirm.
 */
export function PacketScan({ offer }: { offer: boolean }) {
  const { copy, locale } = useLocale();
  const p = copy.tramites.packet;
  const t = p.scan;
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  // The first read downloads the engine; later ones do not.
  const [warm, setWarm] = useState(false);

  async function read(file: File | undefined) {
    if (!file) return;
    haptic("light");
    setPhase({ kind: "reading", progress: 0 });
    try {
      const result = await scanDocument(file, (progress) => setPhase({ kind: "reading", progress }));
      const answers = mrzAnswers(result.mrz, result.curp);
      setWarm(true);
      if (Object.keys(answers).length === 0) {
        haptic("error");
        setPhase({ kind: "error", message: "noStrip" });
        return;
      }
      haptic("success");
      setPhase({ kind: "found", answers, confident: result.mrz?.confident ?? true });
    } catch {
      haptic("error");
      setPhase({ kind: "error", message: "failed" });
    }
  }

  function apply(answers: Record<string, string>) {
    haptic("success");
    for (const [id, value] of Object.entries(answers)) packetStore.setAnswer(id, value);
    setPhase({ kind: "applied", count: Object.keys(answers).length });
  }

  function shown(id: string, value: string): string {
    if (id === "sex") return p.options[`sex.${value}` as OptionKey] ?? value;
    if (id === "birthDate" || id === "expiryDate") return friendlyDate(value, locale);
    return value;
  }

  if (!offer && phase.kind !== "applied") return null;

  const enter = reduce ? REDUCED : SPRING.snap;
  const busy = phase.kind === "reading";

  return (
    <section aria-label={t.title} className="mt-6 rounded-2xl bg-tfg/[0.05] p-4 ring-1 ring-tfg/12">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase.kind}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={enter}
        >
          {phase.kind === "applied" ? (
            <p role="status" className="text-[14px] font-medium text-tfg">
              {t.done(phase.count)}
            </p>
          ) : phase.kind === "found" ? (
            <div>
              <p className="text-[14px] font-medium text-tfg">{t.found}</p>
              <dl className="mt-3 space-y-1.5">
                {Object.entries(phase.answers)
                  .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
                  .map(([id, value]) => (
                    <div key={id} className="grid grid-cols-[1fr_1.2fr] gap-x-4 text-[13px] leading-snug">
                      <dt className="text-tfg/50">{p.fields[id as keyof typeof p.fields]?.label ?? id}</dt>
                      <dd className="break-words text-tfg/90">{shown(id, value)}</dd>
                    </div>
                  ))}
              </dl>
              {!phase.confident ? <p className="mt-3 text-[12px] leading-relaxed text-tdanger">{t.partial}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => apply(phase.answers)} className={`${BUTTON} bg-tfg text-tpill`}>
                  {t.use}
                </button>
                <button
                  type="button"
                  onClick={() => setPhase({ kind: "idle" })}
                  className={`${BUTTON} text-tfg/70 hover:text-tfg`}
                >
                  {t.retry}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[14px] font-medium text-tfg">{t.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-tfg/60">{t.body}</p>
              {phase.kind === "error" ? (
                <p role="alert" className="mt-2 text-[12px] leading-relaxed text-tdanger">
                  {t[phase.message]}
                </p>
              ) : null}
              {busy ? (
                <div role="status" className="mt-3">
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-tfg/15">
                    <div
                      className="h-full rounded-full bg-tfg transition-[width] duration-300 ease-out motion-reduce:transition-none"
                      style={{ width: `${Math.max(Math.round(phase.progress * 100), 4)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-tfg/60">{warm ? t.reading : t.readingFirst}</p>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => camera.current?.click()} className={`${BUTTON} bg-tfg text-tpill`}>
                    {t.take}
                  </button>
                  <button
                    type="button"
                    onClick={() => library.current?.click()}
                    className={`${BUTTON} text-tfg/80 ring-1 ring-tfg/20 hover:bg-tfg/10`}
                  >
                    {t.choose}
                  </button>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-tfg/45">{t.privacy}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={library}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </section>
  );
}
