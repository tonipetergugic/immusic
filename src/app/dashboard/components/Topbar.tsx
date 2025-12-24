"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function Topbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        .select("role, display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile?.role) setRole(profile.role);
      if (profile?.display_name) setEmail(profile.display_name);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    }

    loadUser();
  }, []);

  useEffect(() => {
    function handleNameUpdate(e: CustomEvent) {
      if (typeof e.detail === "string") {
        setEmail(e.detail);
      }
    }

    window.addEventListener(
      "displayNameUpdated",
      handleNameUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "displayNameUpdated",
        handleNameUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const menu = document.getElementById("avatar-menu");
      const avatar = document.getElementById("avatar-button");
      if (
        isMenuOpen &&
        menu &&
        !menu.contains(e.target as Node) &&
        avatar &&
        !avatar.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

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
      relative
    ">
      <span className="text-white/90 font-semibold tracking-wide text-sm">
        ImMusic Dashboard
      </span>

      <div className="flex items-center gap-5">

        <div
          id="avatar-button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="
            w-9 h-9 rounded-full border border-[#00FFC622]
            overflow-hidden cursor-pointer
            transition-shadow duration-200
            hover:shadow-[0_0_10px_2px_rgba(0,255,198,0.4)]
            flex items-center justify-center bg-[#1A1A1C]
          "
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm text-[#00FFC6] font-medium">
              {email ? email.charAt(0).toUpperCase() : "?"}
            </span>
          )}
        </div>

        {isMenuOpen && (
          <div
            id="avatar-menu"
            className="
              absolute top-14 right-8
              w-56
              bg-[#0B0B0D] border border-[#1A1A1C]
              rounded-xl shadow-lg
              p-3
            "
          >
            {/* Menü kommt in Schritt 7 */}
            <div className="flex flex-col text-sm text-[#B3B3B3]">
              <Link
                href="/profile"
                className="
                  w-full text-left px-3 py-2 rounded-md block
                  hover:bg-[#111113] hover:text-white transition
                "
              >
                Profile
              </Link>

              <Link
                href="/account"
                className="
                  w-full text-left px-3 py-2 rounded-md block
                  hover:bg-[#111113] hover:text-white transition
                "
              >
                Account
              </Link>

              <Link
                href="/settings"
                className="
                  w-full text-left px-3 py-2 rounded-md block
                  hover:bg-[#111113] hover:text-white transition
                "
              >
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="
                  w-full text-left px-3 py-2 rounded-md text-red-400
                  hover:bg-[#111113] hover:text-red-300 transition
                "
              >
                Logout
              </button>
            </div>
          </div>
        )}

        <span className="text-white/80 text-sm font-light">
          {email}
        </span>

        {role === "admin" && (
          <Link
    href="/dashboard/admin"
            className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
          >
            Admin Panel
          </Link>
        )}

      </div>
    </div>
  );
}
