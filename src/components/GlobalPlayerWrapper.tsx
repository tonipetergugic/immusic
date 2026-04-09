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

      <div className="pb-[72px] md:pb-20">{children}</div>

      <div className="fixed inset-x-0 bottom-0 z-40">
        <PlayerBar />
      </div>
      </PlayerProvider>
    </ViewerRoleProvider>
  );
}

