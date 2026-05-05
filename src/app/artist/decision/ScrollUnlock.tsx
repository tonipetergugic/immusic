"use client";

import { useEffect } from "react";

export function ScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflowY = html.style.overflowY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverflowY = body.style.overflowY;
    const hadBodyOverflowHiddenClass = body.classList.contains("overflow-hidden");

    body.classList.remove("overflow-hidden");
    html.style.overflowY = "auto";
    body.style.overflow = "";
    body.style.overflowY = "auto";

    return () => {
      html.style.overflowY = previousHtmlOverflowY;
      body.style.overflow = previousBodyOverflow;
      body.style.overflowY = previousBodyOverflowY;

      if (hadBodyOverflowHiddenClass) {
        body.classList.add("overflow-hidden");
      }
    };
  }, []);

  return null;
}
