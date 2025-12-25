"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTopOnRouteChange({
  selector,
}: {
  selector: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.querySelector(selector);

    if (!(el instanceof HTMLElement)) return;

    // Robust: force scrollTop sync + next frame (handles layout/paint timing)
    el.scrollTop = 0;

    requestAnimationFrame(() => {
      el.scrollTop = 0;

      // Fallback for browsers that prefer scrollTo
      try {
        el.scrollTo({ top: 0, behavior: "auto" });
      } catch {
        // ignore
      }
    });
  }, [pathname, selector]);

  return null;
}

