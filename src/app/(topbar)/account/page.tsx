"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createSupabaseBrowserClient();
  }, []);

  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [confirmEmail, setConfirmEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [accountUpdatedAt, setAccountUpdatedAt] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteInfo, setDeleteInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadEmail() {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;

      if (error) {
        setErrorMsg("Could not load your account email.");
        return;
      }

      const email = data.user?.email ?? "";
      setCurrentEmail(email);
      setNewEmail("");
      setConfirmEmail("");

      setLastSignInAt(data.user?.last_sign_in_at ?? null);
      setAccountUpdatedAt(data.user?.updated_at ?? null);
    }

    loadEmail();
    return () => {
      alive = false;
    };
  }, [supabase]);

  function isValidEmail(value: string): boolean {
    // simple & robust enough for client-side (no over-strict RFC)
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  const newEmailValid = isValidEmail(newEmail);
  const confirmEmailValid = isValidEmail(confirmEmail);
  const emailsMatch =
    newEmail.trim().toLowerCase() === confirmEmail.trim().toLowerCase();

  function formatDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }

  async function handleEmailChange() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmail.trim()) {
      setErrorMsg("Please enter your new email.");
      return;
    }

    if (!isValidEmail(newEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!isValidEmail(confirmEmail)) {
      setErrorMsg("Please confirm with a valid email address.");
      return;
    }

    if (!emailsMatch) {
      setErrorMsg("Email addresses do not match.");
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setErrorMsg("This is already your current email.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg(
        "Confirmation email sent. Please check your inbox to confirm the new email."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutEverywhere() {
    setSecurityError(null);
    setSecuritySuccess(null);
    setSecuritySaving(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        setSecurityError(error.message);
        return;
      }
      setSecuritySuccess("Logged out everywhere. Please sign in again.");
      window.location.href = "/login";
    } finally {
      setSecuritySaving(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#0E0E10] text-white p-10">
      <div
        className="
          max-w-xl mx-auto
          bg-[#0B0B0D]
          border border-[#1A1A1C]
          rounded-2xl
          p-8
          shadow-[0_20px_60px_rgba(0,0,0,0.6)]
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-xl
              bg-[#111113]
              border border-[#1A1A1C]
              text-[#B3B3B3]
              hover:border-[#00FFC6]
              hover:text-[#00FFC6]
              transition
            "
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold leading-tight">Account</h1>
            <p className="text-[#B3B3B3] mt-1">
              Manage your email and security settings.
            </p>
          </div>
        </div>

        {/* Email */}
        <div className="mt-2">
          <div className="text-sm text-[#B3B3B3] mb-2">Email</div>

          <div
            className="
              rounded-xl
              border border-[#1A1A1C]
              bg-[#111113]
              px-4 py-4
            "
          >
            <div className="text-sm text-[#B3B3B3]">Current email</div>
            <div className="text-white/90 font-medium mt-1">
              {currentEmail || "—"}
            </div>

            <div className="mt-4">
              <label className="block text-sm text-[#B3B3B3] mb-2">
                New email
              </label>

              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                placeholder="Enter your new email address"
                className="
                  w-full
                  bg-[#0F0F11]
                  border border-[#1A1A1C]
                  rounded-xl
                  px-4 py-3
                  text-white placeholder-[#666]
                  focus:outline-none
                  focus:border-[#00FFC6]
                  focus:shadow-[0_0_0_2px_rgba(0,255,198,0.15)]
                  transition
                "
              />

              <p className="mt-1 text-xs text-[#B3B3B3]">
                This will replace your current login email after confirmation.
              </p>

              <label className="block text-sm text-[#B3B3B3] mt-4 mb-2">
                Confirm email
              </label>

              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                type="email"
                placeholder="Repeat new email"
                className="
                  w-full
                  bg-[#0F0F11]
                  border border-[#1A1A1C]
                  rounded-xl
                  px-4 py-3
                  text-white placeholder-[#666]
                  focus:outline-none
                  focus:border-[#00FFC6]
                  focus:shadow-[0_0_0_2px_rgba(0,255,198,0.15)]
                  transition
                "
              />

              {confirmEmail.length > 0 && !confirmEmailValid && (
                <p className="mt-1 text-xs text-red-400">
                  Please enter a valid email format.
                </p>
              )}

              {newEmail.length > 0 && confirmEmail.length > 0 && confirmEmailValid && newEmailValid && !emailsMatch && (
                <p className="mt-1 text-xs text-red-400">
                  Emails do not match.
                </p>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleEmailChange}
                  disabled={
                    saving ||
                    !newEmail ||
                    !confirmEmail ||
                    !newEmailValid ||
                    !confirmEmailValid ||
                    !emailsMatch
                  }
                  className="
                    inline-flex items-center justify-center
                    w-[220px]
                    rounded-lg
                    px-5 py-2.5
                    bg-[#111113]
                    border border-[#1A1A1C]
                    text-[#B3B3B3] font-medium
                    hover:border-[#00FFC6]
                    hover:text-[#00FFC6]
                    transition
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                    disabled:hover:border-[#1A1A1C]
                    disabled:hover:text-[#B3B3B3]
                  "
                >
                  {saving ? "Sending..." : "Send confirmation"}
                </button>

                <span className="text-xs text-[#B3B3B3]">
                  We&apos;ll email a confirmation link.
                </span>
              </div>

              {errorMsg && (
                <div className="mt-3 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-3 text-sm text-[#00FFC6]">
                  {successMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mt-8">
          <div className="text-sm text-[#B3B3B3] mb-2">Security</div>

          <div
            className="
              rounded-xl
              border border-[#1A1A1C]
              bg-[#111113]
              px-4 py-4
            "
          >
            <div className="text-white/90 font-medium">Security actions</div>
            <div className="text-sm text-[#B3B3B3] mt-1">
              Use this if you think your account was accessed on another device.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#B3B3B3]">Last sign-in</div>
                <div className="text-sm text-white/90 mt-1">
                  {formatDate(lastSignInAt)}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B3B3B3]">Account last updated</div>
                <div className="text-sm text-white/90 mt-1">
                  {formatDate(accountUpdatedAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleLogoutEverywhere}
                disabled={securitySaving}
                className="
                  inline-flex items-center justify-center
                  w-[240px]
                  rounded-lg
                  px-5 py-2.5
                  bg-[#111113]
                  border border-[#1A1A1C]
                  text-red-300 font-medium
                  hover:border-red-400
                  hover:text-red-200
                  transition
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  disabled:hover:border-[#1A1A1C]
                  disabled:hover:text-red-300
                "
              >
                {securitySaving ? "Working..." : "Logout everywhere"}
              </button>
            </div>

            {securityError && (
              <div className="mt-3 text-sm text-red-400">
                {securityError}
              </div>
            )}

            {securitySuccess && (
              <div className="mt-3 text-sm text-[#00FFC6]">
                {securitySuccess}
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8">
          <div className="text-sm text-[#B3B3B3] mb-2">Danger zone</div>

          <div
            className="
              rounded-xl
              border border-red-500/20
              bg-[#111113]
              px-4 py-4
            "
          >
            <div className="text-white/90 font-medium">Delete account</div>
            <div className="text-sm text-[#B3B3B3] mt-1">
              This permanently deletes your account. This is a UI-only flow for now (no backend wired).
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteInfo(null);
                  setDeleteConfirmText("");
                  setDeleteOpen(true);
                }}
                className="
                  inline-flex items-center justify-center
                  w-[220px]
                  rounded-lg
                  px-5 py-2.5
                  bg-[#111113]
                  border border-red-500/30
                  text-red-300 font-medium
                  hover:border-red-400
                  hover:text-red-200
                  transition
                "
              >
                Delete account
              </button>

              <span className="text-xs text-[#B3B3B3]">
                You&apos;ll need to confirm.
              </span>
            </div>

            {deleteInfo && (
              <div className="mt-3 text-sm text-[#00FFC6]">
                {deleteInfo}
              </div>
            )}
          </div>
        </div>

        {/* Delete account modal (UI only) */}
        {deleteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              aria-label="Close modal"
              onClick={() => setDeleteOpen(false)}
            />

            <div
              className="
                relative w-full max-w-md
                rounded-2xl
                border border-[#1A1A1C]
                bg-[#0B0B0D]
                p-6
                shadow-[0_20px_60px_rgba(0,0,0,0.7)]
              "
            >
              <div className="text-lg font-semibold text-white">
                Confirm account deletion
              </div>

              <div className="mt-2 text-sm text-[#B3B3B3]">
                Type <span className="text-white/90 font-medium">DELETE</span> to enable the final button.
                <br />
                <span className="text-red-300">
                  UI only: No backend deletion is executed in this build.
                </span>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-[#B3B3B3] mb-2">
                  Confirmation
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE"'
                  className="
                    w-full
                    bg-[#0F0F11]
                    border border-[#1A1A1C]
                    rounded-xl
                    px-4 py-3
                    text-white placeholder-[#666]
                    focus:outline-none
                    focus:border-red-400
                    focus:shadow-[0_0_0_2px_rgba(248,113,113,0.15)]
                    transition
                  "
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="
                    inline-flex items-center justify-center
                    rounded-lg
                    px-4 py-2.5
                    bg-[#111113]
                    border border-[#1A1A1C]
                    text-[#B3B3B3] font-medium
                    hover:border-[#00FFC6]
                    hover:text-[#00FFC6]
                    transition
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteInfo("Account deletion confirmed (UI only). Backend wiring comes later.");
                  }}
                  className="
                    inline-flex items-center justify-center
                    rounded-lg
                    px-4 py-2.5
                    bg-[#111113]
                    border border-red-500/30
                    text-red-300 font-medium
                    hover:border-red-400
                    hover:text-red-200
                    transition
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                    disabled:hover:border-red-500/30
                    disabled:hover:text-red-300
                  "
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

