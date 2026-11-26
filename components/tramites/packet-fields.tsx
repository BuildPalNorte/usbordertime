"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import {
  NOT_APPLICABLE,
  OPTIONS,
  type FieldDef,
  type FieldProblem,
  type OptionKey,
  type OptionsField,
} from "@/lib/tramites-packet";
import { useId } from "react";

const INPUT =
  "h-12 w-full rounded-xl bg-tfg/[0.06] px-4 text-[16px] text-tfg outline-none ring-1 ring-tfg/12 transition-[box-shadow,background-color] placeholder:text-tfg/30 focus:bg-tfg/[0.09] focus:ring-2 focus:ring-[color:var(--t-sky)] disabled:opacity-40 aria-[invalid=true]:ring-tdanger/70";

const CHIP =
  "inline-flex min-h-11 items-center rounded-full px-4 text-[14px] transition-[background-color,color,transform] active:scale-[0.97]";

function isOptionsField(id: string): id is OptionsField {
  return id in OPTIONS;
}

type FieldProps = {
  def: FieldDef;
  value: string;
  problem: FieldProblem | null;
  onChange: (value: string) => void;
};

/** One question. Text-like kinds share an input; choices are tap chips, never a native menu. */
export function PacketField({ def, value, problem, onChange }: FieldProps) {
  const { copy } = useLocale();
  const p = copy.tramites.packet;
  const text = p.fields[def.id as keyof typeof p.fields] ?? { label: def.id };
  const uid = useId();
  const inputId = `${uid}-input`;
  const helpId = text.help ? `${uid}-help` : undefined;
  const errorId = problem ? `${uid}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const na = value === NOT_APPLICABLE;

  const label = (
    <label htmlFor={def.kind === "yesno" || def.kind === "select" ? undefined : inputId} className="block text-[14px] leading-snug text-tfg/90">
      {text.label}
    </label>
  );

  let control;
  if (def.kind === "yesno") {
    control = (
      <div role="radiogroup" aria-labelledby={`${uid}-label`} aria-describedby={describedBy} className="mt-3 flex gap-2">
        {(["yes", "no"] as const).map((choice) => {
          const active = value === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                haptic("selection");
                onChange(choice);
              }}
              className={cn(
                CHIP,
                "min-w-24 justify-center",
                active ? "bg-tfg font-medium text-tpill" : "text-tfg/80 ring-1 ring-tfg/20 hover:bg-tfg/10",
              )}
            >
              {choice === "yes" ? p.yes : p.no}
            </button>
          );
        })}
      </div>
    );
  } else if (def.kind === "select" && isOptionsField(def.id)) {
    const ids: readonly string[] = OPTIONS[def.id];
    control = (
      <div role="radiogroup" aria-labelledby={`${uid}-label`} aria-describedby={describedBy} className="mt-3 flex flex-wrap gap-2">
        {ids.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                haptic("selection");
                onChange(option);
              }}
              className={cn(
                CHIP,
                active ? "bg-tfg font-medium text-tpill" : "text-tfg/80 ring-1 ring-tfg/20 hover:bg-tfg/10",
              )}
            >
              {p.options[`${def.id}.${option}` as OptionKey]}
            </button>
          );
        })}
      </div>
    );
  } else if (def.kind === "textarea") {
    control = (
      <textarea
        id={inputId}
        rows={3}
        value={na ? "" : value}
        placeholder={text.placeholder}
        aria-invalid={problem ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={cn(INPUT, "mt-2 h-auto min-h-[5.5rem] resize-y py-3 leading-snug")}
      />
    );
  } else {
    const type = def.kind === "text" ? "text" : def.kind;
    control = (
      <input
        id={inputId}
        type={type}
        inputMode={def.kind === "tel" ? "tel" : def.kind === "email" ? "email" : undefined}
        autoComplete={def.autoComplete ?? "off"}
        autoCapitalize={def.kind === "email" ? "none" : undefined}
        spellCheck={false}
        disabled={na}
        value={na ? "" : value}
        placeholder={text.placeholder}
        aria-invalid={problem ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={cn(INPUT, "mt-2")}
      />
    );
  }

  return (
    <div id={`pf-${def.id}`}>
      <div id={`${uid}-label`}>{label}</div>
      {text.help ? (
        <p id={helpId} className="mt-1 text-[12px] leading-snug text-tfg/50">
          {text.help}
        </p>
      ) : null}
      {control}
      {def.dna ? (
        <label className="mt-2.5 inline-flex min-h-8 cursor-pointer items-center gap-2.5 text-[13px] text-tfg/65">
          <input
            type="checkbox"
            checked={na}
            onChange={(event) => {
              haptic("selection");
              onChange(event.target.checked ? NOT_APPLICABLE : "");
            }}
            className="size-4 accent-[color:var(--t-sky)]"
          />
          {p.dna}
        </label>
      ) : null}
      {problem ? (
        <p id={errorId} role="alert" className="mt-2 text-[12px] leading-snug text-tdanger">
          {p.errors[problem]}
        </p>
      ) : null}
    </div>
  );
}
