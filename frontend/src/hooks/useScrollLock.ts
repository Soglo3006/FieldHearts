import { useEffect } from "react";

let activeLocks = 0;
let savedScrollY = 0;
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyWidth = "";
let previousBodyOverflow = "";
let previousHtmlOverflowY = "";

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
    };
  }, [active]);
}
