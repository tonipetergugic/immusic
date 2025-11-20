"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Magic Link sent! Check your inbox.");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen text-white">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 p-6 bg-[#1A1A1A] rounded-xl">
        <h1 className="text-xl font-bold text-white">Login</h1>

        <input
          type="email"
          placeholder="Your email"
          className="p-3 rounded bg-[#0E0E10] border border-[#333]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          className="p-3 rounded bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
        >
          Send Magic Link
        </button>

        {status && <p className="text-sm text-[#B3B3B3]">{status}</p>}
      </form>
    </div>
  );
}
