import React from "react";

type Props = {
  coachRecommendations: string[];
};

export default function SuggestedImprovementsSection({ coachRecommendations }: Props) {
  if (!coachRecommendations || coachRecommendations.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[rgba(0,255,198,0.15)] flex items-center justify-center text-[12px] font-semibold text-[rgb(0,255,198)]">
            AI
          </div>
          <div>
            <div className="text-base font-semibold text-white/90">Suggested Improvements</div>
            <div className="text-xs text-white/45">Actionable suggestions based on your current analysis.</div>
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
  );
}
