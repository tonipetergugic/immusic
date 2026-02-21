import EngineeringPanel from "./components/EngineeringPanel";
import HeroSection from "./components/HeroSection";
import JourneySection from "./components/JourneySection";
import LockedFeedbackSection from "./components/LockedFeedbackSection";
import PerformanceSection from "./components/PerformanceSection";
import SuggestedImprovementsSection from "./components/SuggestedImprovementsSection";
import UnlockFooterSection from "./components/UnlockFooterSection";

import { unlockPaidFeedbackAction } from "../actions";

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

  // DEV ONLY: expose payload in browser console
  if (typeof window !== "undefined") {
    (window as any).__fbPayload = payload;
  }

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
              <JourneySection payload={payload} isReady={isReady} journey={journey} />

              <PerformanceSection payload={payload} isReady={isReady} />

              <SuggestedImprovementsSection coachRecommendations={coachRecommendations} />

              {/* Engineering (always visible) */}
              <EngineeringPanel {...deriveEngineeringPanelProps({ payload, isReady })} />

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
