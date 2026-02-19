import BackLink from "@/components/BackLink";
import IssuesPanel from "./_components/IssuesPanel";
import RecommendationsPanel from "./_components/RecommendationsPanel";
import UnlockPanel from "./_components/UnlockPanel";
import V2MetricsGrid from "./_components/V2MetricsGrid";
import { formatTime, safeNumber, safeString, formatHardFailReason } from "./_lib/feedbackHelpers";
import { unlockPaidFeedbackAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

function renderAnalysisStatusBanner(payload: any) {
  const hardFail = !!payload?.hard_fail?.triggered;
  const decision = payload?.track?.decision; // may or may not exist; we only trust hard_fail + severity
  const severity = payload?.summary?.severity; // "info" | "warn" | "critical"

  if (hardFail) {
    return {
      badge: "HARD-FAIL",
      badgeClass: "border-red-400/30 bg-red-500/10 text-red-200",
      text: "Hard-fail triggered — release blocked due to technical issues.",
    };
  }

  // If severity is warn/critical (but not hard-fail), it's approved with risks.
  // We intentionally do NOT rely on summary.status string here.
  if (severity === "warn" || severity === "critical") {
    return {
      badge: "APPROVED",
      badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
      text: "Approved — streaming/encoding risk indicators present.",
    };
  }

  return {
    badge: "APPROVED",
    badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    text: "Approved — no major technical risks detected.",
  };
}

export default async function UploadFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ queue_id?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const queueId = (sp?.queue_id ?? "").trim();
  const error = (sp?.error ?? "").trim();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: creditRow, error: creditErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (creditErr) {
    throw new Error(`Failed to load credit balance: ${creditErr.message}`);
  }

  const creditBalance =
    typeof creditRow?.balance === "number" ? creditRow.balance : 0;

  if (!queueId) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <BackLink href="/artist/upload/processing" label="Back" />
          <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>
          <p className="text-white/70 mt-2">
            Missing parameter: <span className="font-semibold text-white">queue_id</span>
          </p>
        </div>
      </div>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Failed to resolve host for feedback API.");
  }

  const cookieHeader = (await cookies()).toString();

  const res = await fetch(
    `${proto}://${host}/api/ai/track-check/feedback?queue_id=${encodeURIComponent(queueId)}`,
    {
      cache: "no-store",
      headers: {
        cookie: cookieHeader,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Feedback API request failed: ${res.status}`);
  }

  const data = (await res.json()) as
    | {
        ok: true;
        queue_id: string;
        queue_title: string | null;
        feedback_state: "locked" | "unlocked_pending" | "unlocked_ready";
        status: "locked" | "unlocked_no_data" | "unlocked_ready";
        unlocked: boolean;
        payload: null | {
          // v1 legacy (can still exist in old rows)
          issues?: any[];
          metrics?: Record<string, any>;
          recommendations?: any[];

          // v2 (current)
          schema_version?: number;
          summary?: { highlights?: string[] };
          metrics_v2?: any; // not used, but keep forward-compatible if API shape changes
          recommendations_v2?: any;
        };
      }
    | { ok: false; error: string };

  if (!data || data.ok !== true) {
    // Anti-leak: if API returns "not_found", show same "Not found." here
    if (data && data.ok === false && data.error === "not_found") {
      return (
        <div className="min-h-screen bg-[#0E0E10] text-white">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <BackLink href="/artist/upload/processing" label="Back" />
            <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>
            <p className="text-white/70 mt-2">Not found.</p>
          </div>
        </div>
      );
    }

    throw new Error("Failed to load feedback state.");
  }

  const unlocked = data.feedback_state !== "locked";
  const queueTitle = data.queue_title ?? "Untitled";

  const isReady = data.feedback_state === "unlocked_ready" && !!data.payload;
  const payload = (data as any)?.payload ?? null;
  const issues = Array.isArray(payload?.issues) ? payload.issues : [];
  const metrics =
    payload?.metrics && typeof payload.metrics === "object" ? payload.metrics : {};
  const recommendations = Array.isArray(payload?.recommendations)
    ? payload.recommendations
    : [];

  const schemaVersion =
    typeof (payload as any)?.schema_version === "number"
      ? ((payload as any).schema_version as number)
      : null;

  const v2Highlights: string[] = Array.isArray((payload as any)?.summary?.highlights)
    ? ((payload as any).summary.highlights as string[])
    : [];

  const v2HardFail = schemaVersion === 2 ? (payload as any)?.hard_fail : null;
  const v2HardFailTriggered = Boolean(v2HardFail?.triggered);
  const v2HardFailReasons: Array<{ id: string; metric?: string; threshold?: number; value?: number }> =
    Array.isArray(v2HardFail?.reasons) ? (v2HardFail.reasons as any[]) : [];

  // v2 metrics are nested (objects). We only render known leaf values for now.
  const v2Loudness = schemaVersion === 2 ? (metrics as any)?.loudness : null;

  const v2LufsI = safeNumber(v2Loudness?.lufs_i);
  const v2TruePeak = safeNumber(v2Loudness?.true_peak_dbtp_max);

  const v2DurationS =
    safeNumber((payload as any)?.track?.duration_s) ??
    safeNumber((payload as any)?.metrics?.loudness?.duration_s) ??
    null;

  const v2TruePeakOvers = Array.isArray((payload as any)?.events?.loudness?.true_peak_overs)
    ? ((payload as any).events.loudness.true_peak_overs as any[])
    : [];

  const v2Transients = schemaVersion === 2 ? (metrics as any)?.transients : null;

  const v2MeanShortCrest = safeNumber(v2Transients?.mean_short_crest_db);
  const v2P95ShortCrest = safeNumber(v2Transients?.p95_short_crest_db);
  const v2TransientDensity = safeNumber(v2Transients?.transient_density);
  const v2PunchIndex = safeNumber(v2Transients?.punch_index);

  const v2Recommendations = schemaVersion === 2 && Array.isArray((payload as any)?.recommendations)
    ? ((payload as any).recommendations as any[])
    : [];

  const topSummaryText =
    !payload?.summary?.severity
      ? "No issues found"
      : payload.summary.severity === "critical"
        ? "Technical listenability problems detected"
        : payload.summary.severity === "warn"
          ? "Technical improvements recommended"
          : "No issues found";

  // Optional: queue audio_hash für Observability (rein beobachtend, darf niemals den Flow brechen)
  let queueAudioHash: string | null = null;
  try {
    const { data: qh, error: qhErr } = await supabase
      .from("tracks_ai_queue")
      .select("audio_hash")
      .eq("id", queueId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!qhErr) {
      queueAudioHash = (qh as any)?.audio_hash ?? null;
    }
  } catch {
    // ignore
  }

  // Security/Observability (rein beobachtend, darf niemals den Flow brechen)
  await logSecurityEvent({
    eventType: unlocked ? "FEEDBACK_ACCESS_GRANTED" : "FEEDBACK_ACCESS_DENIED",
    severity: "INFO",
    actorUserId: user.id,
    queueId,
    unlockId: null,
    reason: unlocked ? null : "NO_UNLOCK",
    hashChecked: false,
    queueAudioHash,
    unlockAudioHash: null,
    metadata: {
      source: "UploadFeedbackPage",
      api_status: data.feedback_state,
      credit_balance: creditBalance,
      error_param: error || null,
    },
  });

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <BackLink href="/artist/upload/processing" label="Back" />

        <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>

        <p className="text-white/60 mt-2">
          Upload: <span className="text-white/80">{queueTitle}</span>
        </p>

        <p className="text-white/40 text-sm mt-2">
          Note: AI feedback is tied to the exact audio file. If you change and re-upload the audio, a new analysis unlock is required.
        </p>

        {unlocked ? (
          <div className="mt-4 space-y-4">
            {isReady ? (
              <p className="text-white/70">Unlocked – analysis is ready.</p>
            ) : (
              <p className="text-white/70">
                Analysis is running.
                You will see the result here automatically once finished.
              </p>
            )}

            {/* Guarded placeholder: only visible when unlocked */}
            <div
              className={
                "rounded-xl bg-[#111112] p-5 border " +
                (v2HardFailTriggered
                  ? "border-red-500/30 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
                  : "border-white/5")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">
                  {isReady ? "Analysis" : "Analysis (Placeholder)"}
                </h2>

                {v2HardFailTriggered ? (
                  <span className="text-[10px] px-2 py-1 rounded-full border border-red-400/30 bg-red-500/10 text-red-200 font-semibold tracking-wide">
                    HARD FAIL
                  </span>
                ) : null}
              </div>
              {isReady ? (
                <p className="text-white/60 text-sm mt-2">
                  This analysis is generated by AI and is tied to this exact audio file.
                </p>
              ) : (
                <p className="text-white/60 text-sm mt-2">
                  Issues, metrics, and recommendations will appear here once the analyzer provides real data.
                </p>
              )}

              <div className="mt-4 grid gap-3">
                <IssuesPanel
                  isReady={isReady}
                  issues={issues}
                  topSummaryText={topSummaryText}
                  summaryBanner={
                    (() => {
                      const s = renderAnalysisStatusBanner(payload as any);
                      return (
                        <div className="flex items-center justify-between gap-3">
                          <span className={"text-[10px] px-2 py-0.5 rounded-full border " + s.badgeClass}>
                            {s.badge}
                          </span>
                          <span className="text-xs text-white/70">{s.text}</span>
                        </div>
                      );
                    })()
                  }
                />

                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  {isReady ? (
                    schemaVersion === 2 ? (
                      <V2MetricsGrid
                        isReady={isReady}
                        payload={payload}
                        v2Highlights={v2Highlights}
                        v2HardFailTriggered={v2HardFailTriggered}
                        v2HardFailReasons={v2HardFailReasons}
                        v2LufsI={v2LufsI}
                        v2TruePeak={v2TruePeak}
                        v2DurationS={v2DurationS}
                        v2TruePeakOvers={v2TruePeakOvers}
                        v2PunchIndex={v2PunchIndex}
                        v2P95ShortCrest={v2P95ShortCrest}
                        v2MeanShortCrest={v2MeanShortCrest}
                        v2TransientDensity={v2TransientDensity}
                        recommendations={recommendations}
                      />
                    ) : (
                      // v1 legacy fallback (flat metrics)
                      Object.keys(metrics).length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {Object.entries(metrics)
                            .slice(0, 12)
                            .map(([k, v]) => (
                              <div
                                key={k}
                                className="flex items-center justify-between gap-4 rounded-lg bg-black/20 p-3 border border-white/5"
                              >
                                <span className="text-xs text-white/70">{k}</span>
                                <span className="text-xs text-white/50 tabular-nums">
                                  {v === null || v === undefined ? "—" : String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-white/50 text-xs mt-2">No metrics</p>
                      )
                    )
                  ) : (
                    <p className="text-white/50 text-xs mt-1">No data yet</p>
                  )}
                </div>

                <RecommendationsPanel
                  isReady={isReady}
                  schemaVersion={schemaVersion}
                  v2Recommendations={v2Recommendations}
                  recommendations={recommendations}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/70 mt-4">
            Detailed AI feedback is locked. Unlock to view the full analysis for this upload.
          </p>
        )}

        <UnlockPanel
          unlocked={!unlocked ? false : true}
          error={error}
          creditBalance={creditBalance}
          queueId={queueId}
          unlockPaidFeedbackAction={unlockPaidFeedbackAction}
        />
      </div>
    </div>
  );
}
