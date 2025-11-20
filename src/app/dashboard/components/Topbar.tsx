"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function Topbar() {
  const [email, setEmail] = useState<string | null>(null);

  // TEMPORARY — replace later with real Supabase session
  useEffect(() => {
    setEmail("user@example.com"); 
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-full h-14 bg-[#0B0B0D] border-b border-[#1A1A1C] flex items-center justify-between px-6">
      
      {/* Left: Dashboard Title */}
      <span className="text-white font-medium tracking-wide">
        ImMusic Dashboard
      </span>

      {/* Right: User Info */}
      <div className="flex items-center gap-4">

        {/* Avatar Placeholder - später echtes Profilbild */}
        <div className="w-8 h-8 rounded-full bg-[#1F1F22] flex items-center justify-center text-xs text-[#00FFC6]">
          {email ? email.charAt(0).toUpperCase() : "?"}
        </div>

        {/* Username/Email */}
        <span className="text-white text-sm">
          {email}
        </span>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="text-[#B3B3B3] hover:text-[#00FFC6] transition text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
