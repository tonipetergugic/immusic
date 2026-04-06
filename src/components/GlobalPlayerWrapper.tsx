"use client";

import { useEffect, useRef, useState } from "react";
import PlayerBar from "@/components/PlayerBar";
import { PlayerProvider } from "@/context/PlayerContext";
import { ViewerRoleProvider } from "@/context/ViewerRoleContext";

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
    <ViewerRoleProvider>
      <PlayerProvider>
      {/* Global Notice */}
      {notice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-4">
          <div className="w-full max-w-[560px] rounded-3xl border border-white/10 bg-[#0E0E10]/92 px-6 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_28px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl">
            <p className="text-center text-[18px] font-medium leading-8 text-white/92">
              {notice}
            </p>
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
    </ViewerRoleProvider>
  );
}

