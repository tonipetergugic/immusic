"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "immusic_install_hint_state";

type InstallHintState = "later" | "dismissed" | null;
type InstallPlatform = "ios" | "android" | null;

function getStoredState(): InstallHintState {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(STORAGE_KEY);

  if (value === "later" || value === "dismissed") {
    return value;
  }

  return null;
}

function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return null;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipod/.test(ua);
  const isIPad =
    /ipad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIPhone || isIPad) {
    return "ios";
  }

  const isAndroid = /android/.test(ua);
  if (isAndroid) {
    return "android";
  }

  return null;
}

export default function HomeScreenInstallHint() {
  const [isOpen, setIsOpen] = useState(false);

  const platform = useMemo(() => getInstallPlatform(), []);
  const shouldRun = platform !== null;

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

  if (!shouldRun || !isOpen || !platform) return null;

  const title =
    platform === "ios"
      ? "Add ImMusic to your Home Screen"
      : "Add ImMusic to your Home Screen";

  const description =
    platform === "ios"
      ? "Open faster next time and use ImMusic more like an app on your iPhone."
      : "Open faster next time and keep ImMusic on your Android home screen like an app.";

  const steps =
    platform === "ios"
      ? [
          <>Tap the <span className="font-semibold text-white">Share</span> button in Safari</>,
          <>
            Scroll and tap{" "}
            <span className="font-semibold text-white">Add to Home Screen</span>
          </>,
          <>Tap <span className="font-semibold text-white">Add</span></>,
        ]
      : [
          <>Tap the <span className="font-semibold text-white">browser menu</span> in Chrome</>,
          <>
            Tap{" "}
            <span className="font-semibold text-white">Add to Home screen</span>
          </>,
          <>Confirm with <span className="font-semibold text-white">Add</span></>,
        ];

  return (
    <div className="fixed inset-x-0 bottom-24 z-[80] px-4 sm:px-6 lg:hidden">
      <div className="mx-auto w-full max-w-md rounded-[24px] border border-white/10 bg-[#111214]/95 p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00FFC6]">
              Quick Access
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-white">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismissed}
            className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close install hint"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <ol className="space-y-3 text-sm text-white/80">
            {steps.map((step, index) => (
              <li key={index}>
                <span className="font-semibold text-white">{index + 1}.</span>{" "}
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleLater}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Later
          </button>

          <button
            type="button"
            onClick={handleDismissed}
            className="flex-1 rounded-full border border-[#00FFC6]/70 bg-[#0E0E10] px-5 py-3.5 text-sm font-semibold text-[#00FFC6] shadow-[0_0_0_1px_rgba(0,255,198,0.35),0_0_24px_rgba(0,255,198,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.55),0_0_40px_rgba(0,255,198,0.28)]"
          >
            Don’t show again
          </button>
        </div>
      </div>
    </div>
  );
}
