import BackLink from "@/components/BackLink";
import { unlockPaidFeedbackAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

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
        <div className="max-w-2xl mx-auto px-6 py-10">
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
          <div className="max-w-2xl mx-auto px-6 py-10">
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

  // v2 metrics are nested (objects). We only render known leaf values for now.
  const v2Loudness = schemaVersion === 2 ? (metrics as any)?.loudness : null;

  const v2LufsI = safeNumber(v2Loudness?.lufs_i);
  const v2TruePeak = safeNumber(v2Loudness?.true_peak_dbtp_max);

  const v2Recommendations = schemaVersion === 2 && Array.isArray((payload as any)?.recommendations)
    ? ((payload as any).recommendations as any[])
    : [];

  function formatTime(sec: number) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function safeString(v: unknown) {
    return typeof v === "string" ? v : "";
  }

  function safeNumber(v: unknown) {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

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
      <div className="max-w-2xl mx-auto px-6 py-10">
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
              <>
                <p className="text-white/70">
                  Unlocked – analysis is being prepared. This may take a few minutes.
                </p>
                <p className="text-white/40 text-sm">
                  You can leave this page and come back later. Access stays unlocked for this exact audio file.
                </p>
              </>
            )}

            {/* Guarded placeholder: only visible when unlocked */}
            <div className="rounded-xl bg-[#111112] p-5 border border-white/5">
              <h2 className="text-base font-semibold">
                {isReady ? "Analysis" : "Analysis (Placeholder)"}
              </h2>
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
                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  {isReady ? (
                    issues.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {issues.slice(0, 10).map((it: any, idx: number) => {
                          const t = safeNumber(it?.t);
                          const title = safeString(it?.title) || "Issue";
                          const detail = safeString(it?.detail);
                          const sev = safeString(it?.severity);
                          return (
                            <li
                              key={idx}
                              className="rounded-lg bg-black/20 p-3 border border-white/5"
                            >
                              <div className="flex items-center gap-2">
                                {t !== null && (
                                  <span className="text-xs text-white/50 tabular-nums">
                                    {formatTime(t)}
                                  </span>
                                )}
                                <span className="text-sm text-white/80 font-medium">
                                  {title}
                                </span>
                                {sev && (
                                  <span className="ml-auto text-xs text-white/40">
                                    {sev}
                                  </span>
                                )}
                              </div>
                              {detail ? (
                                <p className="text-xs text-white/60 mt-1">{detail}</p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-white/50 text-xs mt-2">No issues found</p>
                    )
                  ) : (
                    <p className="text-white/50 text-xs mt-1">No data yet</p>
                  )}
                </div>

                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  {isReady ? (
                    schemaVersion === 2 ? (
                      <div className="mt-2 space-y-2">
                        {/* v2 Highlights (short, human) */}
                        {v2Highlights.length > 0 ? (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5">
                            <div className="text-xs text-white/70 mb-2">Highlights</div>
                            <ul className="space-y-1">
                              {v2Highlights.slice(0, 5).map((h, idx) => (
                                <li key={idx} className="text-xs text-white/60">
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* v2 Loudness (known leaf metrics) */}
                        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                          <span className="text-xs text-white/70">Integrated LUFS</span>
                          <span className="text-xs text-white/50 tabular-nums">
                            {v2LufsI === null ? "—" : v2LufsI.toFixed(1)}
                          </span>
                        </div>

                        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                          <span className="text-xs text-white/70">True Peak (dBTP max)</span>
                          <span className="text-xs text-white/50 tabular-nums">
                            {v2TruePeak === null ? "—" : v2TruePeak.toFixed(2)}
                          </span>
                        </div>

                        {typeof (payload as any)?.metrics?.dynamics?.crest_factor_db === "number" && (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/70">Crest Factor (dB)</span>
                            <span className="text-xs text-white/50 tabular-nums">
                              {(payload as any).metrics.dynamics.crest_factor_db.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {typeof (payload as any)?.metrics?.stereo?.phase_correlation === "number" && (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/70">Phase Correlation</span>
                            <div className="flex items-center gap-2">
                              {(payload as any).metrics.stereo.phase_correlation < -0.2 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-500/10 text-red-200">
                                  CRITICAL
                                </span>
                              ) : (payload as any).metrics.stereo.phase_correlation < 0 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                                  WARN
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                                  OK
                                </span>
                              )}

                              <span
                                className={
                                  "text-xs tabular-nums " +
                                  ((payload as any).metrics.stereo.phase_correlation < -0.2
                                    ? "text-red-300"
                                    : (payload as any).metrics.stereo.phase_correlation < 0
                                    ? "text-yellow-300"
                                    : "text-white/50")
                                }
                              >
                                {(payload as any).metrics.stereo.phase_correlation.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {typeof (payload as any)?.metrics?.stereo?.stereo_width_index === "number" && (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/70">Stereo Width Index</span>
                            <div className="flex items-center gap-2">
                              {(payload as any).metrics.stereo.stereo_width_index > 0.6 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                                  WARN
                                </span>
                              ) : (payload as any).metrics.stereo.stereo_width_index < 0.05 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                                  INFO
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                                  OK
                                </span>
                              )}

                              <span className="text-xs tabular-nums text-white/50">
                                {(payload as any).metrics.stereo.stereo_width_index.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {(typeof (payload as any)?.metrics?.stereo?.mid_rms_dbfs === "number" ||
                          typeof (payload as any)?.metrics?.stereo?.side_rms_dbfs === "number" ||
                          typeof (payload as any)?.metrics?.stereo?.mid_side_energy_ratio === "number") && (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70">Mid/Side</span>
                              {typeof (payload as any)?.metrics?.stereo?.mid_side_energy_ratio === "number" ? (
                                <span className="flex items-center gap-2 text-xs tabular-nums">
                                  {(payload as any).metrics.stereo.mid_side_energy_ratio > 1.0 ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                                      WARN
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                                      OK
                                    </span>
                                  )}
                                  <span className="text-white/50">
                                    Ratio {(payload as any).metrics.stereo.mid_side_energy_ratio.toFixed(2)}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xs text-white/50 tabular-nums">—</span>
                              )}
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
                                <span className="text-[11px] text-white/60">Mid RMS</span>
                                <span className="text-[11px] text-white/50 tabular-nums">
                                  {typeof (payload as any)?.metrics?.stereo?.mid_rms_dbfs === "number"
                                    ? `${(payload as any).metrics.stereo.mid_rms_dbfs.toFixed(1)} dBFS`
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
                                <span className="text-[11px] text-white/60">Side RMS</span>
                                <span className="text-[11px] text-white/50 tabular-nums">
                                  {typeof (payload as any)?.metrics?.stereo?.side_rms_dbfs === "number"
                                    ? `${(payload as any).metrics.stereo.side_rms_dbfs.toFixed(1)} dBFS`
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {typeof (payload as any)?.metrics?.clipping?.clipped_sample_count === "number" && (
                          <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/70">Clipping</span>
                            <span className="text-xs text-white/50 tabular-nums">
                              {(payload as any).metrics.clipping.clipped_sample_count === 0
                                ? "No clipping detected"
                                : `${(payload as any).metrics.clipping.clipped_sample_count} clipped samples`}
                            </span>
                          </div>
                        )}

                        {/* Placeholder for upcoming modules */}
                        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
                          <p className="text-xs text-white/50">
                            More technical modules coming next (spectral, stereo, dynamics, transients).
                          </p>
                        </div>
                      </div>
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

                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  {isReady ? (
                    schemaVersion === 2 ? (
                      v2Recommendations.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {v2Recommendations.slice(0, 10).map((it: any, idx: number) => {
                            const title = safeString(it?.title) || "Recommendation";
                            const why = safeString(it?.why);
                            const howArr = Array.isArray(it?.how) ? (it.how as any[]) : [];
                            const how = howArr.map((x) => safeString(x)).filter(Boolean);

                            return (
                              <li
                                key={idx}
                                className="rounded-lg bg-black/20 p-3 border border-white/5"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-white/80 font-medium">{title}</div>
                                  {typeof it?.severity === "string" ? (
                                    <span
                                      className={
                                        "text-[10px] px-2 py-0.5 rounded-full border " +
                                        (it.severity === "critical"
                                          ? "border-red-400/30 bg-red-500/10 text-red-200"
                                          : it.severity === "warn"
                                          ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-200"
                                          : "border-white/10 bg-white/5 text-white/60")
                                      }
                                    >
                                      {String(it.severity).toUpperCase()}
                                    </span>
                                  ) : null}
                                </div>

                                {why ? (
                                  <p className="text-xs text-white/60 mt-1">{why}</p>
                                ) : null}

                                {how.length > 0 ? (
                                  <ul className="mt-2 space-y-1">
                                    {how.slice(0, 6).map((h, hIdx) => (
                                      <li key={hIdx} className="text-xs text-white/55">
                                        • {h}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-white/50 text-xs mt-2">No recommendations</p>
                      )
                    ) : (
                      // v1 legacy fallback
                      recommendations.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {recommendations.slice(0, 10).map((it: any, idx: number) => {
                            const title = safeString(it?.title) || "Recommendation";
                            const detail = safeString(it?.detail);
                            return (
                              <li
                                key={idx}
                                className="rounded-lg bg-black/20 p-3 border border-white/5"
                              >
                                <span className="text-sm text-white/80 font-medium">{title}</span>
                                {detail ? (
                                  <p className="text-xs text-white/60 mt-1">{detail}</p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-white/50 text-xs mt-2">No recommendations</p>
                      )
                    )
                  ) : (
                    <p className="text-white/50 text-xs mt-1">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/70 mt-4">
            Without paid feedback we do not show details, metrics, or reasons.
          </p>
        )}

        {!unlocked && error === "insufficient_credits" && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <p className="text-red-200 font-medium">Not enough credits.</p>
            <p className="text-red-200/80 text-sm mt-1">
              You need at least 1 credit to unlock this feedback.
            </p>
          </div>
        )}

        {error === "missing_queue_id" && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <p className="text-red-200 font-medium">Missing queue_id.</p>
          </div>
        )}

        {!unlocked ? (
          creditBalance <= 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-lg font-semibold text-white">No credits available</div>
              <p className="mt-2 text-sm text-white/60">
                You currently have 0 credits. Detailed AI feedback requires 1 credit.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold opacity-50 cursor-not-allowed"
                >
                  Credits kaufen
                </button>
                <Link
                  href="/artist/my-tracks"
                  className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] inline-flex items-center justify-center text-center"
                >
                  Back to My Tracks
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-[#111112] p-5">
              <p className="text-white/80 font-semibold">Unlock required</p>
              <p className="text-white/70 mt-1">
                Unlock detailed AI feedback for this upload using 1 credit.
              </p>
              <p className="text-white/80 mt-3">
                Cost: <span className="font-semibold text-white">1 credit</span>
                <span className="text-white/40 text-sm ml-2">
                  (Your balance: {creditBalance})
                </span>
              </p>

              <form action={unlockPaidFeedbackAction} className="mt-4">
                <input type="hidden" name="queue_id" value={queueId} />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                >
                  Unlock (1 credit)
                </button>
              </form>
            </div>
          )
        ) : (
          <div className="mt-6 rounded-xl bg-[#111112] p-5 border border-white/5">
            <p className="text-white/80 font-semibold">Feedback unlocked</p>
            <p className="text-white/70 mt-1">
              This feedback has already been unlocked. Your current credit balance does not affect access.
            </p>
            <p className="text-white/50 mt-2 text-sm">
              Credits are required for unlocking additional AI feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
