import { useEffect } from "react";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;

    Object.assign(document.body.style, {
      overflow: "hidden",
      position: "fixed",
      top: `-${scrollY}px`,
      width: "100%",
    });

    return () => {
      Object.assign(document.body.style, {
        overflow: "",
        position: "",
        top: "",
        width: "",
      });
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
