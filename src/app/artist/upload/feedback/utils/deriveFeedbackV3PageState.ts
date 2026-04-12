import { renderAnalysisStatusBanner, deriveHeroChips, deriveJourney } from "./feedbackDerivations";

export type FeedbackV3PageState = {
  banner: ReturnType<typeof renderAnalysisStatusBanner>;
  heroChips: ReturnType<typeof deriveHeroChips>;
  journey: ReturnType<typeof deriveJourney>;
  coachRecommendations: string[];
};

export function deriveFeedbackV3PageState(params: {
  payload: any;
  isReady: boolean;
}): FeedbackV3PageState {
  const { payload, isReady } = params;

  const banner = renderAnalysisStatusBanner(payload);
  const heroChips = deriveHeroChips(payload, isReady);
  const journey = deriveJourney(payload, isReady);

  // Coach-style Recommendations (top 5 max)
  const coachRecommendations = (() => {
    const recs = Array.isArray(payload?.recommendations) ? payload.recommendations : [];

    return recs
      .filter((r: any) => r && typeof r === "object")
      .slice(0, 5)
      .map((r: any) => {
        const parts = [
          typeof r.title === "string" ? r.title.trim() : "",
          typeof r.why === "string" ? r.why.trim() : "",
          Array.isArray(r.how)
            ? r.how.filter((item: unknown) => typeof item === "string" && item.trim().length > 0).join(" ")
            : "",
        ].filter((part) => part.length > 0);

        return parts.join(" — ");
      })
      .filter((text: string) => text.length > 0);
  })();

  return { banner, heroChips, journey, coachRecommendations };
}
