"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "immusic_install_hint_state";

type InstallHintState = "later" | "dismissed" | null;

function getStoredState(): InstallHintState {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(STORAGE_KEY);

  if (value === "later" || value === "dismissed") {
    return value;
  }

  return null;
}

function isIPhoneLikeMobile() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipod/.test(ua);
  const isIPad =
    /ipad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return isIPhone || isIPad;
}

export default function HomeScreenInstallHint() {
  const [isOpen, setIsOpen] = useState(false);

  const shouldRun = useMemo(() => isIPhoneLikeMobile(), []);

  useEffect(() => {
    if (!shouldRun) return;

    const stored = getStoredState();
    if (stored === "dismissed") return;

    const timeout = window.setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [shouldRun]);

  function handleLater() {
    window.localStorage.setItem(STORAGE_KEY, "later");
    setIsOpen(false);
  }

  function handleDismissed() {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
    setIsOpen(false);
  }

  if (!shouldRun || !isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[80] px-4 sm:px-6 lg:hidden">
      <div className="mx-auto w-full max-w-md rounded-[24px] border border-white/10 bg-[#111214]/95 p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00FFC6]">
              Quick Access
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-white">
              Add ImMusic to your Home Screen
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Open faster next time and use ImMusic more like an app on your iPhone.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismissed}
            className="shrink-0 text-sm text-white/50 transition hover:text-white"
            aria-label="Close install hint"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <ol className="space-y-3 text-sm text-white/80">
            <li>
              <span className="font-semibold text-white">1.</span> Tap the{" "}
              <span className="font-semibold text-white">Share</span> button in Safari
            </li>
            <li>
              <span className="font-semibold text-white">2.</span> Scroll and tap{" "}
              <span className="font-semibold text-white">Add to Home Screen</span>
            </li>
            <li>
              <span className="font-semibold text-white">3.</span> Tap{" "}
              <span className="font-semibold text-white">Add</span>
            </li>
          </ol>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleLater}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            Later
          </button>

          <button
            type="button"
            onClick={handleDismissed}
            className="flex-1 rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-4 py-3 text-sm font-semibold text-[#00FFC6] transition hover:bg-[#00FFC6]/15"
          >
            Don’t show again
          </button>
        </div>
      </div>
    </div>
  );
}
