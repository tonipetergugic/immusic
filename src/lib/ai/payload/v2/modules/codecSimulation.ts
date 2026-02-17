import { recommendedLimiterCeilingTextV1 } from "@/lib/ai/payload/v2/modules/headroomEngineering";

export function distortionRiskFromCodecSim(codecSim: any): { highlight: string; severity: "info" | "warn" } | null {
  if (!codecSim) return null;

  const aacRisk =
    codecSim?.aac128?.distortion_risk === "low" ||
    codecSim?.aac128?.distortion_risk === "moderate" ||
    codecSim?.aac128?.distortion_risk === "high"
      ? codecSim.aac128.distortion_risk
      : null;

  const mp3Risk =
    codecSim?.mp3128?.distortion_risk === "low" ||
    codecSim?.mp3128?.distortion_risk === "moderate" ||
    codecSim?.mp3128?.distortion_risk === "high"
      ? codecSim.mp3128.distortion_risk
      : null;

  if (aacRisk === null && mp3Risk === null) return null;

  const rank = (r: "low" | "moderate" | "high" | null): number =>
    r === "high" ? 3 : r === "moderate" ? 2 : r === "low" ? 1 : 0;

  const worstRank = Math.max(rank(aacRisk), rank(mp3Risk));

  const worstLabel =
    worstRank === 3 ? "HIGH" : worstRank === 2 ? "MODERATE" : "LOW";

  const severity: "info" | "warn" = worstRank >= 3 ? "warn" : "info";

  const aacTxt = aacRisk ? `AAC 128: ${aacRisk.toUpperCase()}` : "AAC 128: —";
  const mp3Txt = mp3Risk ? `MP3 128: ${mp3Risk.toUpperCase()}` : "MP3 128: —";

  const tip = recommendedLimiterCeilingTextV1(codecSim);

  return {
    severity,
    highlight: tip
      ? `Codec distortion risk (${worstLabel}) — ${aacTxt}, ${mp3Txt}. ${tip}`
      : `Codec distortion risk (${worstLabel}) — ${aacTxt}, ${mp3Txt}.`,
  };
}
