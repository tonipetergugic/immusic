import { renderAnalysisStatusBanner, deriveHeroChips, deriveJourney } from "./feedbackDerivations";

export type FeedbackV3PageState = {
  banner: ReturnType<typeof renderAnalysisStatusBanner>;
  heroChips: ReturnType<typeof deriveHeroChips>;
  journey: ReturnType<typeof deriveJourney>;
};

export function deriveFeedbackV3PageState(params: {
  payload: any;
  isReady: boolean;
}): FeedbackV3PageState {
  const { payload, isReady } = params;

  const banner = renderAnalysisStatusBanner(payload);
  const heroChips = deriveHeroChips(payload, isReady);
  const journey = deriveJourney(payload, isReady);

  return { banner, heroChips, journey };
}
