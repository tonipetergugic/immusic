"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function Topbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .single();

      if (profile?.role) setRole(profile.role);
      if (profile?.display_name) setEmail(profile.display_name);
    }

    loadUser();
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
    <div className="w-full h-14 bg-[#0B0B0D] border-b border-[#1A1A1C] 
      flex items-center justify-between px-8
      shadow-[0_1px_20px_0_rgba(0,255,198,0.08)]
    ">
      <span className="text-white/90 font-semibold tracking-wide text-sm">
        ImMusic Dashboard
      </span>

      <div className="flex items-center gap-5">

        <div className="w-9 h-9 rounded-full bg-[#1A1A1C] border border-[#00FFC622]
          flex items-center justify-center text-sm text-[#00FFC6] font-medium
        ">
          {email ? email.charAt(0).toUpperCase() : "?"}
        </div>

        <span className="text-white/80 text-sm font-light">
          {email}
        </span>

        {role === "admin" && (
          <Link
            href="/admin/applications"
            className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
          >
            Admin Panel
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
        >
          Logout
        </button>

      </div>
    </div>
  );
}
