import { useEffect } from "react";

let activeLocks = 0;
let savedScrollY = 0;
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyWidth = "";
let previousBodyOverflow = "";
let previousHtmlOverflowY = "";
let removeScrollFreeze: (() => void) | null = null;

function ensureLockStyles() {
  const { body, documentElement } = document;

  documentElement.setAttribute("data-scroll-locked", "");
  body.setAttribute("data-scroll-locked", "");

  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.width = "100%";
  body.style.overflow = "hidden";
  // Keep scrollbar gutter visible; body fixed prevents actual page movement.
  documentElement.style.overflowY = "scroll";

  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
}

function attachScrollFreeze() {
  if (removeScrollFreeze) return;

  const onScroll = () => {
    ensureLockStyles();
  };

  const onWheel = (e: WheelEvent) => {
    // Block document/page scroll; nested overflow areas (chat, modals) still receive the event.
    if (activeLocks === 0) return;
    const target = e.target;
    if (!(target instanceof Element)) {
      e.preventDefault();
      return;
    }
    // Allow wheel inside overflow containers that aren't the page.
    let el: HTMLElement | null = target as HTMLElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(el);
      const canScroll =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight;
      if (canScroll) {
        if (e.deltaY < 0 && el.scrollTop > 0) return;
        if (e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return;
        // At edge: prevent chaining to the page behind.
        e.preventDefault();
        return;
      }
      el = el.parentElement;
    }
    e.preventDefault();
  };

  const onTouchMove = (e: TouchEvent) => {
    if (activeLocks === 0) return;
    const target = e.target;
    if (!(target instanceof Element)) {
      e.preventDefault();
      return;
    }
    let el: HTMLElement | null = target as HTMLElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(el);
      const canScroll =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight;
      if (canScroll) return;
      el = el.parentElement;
    }
    e.preventDefault();
  };

  window.addEventListener("scroll", onScroll, true);
  document.addEventListener("wheel", onWheel, { passive: false, capture: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });

  removeScrollFreeze = () => {
    window.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("wheel", onWheel, true);
    document.removeEventListener("touchmove", onTouchMove, true);
    removeScrollFreeze = null;
  };
}

function applyUnlock() {
  const { body, documentElement } = document;

  removeScrollFreeze?.();

  documentElement.removeAttribute("data-scroll-locked");
  body.removeAttribute("data-scroll-locked");

  body.style.position = previousBodyPosition;
  body.style.top = previousBodyTop;
  body.style.width = previousBodyWidth;
  body.style.overflow = previousBodyOverflow;
  documentElement.style.overflowY = previousHtmlOverflowY;

  window.scrollTo(0, savedScrollY);

  previousBodyPosition = "";
  previousBodyTop = "";
  previousBodyWidth = "";
  previousBodyOverflow = "";
  previousHtmlOverflowY = "";
}

/** Force-clear document scroll lock (e.g. after client navigation left a stuck lock). */
export function forceClearScrollLock() {
  const { body, documentElement } = document;

  if (activeLocks === 0) {
    removeScrollFreeze?.();
    if (
      documentElement.hasAttribute("data-scroll-locked") ||
      body.hasAttribute("data-scroll-locked") ||
      body.style.position === "fixed" ||
      body.style.overflow === "hidden" ||
      body.style.maxHeight ||
      documentElement.style.maxHeight
    ) {
      documentElement.removeAttribute("data-scroll-locked");
      body.removeAttribute("data-scroll-locked");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("width");
      body.style.removeProperty("overflow");
      body.style.removeProperty("height");
      body.style.removeProperty("max-height");
      body.style.removeProperty("min-height");
      documentElement.style.removeProperty("overflow");
      documentElement.style.removeProperty("overflow-y");
      documentElement.style.removeProperty("height");
      documentElement.style.removeProperty("max-height");
      documentElement.style.removeProperty("min-height");
    }
    return;
  }

  activeLocks = 0;
  applyUnlock();
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement } = document;

    if (activeLocks === 0) {
      savedScrollY = window.scrollY;
      previousBodyPosition = body.style.position;
      previousBodyTop = body.style.top;
      previousBodyWidth = body.style.width;
      previousBodyOverflow = body.style.overflow;
      previousHtmlOverflowY = documentElement.style.overflowY;
      attachScrollFreeze();
    }

    activeLocks += 1;
    // Nested locks (e.g. pinned modal inside conversation modal): re-assert styles.
    ensureLockStyles();

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks > 0) {
        ensureLockStyles();
        return;
      }

      applyUnlock();
    };
  }, [active]);
}
