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
    <div className="relative flex items-center justify-center h-screen bg-[#050507] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[900px] w-[900px] bg-[#00FFC6] opacity-20 blur-[220px] rounded-full translate-y-[-120px]" />
      </div>
      <div className="relative w-full max-w-sm p-8 bg-[#141418] rounded-2xl shadow-2xl border border-[#2A2A2A]">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-3xl font-bold mb-1">Welcome to ImMusic</div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          <input
            type="email"
            placeholder="Your email"
            className="p-3 rounded-xl bg-[#0E0E10] border border-[#333] focus:outline-none focus:ring-2 focus:ring-[#00FFC6] transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            className="p-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] transition-all"
          >
            Send Magic Link
          </button>

          {status && (
            <p className="text-sm text-center text-[#B3B3B3]">{status}</p>
          )}

        </form>

        {/* Footer */}
        <p className="text-center text-xs text-[#777] mt-6">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
