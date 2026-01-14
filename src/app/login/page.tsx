"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "info" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = normalizedEmail.length > 3 && normalizedEmail.includes("@") && !isSending;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSending(true);
    setStatus({ type: "info", message: "Sending magic link..." });

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setIsSending(false);
      return;
    }

    setStatus({ type: "success", message: "Magic link sent! Check your inbox." });
    setIsSending(false);
  }

  const statusClass =
    status.type === "error"
      ? "text-red-300"
      : status.type === "success"
        ? "text-emerald-300"
        : "text-[#B3B3B3]";

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#050507] text-white overflow-hidden px-4 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[820px] w-[820px] bg-[#00FFC6] opacity-20 blur-[220px] rounded-full translate-y-[-120px]" />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Header */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          <span className="text-white">Welcome to </span>
          <span className="text-white">Im</span>
          <span className="text-[#00FFC6]">Music</span>
        </h1>

        <p className="mt-3 text-base sm:text-lg text-[#B3B3B3]">
          Sign in with a magic link. No password needed.
        </p>

        <form onSubmit={handleLogin} className="mt-10 flex flex-col gap-4">
          <label className="sr-only" htmlFor="email">
            Email address
          </label>

          <div className="flex justify-center">
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="Your email"
              className="
                w-full max-w-sm
                px-5 py-4
                rounded-full
                bg-white/5
                border border-white/15
                backdrop-blur-md
                text-center
                placeholder:text-white/40
                transition-all duration-200
                focus:outline-none
                focus:border-[#00FFC6]/80
                focus:shadow-[0_0_0_1px_rgba(0,255,198,0.45),0_0_40px_rgba(0,255,198,0.25)]
              "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <p className="mt-2 text-xs text-white/40 text-center">
            We'll send you a secure login link. No password required.
          </p>

          <div className="mt-10 flex justify-center">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`
                inline-flex items-center justify-center
                px-7 py-2.5
                rounded-full
                bg-[#0E0E10]
                border border-[#00FFC6]/80
                text-[#00FFC6]
                font-semibold
                tracking-wide
                transition-all duration-200
                shadow-[0_0_0_1px_rgba(0,255,198,0.45),0_0_30px_rgba(0,255,198,0.25)]
                hover:shadow-[0_0_0_1px_rgba(0,255,198,0.7),0_0_60px_rgba(0,255,198,0.45)]
                hover:-translate-y-0.5
                active:translate-y-0
                disabled:opacity-40
                disabled:cursor-not-allowed
                ${isSending ? "animate-pulse" : ""}
              `}
            >
              {isSending ? "Sending…" : "Send Magic Link"}
            </button>
          </div>

          {status.message ? (
            <p className={`text-sm text-center break-words ${statusClass}`} aria-live="polite">
              {status.message}
            </p>
          ) : null}
        </form>

        <p className="mt-8 text-xs text-white/40">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
