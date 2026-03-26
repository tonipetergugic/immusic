"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";

type ReportReason =
  | "wrong_ownership"
  | "illegal_or_extremist"
  | "harassment_or_abuse"
  | "spam_or_misleading"
  | "other";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_ownership", label: "Wrong ownership or credits" },
  { value: "illegal_or_extremist", label: "Illegal or extremist content" },
  { value: "harassment_or_abuse", label: "Harassment or abusive content" },
  { value: "spam_or_misleading", label: "Spam or misleading metadata" },
  { value: "other", label: "Other" },
];

type ReportTrackModalProps = {
  open: boolean;
  onClose: () => void;
  track: PlayerTrack;
};

export default function ReportTrackModal({
  open,
  onClose,
  track,
}: ReportTrackModalProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reason, setReason] = useState<ReportReason>("wrong_ownership");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("wrong_ownership");
    setDetails("");
    setLoading(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [open]);

  async function handleSubmit() {
    if (loading) return;

    const trackId = (track as any)?.id as string | undefined;
    if (!trackId) {
      setErrorMessage("Track ID is missing.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setErrorMessage("You must be logged in to report a track.");
      return;
    }

    const { error } = await supabase.from("track_reports").insert({
      track_id: trackId,
      reporter_user_id: user.id,
      reason,
      details: details.trim() || null,
    });

    if (error) {
      setLoading(false);

      if (error.code === "23505") {
        setErrorMessage("You already reported this track.");
        return;
      }

      console.error("Failed to create track report:", error);
      setErrorMessage("Could not submit report. Please try again.");
      return;
    }

    setLoading(false);
    setSuccessMessage("Report submitted.");
    window.setTimeout(() => {
      onClose();
    }, 900);
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">Report track</h2>
            <p className="mt-1 text-sm text-white/60">
              Tell us what looks wrong with{" "}
              <span className="text-white/80">{track?.title ?? "this track"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              disabled={loading}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00FFC6]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={5}
              disabled={loading}
              placeholder="Add any context that could help with review."
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00FFC6]/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-300">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-[#00FFC6]/85">{successMessage}</p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-4 py-2.5 text-sm font-semibold text-[#CFFFF4] transition hover:bg-[#00FFC6]/14 hover:border-[#00FFC6]/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
