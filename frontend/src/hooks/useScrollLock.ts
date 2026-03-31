import { useEffect } from "react";

let activeLocks = 0;
let lockedScrollY = 0;
let previousBodyStyles: Partial<CSSStyleDeclaration> | null = null;
let previousHtmlStyles: Partial<CSSStyleDeclaration> | null = null;

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement } = document;

    if (activeLocks === 0) {
      lockedScrollY = window.scrollY;
      previousBodyStyles = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        left: body.style.left,
        right: body.style.right,
        overscrollBehavior: body.style.overscrollBehavior,
      };
      previousHtmlStyles = {
        overflow: documentElement.style.overflow,
        overscrollBehavior: documentElement.style.overscrollBehavior,
      };

      Object.assign(documentElement.style, {
        overflow: "hidden",
        overscrollBehavior: "none",
      });

      Object.assign(body.style, {
        overflow: "hidden",
        position: "fixed",
        top: `-${lockedScrollY}px`,
        left: "0",
        right: "0",
        width: "100%",
        overscrollBehavior: "none",
      });
    }

    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks > 0) {
        return;
      }

      Object.assign(body.style, previousBodyStyles ?? {
        overflow: "",
        position: "",
        top: "",
        width: "",
        left: "",
        right: "",
        overscrollBehavior: "",
      });
      Object.assign(documentElement.style, previousHtmlStyles ?? {
        overflow: "",
        overscrollBehavior: "",
      });

      previousBodyStyles = null;
      previousHtmlStyles = null;
      window.scrollTo(0, lockedScrollY);
    };
  }, [active]);
}
