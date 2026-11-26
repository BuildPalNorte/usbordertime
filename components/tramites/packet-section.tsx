"use client";

import { useLocale } from "@/components/locale-provider";
import { PacketField } from "@/components/tramites/packet-fields";
import { REDUCED, SPRING } from "@/components/wallet/motion";
import { haptic } from "@/lib/haptics";
import { docKey, packetPathFrom, pageFields, type Answers, type FieldProblem, type SectionId } from "@/lib/tramites-packet";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Props = {
  section: SectionId;
  /** Which short screen of the section to show. */
  page: number;
  answers: Answers;
  problems: Readonly<Record<string, FieldProblem>>;
  onChange: (id: string, value: string) => void;
};

/** The questions of one step. A yes opens its follow-up in place, so the page never jumps ahead. */
export function PacketSection({ section, page, answers, problems, onChange }: Props) {
  const reduce = useReducedMotion();

  if (section === "docs") return <PacketDocs answers={answers} onChange={onChange} />;

  const fields = pageFields(section, answers)[page] ?? [];
  return (
    <div>
      <AnimatePresence initial={false}>
        {fields.map((def) => (
          <motion.div
            key={def.id}
            className="-mx-1 overflow-hidden px-1"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reduce ? REDUCED : SPRING.snap}
          >
            <div className="pt-7 pb-1">
              <PacketField
                def={def}
                value={answers[def.id] ?? ""}
                problem={problems[def.id] ?? null}
                onChange={(value) => onChange(def.id, value)}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** The errand's document list, ticked off on this device. Nothing is uploaded. */
function PacketDocs({ answers, onChange }: Pick<Props, "answers" | "onChange">) {
  const { copy } = useLocale();
  const t = copy.tramites;
  const path = t.paths[packetPathFrom(answers)];
  const docs = path.docs;

  if (!answers.errand) {
    return <p className="pt-7 text-[13px] leading-relaxed text-tfg/60">{t.packet.docs.none}</p>;
  }

  return (
    <ul className="mt-7 divide-y divide-tfg/10 border-y border-tfg/10">
      {docs.map((doc, index) => {
        const key = docKey(index);
        const have = answers[key] === "yes";
        return (
          <li key={doc}>
            <label className="flex min-h-14 cursor-pointer items-start gap-3.5 py-3.5 text-[14px] leading-snug text-tfg/85">
              <input
                type="checkbox"
                checked={have}
                onChange={(event) => {
                  haptic("selection");
                  onChange(key, event.target.checked ? "yes" : "");
                }}
                className="mt-0.5 size-[18px] shrink-0 accent-[color:var(--t-sky)]"
              />
              <span className="min-w-0 flex-1">
                {doc}
                {have ? <span className="sr-only"> ({t.packet.docs.have})</span> : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
