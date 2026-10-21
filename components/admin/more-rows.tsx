"use client";

import { haptic } from "@/lib/haptics";
import { Children, useState, type ReactNode } from "react";

/**
 * The same card as the other admin lists, showing the first few rows and the rest on request.
 * Pass `<li>` rows as children. The server still sends every row, so nothing is cut from the data.
 */
export function MoreRows({ children, initial = 8, noun }: { children: ReactNode; initial?: number; noun: string }) {
  const rows = Children.toArray(children);
  const [all, setAll] = useState(false);
  const hidden = Math.max(0, rows.length - initial);
  const shown = all || hidden === 0 ? rows : rows.slice(0, initial);

  return (
    <div className="@container overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
      <ul className="w-max min-w-full divide-y divide-line">{shown}</ul>
      {hidden > 0 && (
        <div className="sticky left-0 w-[100cqw] border-t border-line">
          <button
            type="button"
            aria-expanded={all}
            onClick={() => {
              haptic("light");
              setAll((value) => !value);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center text-[14px] font-medium text-foreground active:bg-surface-strong"
          >
            {all ? "Show fewer" : `Show all ${rows.length.toLocaleString("en-US")} ${noun}`}
          </button>
        </div>
      )}
    </div>
  );
}
