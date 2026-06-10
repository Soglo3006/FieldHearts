import { useEffect } from "react";

let activeLocks = 0;
let previousBodyStyles: Partial<CSSStyleDeclaration> | null = null;
let previousHtmlStyles: Partial<CSSStyleDeclaration> | null = null;
let previousScrollLockPadding = "";

function getScrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement } = document;
    const scrollbarWidth = getScrollbarWidth();

    if (activeLocks === 0) {
      previousScrollLockPadding =
        documentElement.style.getPropertyValue("--scroll-lock-padding");

      previousBodyStyles = {
        overflow: body.style.overflow,
        overscrollBehavior: body.style.overscrollBehavior,
        paddingRight: body.style.paddingRight,
      };
      previousHtmlStyles = {
        overflow: documentElement.style.overflow,
        overscrollBehavior: documentElement.style.overscrollBehavior,
        paddingRight: documentElement.style.paddingRight,
      };

      documentElement.style.setProperty(
        "--scroll-lock-padding",
        `${scrollbarWidth}px`,
      );
      documentElement.setAttribute("data-scroll-locked", "");
      body.setAttribute("data-scroll-locked", "");

      Object.assign(documentElement.style, {
        overflow: "hidden",
        overscrollBehavior: "none",
        paddingRight: scrollbarWidth > 0 ? `${scrollbarWidth}px` : "",
      });

      Object.assign(body.style, {
        overflow: "hidden",
        overscrollBehavior: "none",
        paddingRight: scrollbarWidth > 0 ? `${scrollbarWidth}px` : "",
      });
    }

    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks > 0) {
        return;
      }

      documentElement.removeAttribute("data-scroll-locked");
      body.removeAttribute("data-scroll-locked");

      if (previousScrollLockPadding) {
        documentElement.style.setProperty(
          "--scroll-lock-padding",
          previousScrollLockPadding,
        );
      } else {
        documentElement.style.removeProperty("--scroll-lock-padding");
      }

      Object.assign(body.style, previousBodyStyles ?? {
        overflow: "",
        overscrollBehavior: "",
        paddingRight: "",
      });
      Object.assign(documentElement.style, previousHtmlStyles ?? {
        overflow: "",
        overscrollBehavior: "",
        paddingRight: "",
      });

      previousBodyStyles = null;
      previousHtmlStyles = null;
      previousScrollLockPadding = "";
    };
  }, [active]);
}
