"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StatusState = {
  type: "idle" | "info" | "success" | "error";
  message: string;
};

type OtpStep = "request" | "verify";

export default function LoginForm({
  initialErrorMessage,
}: {
  initialErrorMessage: string | null;
}) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("request");
  const [status, setStatus] = useState<StatusState>(
    initialErrorMessage
      ? { type: "error", message: initialErrorMessage }
      : { type: "idle", message: "" }
  );
  const [isSending, setIsSending] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedOtpCode = useMemo(() => otpCode.trim(), [otpCode]);

  const isValidEmail =
    normalizedEmail.length > 3 && normalizedEmail.includes("@");

  const canSubmit =
    otpStep === "request"
      ? isValidEmail && !isSending
      : isValidEmail && normalizedOtpCode.length > 0 && !isSending;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSending(true);

    if (otpStep === "request") {
      setStatus({ type: "info", message: "Sending code..." });

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
      });

      if (error) {
        setStatus({ type: "error", message: error.message });
        setIsSending(false);
        return;
      }

      setOtpStep("verify");
      setStatus({ type: "success", message: "Code sent! Check your inbox." });
      setIsSending(false);
      return;
    }

    setStatus({ type: "info", message: "Verifying code..." });

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedOtpCode,
      type: "email",
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setIsSending(false);
      return;
    }

    setStatus({ type: "success", message: "Login successful. Redirecting..." });
    setIsSending(false);
    router.push("/dashboard");
    router.refresh();
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (otpStep === "verify") {
      setOtpStep("request");
      setOtpCode("");
      setStatus({ type: "idle", message: "" });
    }
  }

  const statusClass =
    status.type === "error"
      ? "text-red-300"
      : status.type === "success"
        ? "text-emerald-300"
        : "text-[#B3B3B3]";

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#050507] px-4 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/landing/hero-bg.png)" }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/85 to-black/90"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          <span className="text-white">Welcome to </span>
          <span className="text-white">Im</span>
          <span className="text-[#00FFC6]">Music</span>
        </h1>

        <p className="mt-3 text-base text-[#B3B3B3] sm:text-lg">
          Sign in with a secure email code. No password needed.
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
                rounded-full
                border border-white/20
                bg-white/10
                px-5 py-4
                text-center
                backdrop-blur-md
                transition-all duration-200
                placeholder:text-white/50
                focus:border-[#00FFC6]/80
                focus:shadow-[0_0_0_1px_rgba(0,255,198,0.45),0_0_40px_rgba(0,255,198,0.25)]
                focus:outline-none
              "
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
            />
          </div>

          {otpStep === "verify" ? (
            <div className="flex justify-center">
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter code"
                className="
                  w-full max-w-sm
                  rounded-full
                  border border-white/20
                  bg-white/10
                  px-5 py-4
                  text-center
                  backdrop-blur-md
                  transition-all duration-200
                  placeholder:text-white/50
                  focus:border-[#00FFC6]/80
                  focus:shadow-[0_0_0_1px_rgba(0,255,198,0.45),0_0_40px_rgba(0,255,198,0.25)]
                  focus:outline-none
                "
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
          ) : null}

          <div className="mt-2 text-center">
            {otpStep === "request" ? (
              <>
                <p className="text-sm text-white/40">
                  We&apos;ll send a secure login code to your email.
                </p>
                <p className="mt-1 text-sm text-white/40">
                  By continuing, you agree to our Terms & Privacy Policy.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/40">
                  Enter the code we sent to {normalizedEmail || "your email"}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("request");
                    setOtpCode("");
                    setStatus({ type: "idle", message: "" });
                  }}
                  className="mt-2 text-sm text-[#00FFC6] transition-opacity hover:opacity-80"
                >
                  Use a different email
                </button>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-center sm:mt-10">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`
                inline-flex min-w-[220px] items-center justify-center
                rounded-full
                border border-[#00FFC6]/80
                bg-[#0E0E10]
                px-10 py-3
                font-semibold
                tracking-tight
                text-[#00FFC6]
                cursor-pointer
                transition-all duration-200
                shadow-[0_0_0_1px_rgba(0,255,198,0.45),0_0_30px_rgba(0,255,198,0.25)]
                hover:-translate-y-0.5
                hover:shadow-[0_0_0_1px_rgba(0,255,198,0.7),0_0_60px_rgba(0,255,198,0.45)]
                active:translate-y-0
                disabled:cursor-not-allowed
                disabled:opacity-40
                ${isSending ? "animate-pulse" : ""}
              `}
            >
              {isSending
                ? otpStep === "request"
                  ? "Sending…"
                  : "Verifying…"
                : otpStep === "request"
                  ? "Send Code"
                  : "Verify Code"}
            </button>
          </div>

          <div className="min-h-[20px]">
            <p
              className={`text-center text-sm break-words transition-opacity ${
                status.message ? "opacity-100" : "opacity-0"
              } ${statusClass}`}
              aria-live="polite"
            >
              {status.message || " "}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
