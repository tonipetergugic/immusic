import DevExposePayload from "./components/DevExposePayload";
import EngineeringCore from "./components/EngineeringCore";
import EngineeringDynamics from "./components/EngineeringDynamics";
import HeroSection from "./components/HeroSection";
import JourneySection from "./components/JourneySection";
import LimiterStressCard from "./components/LimiterStressCard";
import LockedFeedbackSection from "./components/LockedFeedbackSection";
import LowEndMonoStabilityCard from "./components/LowEndMonoStabilityCard";
import MidSideCard from "./components/MidSideCard";
import PhaseCorrelationCard from "./components/PhaseCorrelationCard";
import ShortTermLufsChart from "./components/ShortTermLufsChart";
import SpectralRmsCard from "./components/SpectralRmsCard";
import StreamingNormalization from "./components/StreamingNormalization";
import SuggestedImprovementsSection from "./components/SuggestedImprovementsSection";
import TransientsPanel from "./components/TransientsPanel";
import UnlockFooterSection from "./components/UnlockFooterSection";

import { unlockPaidFeedbackAction } from "./actions";

import { deriveEngineeringPanelProps } from "./utils/deriveEngineeringPanelProps";
import { deriveFeedbackV3PageState } from "./utils/deriveFeedbackV3PageState";
import { loadFeedbackV3Data } from "./utils/loadFeedbackV3Data";
import { logFeedbackAccessEvent } from "./utils/logFeedbackAccessEvent";

export default async function UploadFeedbackV3Page({
  searchParams,
}: {
  searchParams: Promise<{ queue_id?: string; error?: string }>;
}) {
  const loaded = await loadFeedbackV3Data({ searchParams });
  if (loaded.kind === "render") return loaded.element;

  const {
    supabase,
    userId,
    queueId,
    errorParam: error,
    creditBalance,
    data,
    unlocked,
    isReady,
    payload,
    queueTitle,
  } = loaded;

  const { banner, heroChips, journey, coachRecommendations } = deriveFeedbackV3PageState({ payload, isReady });

  await logFeedbackAccessEvent({
    supabase,
    userId,
    queueId,
    unlocked,
    creditBalance,
    errorParam: error,
    apiStatus: data.feedback_state,
  });

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      {/* Fullscreen V3 skeleton — no max-width container on purpose */}
      <div className="w-full">
        {/* HERO (Fullscreen area) */}
        <HeroSection
          queueTitle={queueTitle}
          banner={banner}
          heroChips={heroChips}
        />

        {/* CONTENT */}
        <main className="px-6 pb-16">
          {!unlocked ? (
            <LockedFeedbackSection
              error={error}
              creditBalance={creditBalance}
              queueId={queueId}
              unlockPaidFeedbackAction={unlockPaidFeedbackAction}
            />
          ) : (
            <div className="mt-6 space-y-10">
              <DevExposePayload payload={payload} />
              <JourneySection payload={payload} isReady={isReady} journey={journey} />

              <div className="space-y-6">
                {/* Engineering full width */}
                <EngineeringCore
                  isReady={isReady}
                  payload={payload}
                  lufsI={payload?.metrics?.loudness?.lufs_i ?? null}
                  truePeak={payload?.metrics?.loudness?.true_peak_dbtp_max ?? null}
                  durationS={payload?.track?.duration_s ?? payload?.track?.duration ?? null}
                />

                <ShortTermLufsChart
                  timeline={payload?.metrics?.loudness?.short_term_lufs_timeline ?? null}
                  integratedLufs={payload?.metrics?.loudness?.lufs_i ?? null}
                />

                <TransientsPanel
                  attackStrength={payload?.metrics?.transients?.attack_strength_0_100 ?? null}
                  transientDensity={payload?.metrics?.transients?.transient_density ?? null}
                  crestFactorDb={payload?.metrics?.dynamics?.crest_factor_db ?? null}
                  p95ShortCrestDb={payload?.metrics?.transients?.p95_short_crest_db ?? null}
                  meanShortCrestDb={payload?.metrics?.transients?.mean_short_crest_db ?? null}
                  transientDensityCv={payload?.metrics?.transients?.transient_density_cv ?? null}
                />

                <PhaseCorrelationCard value={payload?.metrics?.stereo?.phase_correlation ?? null} />

                <MidSideCard
                  midRmsDbfs={payload?.metrics?.stereo?.mid_rms_dbfs ?? null}
                  sideRmsDbfs={payload?.metrics?.stereo?.side_rms_dbfs ?? null}
                  ratio={payload?.metrics?.stereo?.mid_side_energy_ratio ?? null}
                />

<LowEndMonoStabilityCard
  phaseCorr20_120={payload?.metrics?.low_end?.phase_correlation_20_120 ?? null}
  monoLossPct20_120={payload?.metrics?.low_end?.mono_energy_loss_pct_20_120 ?? null}
  phaseCorr20_60={payload?.metrics?.low_end?.phase_correlation_20_60 ?? null}
  phaseCorr60_120={payload?.metrics?.low_end?.phase_correlation_60_120 ?? null}
/>

                <SpectralRmsCard spectral={payload?.metrics?.spectral ?? null} />

                <LimiterStressCard
                  durationS={payload?.track?.duration_s ?? null}
                  truePeakOvers={payload?.events?.loudness?.true_peak_overs ?? null}
                />

                {/* Dynamics + Streaming side by side */}
                <div className="grid gap-6 lg:grid-cols-2 items-stretch">
                  <EngineeringDynamics payload={payload} isReady={isReady} />
                  <StreamingNormalization payload={payload} isReady={isReady} />
                </div>
              </div>

              <SuggestedImprovementsSection coachRecommendations={coachRecommendations} />

              {/* Unlock panel (still shown for errors/balance; unlocked=true) */}
              <UnlockFooterSection
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
