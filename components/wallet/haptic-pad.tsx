"use client";

import { isIPhone, notePadTick } from "@/lib/haptics";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Covers a button on iPhone. The finger has to land on a real switch —
 * that is the tick Safari still plays. The click is handed back to the button.
 */
export function HapticPad() {
  const [phone, setPhone] = useState(false);

  useLayoutEffect(() => {
    setPhone(isIPhone());
  }, []);

  if (!phone) return null;
  return <Pad />;
}

function Pad() {
  const ref = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    const host = input?.parentElement;
    if (!input || !host) return;
    input.setAttribute("switch", "");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    let restore: HTMLElement | null = null;
    const onClick = (event: Event) => {
      event.stopPropagation();
      notePadTick();
      host.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const active = document.activeElement;
      restore =
        active instanceof HTMLElement && active !== input && active !== document.body
          ? active
          : host instanceof HTMLElement
            ? host
            : null;
    };
    const onFocus = () => {
      const next = restore;
      if (!next || next === input || document.activeElement !== input) return;
      next.focus({ preventScroll: true });
    };
    input.addEventListener("click", onClick);
    input.addEventListener("focus", onFocus);
    return () => {
      input.removeEventListener("click", onClick);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-hidden="true"
      tabIndex={-1}
      className="haptic-pad"
    />
  );
}
