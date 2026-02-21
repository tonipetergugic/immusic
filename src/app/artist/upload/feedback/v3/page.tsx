import BackLink from "@/components/BackLink";
import HeroSection from "./components/HeroSection";
import JourneySection from "./components/JourneySection";
import PerformanceSection from "./components/PerformanceSection";
import EngineeringPanel from "./components/EngineeringPanel";
import UnlockPanelSection from "./components/UnlockPanelSection";
import UnlockPanelLockedSection from "./components/UnlockPanelLockedSection";
import { unlockPaidFeedbackAction } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  renderAnalysisStatusBanner,
  findFirst,
  deriveHeroChips,
  deriveJourney,
  deriveWaveformSeriesFromShortTermLufs,
  clamp01,
  resampleLinear,
  shapeWaveAmp,
  deriveDropImpactCard,
  confidenceLabel,
  sampleEnergyWindow,
  deriveStructureBalanceCard,
  deriveArrangementDensityCard,
} from "./utils/feedbackDerivations";

export default async function UploadFeedbackV3Page({
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

  if (!user) redirect("/login");

  const { data: creditRow, error: creditErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (creditErr) throw new Error(`Failed to load credit balance: ${creditErr.message}`);

  const creditBalance = typeof creditRow?.balance === "number" ? creditRow.balance : 0;

  if (!queueId) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-white">
        <div className="w-full px-6 py-10">
          <BackLink href="/artist/upload/processing" label="Back" />
          <h1 className="mt-6 text-2xl font-bold">Feedback</h1>
          <p className="mt-2 text-white/70">
            Missing parameter: <span className="font-semibold text-white">queue_id</span>
          </p>
        </div>
      </div>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Failed to resolve host for feedback API.");

  const cookieHeader = (await cookies()).toString();

  const res = await fetch(
    `${proto}://${host}/api/ai/track-check/feedback?queue_id=${encodeURIComponent(queueId)}`,
    { cache: "no-store", headers: { cookie: cookieHeader } }
  );

  if (!res.ok) throw new Error(`Feedback API request failed: ${res.status}`);

  const data = (await res.json()) as
    | {
        ok: true;
        queue_id: string;
        queue_title: string | null;
        feedback_state: "locked" | "unlocked_pending" | "unlocked_ready";
        status: "locked" | "unlocked_no_data" | "unlocked_ready";
        unlocked: boolean;
        payload: null | {
          schema_version?: number;
          summary?: { highlights?: string[]; severity?: "info" | "warn" | "critical" };
          hard_fail?: { triggered?: boolean; reasons?: any[] };
          metrics?: any;
          recommendations?: any[];
          track?: { duration_s?: number; decision?: string };
          events?: any;
        };
      }
    | { ok: false; error: string };

  if (!data || data.ok !== true) {
    if (data && data.ok === false && data.error === "not_found") {
      return (
        <div className="min-h-screen bg-[#0E0E10] text-white">
          <div className="w-full px-6 py-10">
            <BackLink href="/artist/upload/processing" label="Back" />
            <h1 className="mt-6 text-2xl font-bold">Feedback</h1>
            <p className="mt-2 text-white/70">Not found.</p>
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

  const banner = renderAnalysisStatusBanner(payload);
  const heroChips = deriveHeroChips(payload, isReady);
  const journey = deriveJourney(payload, isReady);

  // Engineering (V2) — null-safe derivation for reuse inside the collapsible
  const v2Highlights = Array.isArray((payload as any)?.summary?.highlights)
    ? ((payload as any).summary.highlights as any[]).filter((x) => typeof x === "string")
    : [];

  const v2HardFailTriggered = !!(payload as any)?.hard_fail?.triggered;
  const v2HardFailReasons = Array.isArray((payload as any)?.hard_fail?.reasons) ? (payload as any).hard_fail.reasons : [];

  const v2LufsI =
    typeof (payload as any)?.metrics?.lufs?.integrated === "number" && Number.isFinite((payload as any).metrics.lufs.integrated)
      ? (payload as any).metrics.lufs.integrated
      : null;

  const v2TruePeak =
    typeof (payload as any)?.metrics?.true_peak?.dbtp === "number" && Number.isFinite((payload as any).metrics.true_peak.dbtp)
      ? (payload as any).metrics.true_peak.dbtp
      : null;

  const headroomSourceDb =
    typeof v2TruePeak === "number" && Number.isFinite(v2TruePeak) ? 0.0 - v2TruePeak : null;

  const headroomBadge =
    headroomSourceDb === null
      ? null
      : headroomSourceDb <= 0.10
        ? { label: "CRITICAL", cls: "border-red-400/30 bg-red-500/10 text-red-200" }
        : headroomSourceDb <= 0.30
          ? { label: "WARN", cls: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200" }
          : { label: "OK", cls: "border-white/10 bg-white/5 text-white/60" };

  const norm = (payload as any)?.metrics?.streaming_normalization ?? null;

  const normSpotifyGain =
    typeof norm?.spotify?.gain_db === "number" ? norm.spotify.gain_db : null;
  const normSpotifyDesired =
    typeof norm?.spotify?.desired_gain_db === "number" ? norm.spotify.desired_gain_db : null;

  const normYoutubeGain =
    typeof norm?.youtube?.gain_db === "number" ? norm.youtube.gain_db : null;

  const normAppleGain =
    typeof norm?.apple_music?.gain_db === "number" ? norm.apple_music.gain_db : null;
  const normAppleUpCap =
    typeof norm?.apple_music?.up_capped_by_headroom_db === "number"
      ? norm.apple_music.up_capped_by_headroom_db
      : null;

  const v2DurationS =
    typeof (payload as any)?.track?.duration_s === "number" && Number.isFinite((payload as any).track.duration_s)
      ? (payload as any).track.duration_s
      : null;

  const v2TruePeakOvers = Array.isArray((payload as any)?.metrics?.true_peak?.overs)
    ? (payload as any).metrics.true_peak.overs
    : null;

  const v2PunchIndex =
    typeof (payload as any)?.metrics?.transients?.punch_index === "number" &&
    Number.isFinite((payload as any).metrics.transients.punch_index)
      ? (payload as any).metrics.transients.punch_index
      : null;

  const v2P95ShortCrest =
    typeof (payload as any)?.metrics?.crest?.short_term_p95 === "number" &&
    Number.isFinite((payload as any).metrics.crest.short_term_p95)
      ? (payload as any).metrics.crest.short_term_p95
      : null;

  const v2MeanShortCrest =
    typeof (payload as any)?.metrics?.crest?.short_term_mean === "number" &&
    Number.isFinite((payload as any).metrics.crest.short_term_mean)
      ? (payload as any).metrics.crest.short_term_mean
      : null;

  const v2TransientDensity =
    typeof (payload as any)?.track?.private_metrics?.transient_density === "number" &&
    Number.isFinite((payload as any).track.private_metrics.transient_density)
      ? (payload as any).track.private_metrics.transient_density
      : null;

  const v2Recommendations = Array.isArray((payload as any)?.recommendations) ? (payload as any).recommendations : [];

  // Coach-style Recommendations (top 5 max)
  const coachRecommendations =
    Array.isArray(v2Recommendations)
      ? v2Recommendations
          .filter((r: any) => r && typeof r === "object" && typeof r.text === "string")
          .slice(0, 5)
          .map((r: any) => r.text.trim())
      : [];

  // Observability (rein beobachtend, darf niemals den Flow brechen)
  let queueAudioHash: string | null = null;
  try {
    const { data: qh, error: qhErr } = await supabase
      .from("tracks_ai_queue")
      .select("audio_hash")
      .eq("id", queueId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!qhErr) queueAudioHash = (qh as any)?.audio_hash ?? null;
  } catch {
    // ignore
  }

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
      source: "UploadFeedbackV3Page",
      api_status: data.feedback_state,
      credit_balance: creditBalance,
      error_param: error || null,
    },
  });

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      {/* Fullscreen V3 skeleton — no max-width container on purpose */}
      <div className="w-full">
        {/* Top-left back */}
        <div className="px-6 pt-8">
          <BackLink href="/artist/upload/processing" label="Back" />
        </div>

        {/* HERO (Fullscreen area) */}
        <HeroSection
          queueTitle={queueTitle}
          banner={banner}
          heroChips={heroChips}
        />

        {/* CONTENT */}
        <main className="px-6 pb-16">
          {!unlocked ? (
            <div className="mt-6">
              <p className="text-white/70">
                Detailed AI feedback is locked. Unlock to view the full analysis for this upload.
              </p>

              <div className="mt-6">
                <UnlockPanelLockedSection
                  unlocked={false}
                  error={error}
                  creditBalance={creditBalance}
                  queueId={queueId}
                  unlockPaidFeedbackAction={unlockPaidFeedbackAction}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              <JourneySection
                payload={payload}
                isReady={isReady}
                journey={journey}
                deriveWaveformSeriesFromShortTermLufs={deriveWaveformSeriesFromShortTermLufs}
                resampleLinear={resampleLinear}
                shapeWaveAmp={shapeWaveAmp}
                findFirst={findFirst}
              />

              <PerformanceSection
                payload={payload}
                isReady={isReady}
                deriveDropImpactCard={deriveDropImpactCard}
                findFirst={findFirst}
                sampleEnergyWindow={sampleEnergyWindow}
                confidenceLabel={confidenceLabel}
                clamp01={clamp01}
                shapeWaveAmp={shapeWaveAmp}
                deriveStructureBalanceCard={deriveStructureBalanceCard}
                deriveArrangementDensityCard={deriveArrangementDensityCard}
              />

              {/* Suggested Improvements */}
              {coachRecommendations.length > 0 && (
                <section className="mt-10">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgba(0,255,198,0.15)] flex items-center justify-center text-[12px] font-semibold text-[rgb(0,255,198)]">
                        AI
                      </div>
                      <div>
                        <div className="text-base font-semibold text-white/90">
                          Suggested Improvements
                        </div>
                        <div className="text-xs text-white/45">
                          Actionable suggestions based on your current analysis.
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {coachRecommendations.map((text, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75"
                        >
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Engineering (always visible) */}
              <EngineeringPanel
                isReady={isReady}
                v2LufsI={v2LufsI}
                v2TruePeak={v2TruePeak}
                v2DurationS={v2DurationS}
                v2TransientDensity={v2TransientDensity}
                v2PunchIndex={v2PunchIndex}
                v2P95ShortCrest={v2P95ShortCrest}
                v2MeanShortCrest={v2MeanShortCrest}
                headroomSourceDb={headroomSourceDb}
                headroomBadge={headroomBadge}
                normSpotifyGain={normSpotifyGain}
                normSpotifyDesired={normSpotifyDesired}
                normYoutubeGain={normYoutubeGain}
                normAppleGain={normAppleGain}
                normAppleUpCap={normAppleUpCap}
              />

              {/* Unlock panel (still shown for errors/balance; unlocked=true) */}
              <UnlockPanelSection
                error={error}
                creditBalance={creditBalance}
                queueId={queueId}
                unlockPaidFeedbackAction={unlockPaidFeedbackAction}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
