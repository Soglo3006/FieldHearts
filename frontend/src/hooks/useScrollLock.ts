import { useEffect } from "react";

let activeLocks = 0;
let savedScrollY = 0;
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyWidth = "";
let previousBodyOverflow = "";
let previousHtmlOverflowY = "";

function applyUnlock() {
  const { body, documentElement } = document;

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
  if (activeLocks === 0) {
    // Heal leftover attributes/styles even if counter is already 0
    const { body, documentElement } = document;
    if (
      documentElement.hasAttribute("data-scroll-locked") ||
      body.hasAttribute("data-scroll-locked") ||
      body.style.position === "fixed"
    ) {
      documentElement.removeAttribute("data-scroll-locked");
      body.removeAttribute("data-scroll-locked");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("width");
      if (body.style.overflow === "hidden") body.style.removeProperty("overflow");
      if (documentElement.style.overflowY === "scroll" || documentElement.style.overflowY === "hidden") {
        documentElement.style.removeProperty("overflow-y");
      }
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

      documentElement.setAttribute("data-scroll-locked", "");
      body.setAttribute("data-scroll-locked", "");

      // position:fixed sur body bloque le scroll background
      body.style.position = "fixed";
      body.style.top = `-${savedScrollY}px`;
      body.style.width = "100%";
      body.style.overflow = "hidden";

      // overflow-y:scroll sur html (toujours à y=0) force la bande de scrollbar visible
      documentElement.style.overflowY = "scroll";
    }

    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks > 0) return;

      applyUnlock();
    };
  }, [active]);
}
