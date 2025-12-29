"use client";

import { useEffect, useRef, useState } from "react";
import PlayerBar from "@/components/PlayerBar";
import { PlayerProvider } from "@/context/PlayerContext";

export default function GlobalPlayerWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleNotice(event: Event) {
      const e = event as CustomEvent<{ message?: string }>;
      const message = e?.detail?.message?.trim();
      if (!message) return;

      setNotice(message);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, 4000);
    }

    window.addEventListener("immusic:notice", handleNotice as EventListener);

    return () => {
      window.removeEventListener("immusic:notice", handleNotice as EventListener);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <PlayerProvider>
      {/* Global Notice */}
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
          <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/10 shadow-lg backdrop-blur-md">
            <p className="text-[13px] text-white/85">{notice}</p>
          </div>
        </div>
      )}

      <div className="pb-24">{children}</div>

      <div
        className="
          h-24
          fixed bottom-0 left-0 right-0 z-50
          border-t border-[#1A1A1C]
          bg-[#0B0B0D]/80
          backdrop-blur-xl
          shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
          flex items-center
          px-6
        "
      >
        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}

