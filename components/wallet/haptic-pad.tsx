"use client";

import { isIPhone, notePadTick } from "@/lib/haptics";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Covers a button on iPhone. The finger has to land on a real switch —
 * that is the tick Safari still plays. The click is handed back to the button.
 *
 * A drag is a scroll. Safari will otherwise select the switch and never pan
 * the pane, so a moved finger does not click, and if the browser did not pan
 * we move the scroller ourselves.
 */
export function HapticPad() {
  const [phone, setPhone] = useState(false);

  useLayoutEffect(() => {
    setPhone(isIPhone());
  }, []);

  if (!phone) return null;
  return <Pad />;
}

const SLOP = 10;

function Pad() {
  const ref = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    const host = input?.parentElement;
    if (!input || !host) return;
    const pad = input;
    const button = host;
    pad.setAttribute("switch", "");
    if (getComputedStyle(button).position === "static") button.style.position = "relative";

    let restore: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let moved = false;
    let ignoreClick = false;
    let axis: "x" | "y" | null = null;
    let scroller: HTMLElement | null = null;
    let scrollAtStart = 0;
    let driven = false;
    let velocity = 0;
    let lastDrive = 0;
    let glideFrame = 0;
    let queued = false;
    let queuedFrame = 0;
    let pending = 0;
    let base = 0;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function stopGlide() {
      cancelAnimationFrame(glideFrame);
      glideFrame = 0;
    }

    function propFor(current: "x" | "y"): "scrollLeft" | "scrollTop" {
      return current === "y" ? "scrollTop" : "scrollLeft";
    }

    function flush() {
      if (!queued || !scroller || !axis) return;
      cancelAnimationFrame(queuedFrame);
      queued = false;
      const prop = propFor(axis);
      const drift = scroller[prop] - base;
      // The browser already panned. Adding the same distance again would double it.
      if (Math.abs(drift) < 1) {
        scroller[prop] = base + pending;
        const now = performance.now();
        const dt = lastDrive ? now - lastDrive : 16;
        velocity = pending / Math.max(dt, 8);
        lastDrive = now;
        driven = true;
      } else {
        driven = false;
      }
      pending = 0;
    }

    function queue(delta: number) {
      if (!scroller || !axis) return;
      if (!queued) {
        queued = true;
        base = scroller[propFor(axis)];
        pending = 0;
        queuedFrame = requestAnimationFrame(flush);
      }
      pending += delta;
    }

    function glide() {
      if (!driven || reduced || !scroller || !axis) return;
      const node = scroller;
      const prop = propFor(axis);
      let step = velocity * 16;
      if (Math.abs(step) < 0.6) return;
      const tick = () => {
        const max =
          prop === "scrollTop"
            ? node.scrollHeight - node.clientHeight
            : node.scrollWidth - node.clientWidth;
        const next = Math.min(max, Math.max(0, node[prop] + step));
        node[prop] = next;
        if (next <= 0 || next >= max || Math.abs(step) < 0.4) return;
        step *= 0.94;
        glideFrame = requestAnimationFrame(tick);
      };
      glideFrame = requestAnimationFrame(tick);
    }

    let began = 0;
    let sawPointerMove = false;

    function begin(x: number, y: number) {
      const now = performance.now();
      // pointerdown and touchstart are the same finger. Don't reset mid-gesture.
      if (now - began < 50) return;
      began = now;
      // A finger that stops a coast is not a tap on the control underneath.
      if (glideFrame !== 0) ignoreClick = true;
      stopGlide();
      flush();
      startX = lastX = x;
      startY = lastY = y;
      moved = false;
      sawPointerMove = false;
      axis = null;
      scroller = null;
      driven = false;
      velocity = 0;
      lastDrive = 0;
      const vertical = findScroller(pad, "y");
      scrollAtStart = vertical?.scrollTop ?? 0;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      begin(event.clientX, event.clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      begin(touch.clientX, touch.clientY);
    };

    function track(x: number, y: number) {
      const dx = x - startX;
      const dy = y - startY;
      if (!moved) {
        if (dx * dx + dy * dy <= SLOP * SLOP) return;
        moved = true;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        scroller = findScroller(pad, axis);
        pad.checked = false;
      }
      if (!scroller || !axis) {
        lastX = x;
        lastY = y;
        return;
      }
      const delta = axis === "y" ? lastY - y : lastX - x;
      lastX = x;
      lastY = y;
      queue(delta);
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!began) return;
      sawPointerMove = true;
      track(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (sawPointerMove) return;
      const touch = event.touches[0];
      if (!touch) return;
      track(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      flush();
      if (moved) pad.checked = false;
      glide();
    };

    const onClick = (event: Event) => {
      const vertical = findScroller(pad, "y");
      const scrolled = vertical ? Math.abs(vertical.scrollTop - scrollAtStart) > 2 : false;
      if (moved || scrolled || ignoreClick) {
        event.preventDefault();
        event.stopPropagation();
        pad.checked = false;
        moved = false;
        ignoreClick = false;
        return;
      }
      event.stopPropagation();
      notePadTick();
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const active = document.activeElement;
      restore =
        active instanceof HTMLElement && active !== pad && active !== document.body
          ? active
          : button instanceof HTMLElement
            ? button
            : null;
    };
    const onFocus = () => {
      const next = restore;
      if (!next || next === pad || document.activeElement !== pad) return;
      next.focus({ preventScroll: true });
    };
    pad.addEventListener("pointerdown", onPointerDown);
    pad.addEventListener("touchstart", onTouchStart, { passive: true });
    pad.addEventListener("pointermove", onPointerMove);
    pad.addEventListener("touchmove", onTouchMove, { passive: true });
    pad.addEventListener("touchend", onTouchEnd);
    pad.addEventListener("touchcancel", onTouchEnd);
    pad.addEventListener("click", onClick);
    pad.addEventListener("focus", onFocus);
    window.addEventListener("touchstart", stopGlide, { passive: true });
    return () => {
      stopGlide();
      cancelAnimationFrame(queuedFrame);
      pad.removeEventListener("pointerdown", onPointerDown);
      pad.removeEventListener("touchstart", onTouchStart);
      pad.removeEventListener("pointermove", onPointerMove);
      pad.removeEventListener("touchmove", onTouchMove);
      pad.removeEventListener("touchend", onTouchEnd);
      pad.removeEventListener("touchcancel", onTouchEnd);
      pad.removeEventListener("click", onClick);
      pad.removeEventListener("focus", onFocus);
      window.removeEventListener("touchstart", stopGlide);
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

/** The pane a drag should move. Stops at a gesture surface that owns the touch. */
function findScroller(node: HTMLElement, axis: "x" | "y"): HTMLElement | null {
  const overflowProp = axis === "y" ? "overflowY" : "overflowX";
  const clientProp = axis === "y" ? "clientHeight" : "clientWidth";
  const scrollProp = axis === "y" ? "scrollHeight" : "scrollWidth";
  let current = node.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    if (style.touchAction === "none") return null;
    const overflow = style[overflowProp];
    if (
      (overflow === "auto" || overflow === "scroll") &&
      current[scrollProp] > current[clientProp] + 4
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
