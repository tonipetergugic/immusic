import Link from "next/link";
import { MeterSection } from "@/components/decision-center/meters/MeterSection";
import { LowEndMonoMeterCard } from "@/components/decision-center/meters/LowEndMonoMeterCard";
import { LimiterStressMeterCard } from "@/components/decision-center/meters/LimiterStressMeterCard";
import { PhaseCorrelationMeterCard } from "@/components/decision-center/meters/PhaseCorrelationMeterCard";
import { StreamingRiskGaugeMeterCard } from "@/components/decision-center/meters/StreamingRiskGaugeMeterCard";
import { StreamingNormalizationMeterCard } from "@/components/decision-center/meters/StreamingNormalizationMeterCard";
import { ShortTermLufsMeterCard } from "@/components/decision-center/meters/ShortTermLufsMeterCard";
import { SpectralRmsMeterCard } from "@/components/decision-center/meters/SpectralRmsMeterCard";
import { TransientsMeterCard } from "@/components/decision-center/meters/TransientsMeterCard";
import { EngineeringDynamicsMeterCard } from "@/components/decision-center/meters/EngineeringDynamicsMeterCard";
import { MidSideMeterCard } from "@/components/decision-center/meters/MidSideMeterCard";
import { ScrollUnlock } from "../../ScrollUnlock";
import { readLocalFeedbackPageData } from "../readLocalFeedbackPageData";

/**
 * Meters page status
 *
 * Active modules:
 * - Phase Correlation
 * - Low End Mono Stability
 * - Streaming Normalization
 * - Short-Term LUFS Chart
 * - Spectral RMS
 * - Transients
 * - Limiter Stress
 * - Engineering Dynamics
 * - Streaming Risk Gauge
 * - Mid / Side Balance
 *
 * Parked modules:
 *
 * Not copied directly from the old feedback page:
 * - EngineeringCore: too broad and partly duplicated by the active meters.
 * - JourneyWaveformWithTooltip: replaced by waveform + segment timeline.
 * - FeedbackSummary: belongs to the detailed feedback page, not meters.
 *
 * Rule:
 * Do not add fake values or old payload contracts here.
 * Only render modules when the current local analysis output provides real data.
 */

type DecisionCenterLabMetersPageProps = {
  searchParams: Promise<{
    track?: string;
  }>;
};

function buildFeedbackHref(trackFolderName?: string | null) {
  if (!trackFolderName) {
    return "/artist/decision/feedback";
  }

  return `/artist/decision/feedback?track=${encodeURIComponent(
    trackFolderName,
  )}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function getNestedRecord(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function getPhaseCorrelationValue(analysis: unknown): number | null {
  const analysisRecord = asRecord(analysis);

  const directStereo = getNestedRecord(analysisRecord, "stereo");
  const directValue = readNumber(directStereo?.phase_correlation);

  if (directValue !== null) {
    return directValue;
  }

  const productPayload = getNestedRecord(analysisRecord, "product_payload");
  const productTechnicalMetrics = getNestedRecord(
    productPayload,
    "technical_metrics",
  );
  const productStereo = getNestedRecord(productTechnicalMetrics, "stereo");
  const productValue = readNumber(productStereo?.phase_correlation);

  if (productValue !== null) {
    return productValue;
  }

  const technicalMetrics = getNestedRecord(analysisRecord, "technical_metrics");
  const technicalStereo = getNestedRecord(technicalMetrics, "stereo");
  const technicalValue = readNumber(technicalStereo?.phase_correlation);

  if (technicalValue !== null) {
    return technicalValue;
  }

  const consultantInput = getNestedRecord(analysisRecord, "consultant_input");
  const consultantTechnicalMetrics = getNestedRecord(
    consultantInput,
    "technical_metrics",
  );
  const consultantStereo = getNestedRecord(
    consultantTechnicalMetrics,
    "stereo",
  );

  return readNumber(consultantStereo?.phase_correlation);
}

type LowEndMonoValues = {
  phaseCorrelationLowBand: number | null;
  monoLossLowBandPercent: number | null;
  lowBandBalanceDb: number | null;
};

function getLowEndRecord(analysis: unknown): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directLowEnd = getNestedRecord(analysisRecord, "low_end");

  if (directLowEnd) {
    return directLowEnd;
  }

  const productPayload = getNestedRecord(analysisRecord, "product_payload");
  const productTechnicalMetrics = getNestedRecord(
    productPayload,
    "technical_metrics",
  );
  const productLowEnd = getNestedRecord(productTechnicalMetrics, "low_end");

  if (productLowEnd) {
    return productLowEnd;
  }

  const technicalMetrics = getNestedRecord(analysisRecord, "technical_metrics");
  const technicalLowEnd = getNestedRecord(technicalMetrics, "low_end");

  if (technicalLowEnd) {
    return technicalLowEnd;
  }

  const consultantInput = getNestedRecord(analysisRecord, "consultant_input");
  const consultantTechnicalMetrics = getNestedRecord(
    consultantInput,
    "technical_metrics",
  );

  return getNestedRecord(consultantTechnicalMetrics, "low_end");
}

function getLowEndMonoValues(analysis: unknown): LowEndMonoValues {
  const lowEnd = getLowEndRecord(analysis);

  return {
    phaseCorrelationLowBand: readNumber(
      lowEnd?.phase_correlation_low_band,
    ),
    monoLossLowBandPercent: readNumber(
      lowEnd?.mono_loss_low_band_percent,
    ),
    lowBandBalanceDb: readNumber(lowEnd?.low_band_balance_db),
  };
}

type StreamingNormalizationValues = {
  integratedLufs: number | null;
  truePeakDbtp: number | null;
};

type ShortTermLufsPoint = {
  t: number;
  lufs: number;
};

type ShortTermLufsValues = {
  integratedLufs: number | null;
  dynamicRangeLu: number | null;
  points: ShortTermLufsPoint[];
};

type SpectralRmsValues = {
  subRmsDbfs: number | null;
  lowRmsDbfs: number | null;
  midRmsDbfs: number | null;
  highRmsDbfs: number | null;
  airRmsDbfs: number | null;
};

type TransientTimelineItem = {
  startSec: number;
  endSec: number;
  transientCount: number;
  densityPerSec: number;
  meanShortCrestDb: number | null;
  p95ShortCrestDb: number | null;
};

type TransientsValues = {
  attackStrength: number | null;
  transientDensityPerSec: number | null;
  p95ShortCrestDb: number | null;
  meanShortCrestDb: number | null;
  transientDensityCv: number | null;
  timeline: TransientTimelineItem[];
};

function getLoudnessRecord(analysis: unknown): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directLoudness = getNestedRecord(analysisRecord, "loudness");

  if (directLoudness) {
    return directLoudness;
  }

  const productPayload = getNestedRecord(analysisRecord, "product_payload");
  const productTechnicalMetrics = getNestedRecord(
    productPayload,
    "technical_metrics",
  );
  const productLoudness = getNestedRecord(productTechnicalMetrics, "loudness");

  if (productLoudness) {
    return productLoudness;
  }

  const technicalMetrics = getNestedRecord(analysisRecord, "technical_metrics");
  const technicalLoudness = getNestedRecord(technicalMetrics, "loudness");

  if (technicalLoudness) {
    return technicalLoudness;
  }

  const consultantInput = getNestedRecord(analysisRecord, "consultant_input");
  const consultantTechnicalMetrics = getNestedRecord(
    consultantInput,
    "technical_metrics",
  );

  return getNestedRecord(consultantTechnicalMetrics, "loudness");
}

function getStreamingNormalizationValues(
  analysis: unknown,
): StreamingNormalizationValues {
  const loudness = getLoudnessRecord(analysis);

  return {
    integratedLufs: readNumber(loudness?.integrated_lufs),
    truePeakDbtp: readNumber(loudness?.true_peak_dbtp),
  };
}

function getShortTermLufsValues(analysis: unknown): ShortTermLufsValues {
  const loudness = getLoudnessRecord(analysis);
  const series = asRecord(loudness?.short_term_lufs_series);
  const summary = asRecord(series?.summary);
  const rawPoints = series?.points;

  const points = Array.isArray(rawPoints)
    ? rawPoints
        .map((point) => {
          const pointRecord = asRecord(point);

          if (!pointRecord) {
            return null;
          }

          const t = readNumber(pointRecord.t);
          const lufs = readNumber(pointRecord.lufs_s);

          if (t === null || lufs === null) {
            return null;
          }

          return {
            t,
            lufs,
          };
        })
        .filter((point): point is ShortTermLufsPoint => point !== null)
    : [];

  return {
    integratedLufs: readNumber(loudness?.integrated_lufs),
    dynamicRangeLu: readNumber(summary?.dynamic_range_lu),
    points,
  };
}

type LimiterStressTimelineItem = {
  startSec: number;
  endSec: number;
  stressEventCount: number;
  maxPeakDbtp: number | null;
  risk: "low" | "medium" | "high";
};

type LimiterStressValues = {
  truePeakDbtp: number | null;
  peakDbfs: number | null;
  clippedSampleCount: number | null;
  plrLu: number | null;
  crestFactorDb: number | null;
  eventsPerMin: number | null;
  maxEventsPer10s: number | null;
  p95EventsPer10s: number | null;
  timeline: LimiterStressTimelineItem[];
};

function getDynamicsRecord(analysis: unknown): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directDynamics = getNestedRecord(analysisRecord, "dynamics");

  if (directDynamics) {
    return directDynamics;
  }

  const productPayload = getNestedRecord(analysisRecord, "product_payload");
  const productTechnicalMetrics = getNestedRecord(
    productPayload,
    "technical_metrics",
  );
  const productDynamics = getNestedRecord(productTechnicalMetrics, "dynamics");

  if (productDynamics) {
    return productDynamics;
  }

  const technicalMetrics = getNestedRecord(analysisRecord, "technical_metrics");
  const technicalDynamics = getNestedRecord(technicalMetrics, "dynamics");

  if (technicalDynamics) {
    return technicalDynamics;
  }

  const consultantInput = getNestedRecord(analysisRecord, "consultant_input");
  const consultantTechnicalMetrics = getNestedRecord(
    consultantInput,
    "technical_metrics",
  );

  return getNestedRecord(consultantTechnicalMetrics, "dynamics");
}

function getLimiterStressRecord(
  analysis: unknown,
): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  return getNestedRecord(analysisRecord, "limiter_stress");
}

function readLimiterStressRisk(value: unknown): "low" | "medium" | "high" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}

function getLimiterStressTimeline(
  limiterStress: Record<string, unknown> | null,
): LimiterStressTimelineItem[] {
  const rawTimeline = limiterStress?.timeline;

  if (!Array.isArray(rawTimeline)) {
    return [];
  }

  return rawTimeline
    .map((item) => {
      const itemRecord = asRecord(item);

      if (!itemRecord) {
        return null;
      }

      const startSec = readNumber(itemRecord.start_sec);
      const endSec = readNumber(itemRecord.end_sec);
      const stressEventCount = readNumber(itemRecord.stress_event_count);

      if (
        startSec === null ||
        endSec === null ||
        stressEventCount === null
      ) {
        return null;
      }

      return {
        startSec,
        endSec,
        stressEventCount,
        maxPeakDbtp: readNumber(itemRecord.max_peak_dbtp),
        risk: readLimiterStressRisk(itemRecord.risk),
      };
    })
    .filter((item): item is LimiterStressTimelineItem => item !== null);
}

function getLimiterStressValues(analysis: unknown): LimiterStressValues {
  const loudness = getLoudnessRecord(analysis);
  const dynamics = getDynamicsRecord(analysis);
  const limiterStress = getLimiterStressRecord(analysis);

  return {
    truePeakDbtp: readNumber(loudness?.true_peak_dbtp),
    peakDbfs: readNumber(loudness?.peak_dbfs),
    clippedSampleCount: readNumber(loudness?.clipped_sample_count),
    plrLu: readNumber(dynamics?.plr_lu),
    crestFactorDb: readNumber(dynamics?.crest_factor_db),
    eventsPerMin: readNumber(limiterStress?.events_per_min),
    maxEventsPer10s: readNumber(limiterStress?.max_events_per_10s),
    p95EventsPer10s: readNumber(limiterStress?.p95_events_per_10s),
    timeline: getLimiterStressTimeline(limiterStress),
  };
}

type EngineeringDynamicsValues = {
  integratedLufs: number | null;
  loudnessRangeLu: number | null;
  crestFactorDb: number | null;
  plrLu: number | null;
  integratedRmsDbfs: number | null;
};

function getEngineeringDynamicsValues(
  analysis: unknown,
): EngineeringDynamicsValues {
  const loudness = getLoudnessRecord(analysis);
  const dynamics = getDynamicsRecord(analysis);

  return {
    integratedLufs: readNumber(loudness?.integrated_lufs),
    loudnessRangeLu: readNumber(loudness?.loudness_range_lu),
    crestFactorDb: readNumber(dynamics?.crest_factor_db),
    plrLu: readNumber(dynamics?.plr_lu),
    integratedRmsDbfs: readNumber(dynamics?.integrated_rms_dbfs),
  };
}

type StreamingRiskGaugeValues = {
  integratedLufs: number | null;
  truePeakDbtp: number | null;
  clippedSampleCount: number | null;
  peakDbfs: number | null;
};

function getStreamingRiskGaugeValues(
  analysis: unknown,
): StreamingRiskGaugeValues {
  const loudness = getLoudnessRecord(analysis);

  return {
    integratedLufs: readNumber(loudness?.integrated_lufs),
    truePeakDbtp: readNumber(loudness?.true_peak_dbtp),
    clippedSampleCount: readNumber(loudness?.clipped_sample_count),
    peakDbfs: readNumber(loudness?.peak_dbfs),
  };
}

type MidSideValues = {
  stereoWidth: number | null;
  sideMidRatio: number | null;
  phaseCorrelation: number | null;
};

function getStereoRecord(analysis: unknown): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directStereo = getNestedRecord(analysisRecord, "stereo");

  if (directStereo) {
    return directStereo;
  }

  const productPayload = getNestedRecord(analysisRecord, "product_payload");
  const productTechnicalMetrics = getNestedRecord(
    productPayload,
    "technical_metrics",
  );
  const productStereo = getNestedRecord(productTechnicalMetrics, "stereo");

  if (productStereo) {
    return productStereo;
  }

  const technicalMetrics = getNestedRecord(analysisRecord, "technical_metrics");
  const technicalStereo = getNestedRecord(technicalMetrics, "stereo");

  if (technicalStereo) {
    return technicalStereo;
  }

  const consultantInput = getNestedRecord(analysisRecord, "consultant_input");
  const consultantTechnicalMetrics = getNestedRecord(
    consultantInput,
    "technical_metrics",
  );

  return getNestedRecord(consultantTechnicalMetrics, "stereo");
}

function getMidSideValues(analysis: unknown): MidSideValues {
  const stereo = getStereoRecord(analysis);

  return {
    stereoWidth: readNumber(stereo?.stereo_width),
    sideMidRatio: readNumber(stereo?.side_mid_ratio),
    phaseCorrelation: readNumber(stereo?.phase_correlation),
  };
}

function getSpectralRmsRecord(
  analysis: unknown,
): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directSpectralRms = getNestedRecord(analysisRecord, "spectral_rms");

  if (directSpectralRms) {
    return directSpectralRms;
  }

  return null;
}

function getSpectralRmsValues(analysis: unknown): SpectralRmsValues {
  const spectralRms = getSpectralRmsRecord(analysis);

  return {
    subRmsDbfs: readNumber(spectralRms?.sub_rms_dbfs),
    lowRmsDbfs: readNumber(spectralRms?.low_rms_dbfs),
    midRmsDbfs: readNumber(spectralRms?.mid_rms_dbfs),
    highRmsDbfs: readNumber(spectralRms?.high_rms_dbfs),
    airRmsDbfs: readNumber(spectralRms?.air_rms_dbfs),
  };
}

function getTransientsRecord(
  analysis: unknown,
): Record<string, unknown> | null {
  const analysisRecord = asRecord(analysis);

  const directTransients = getNestedRecord(analysisRecord, "transients");

  if (directTransients) {
    return directTransients;
  }

  return null;
}

function getTransientsTimeline(analysis: unknown): TransientTimelineItem[] {
  const transients = getTransientsRecord(analysis);
  const rawTimeline = transients?.timeline;

  if (!Array.isArray(rawTimeline)) {
    return [];
  }

  return rawTimeline
    .map((item) => {
      const record = asRecord(item);

      if (!record) {
        return null;
      }

      const startSec = readNumber(record.start_sec);
      const endSec = readNumber(record.end_sec);
      const transientCount = readNumber(record.transient_count);
      const densityPerSec = readNumber(record.density_per_sec);

      if (
        startSec === null ||
        endSec === null ||
        transientCount === null ||
        densityPerSec === null
      ) {
        return null;
      }

      return {
        startSec,
        endSec,
        transientCount,
        densityPerSec,
        meanShortCrestDb: readNumber(record.mean_short_crest_db),
        p95ShortCrestDb: readNumber(record.p95_short_crest_db),
      };
    })
    .filter((item): item is TransientTimelineItem => item !== null);
}

function getTransientsValues(analysis: unknown): TransientsValues {
  const transients = getTransientsRecord(analysis);

  return {
    attackStrength: readNumber(transients?.attack_strength),
    transientDensityPerSec: readNumber(transients?.transient_density_per_sec),
    p95ShortCrestDb: readNumber(transients?.p95_short_crest_db),
    meanShortCrestDb: readNumber(transients?.mean_short_crest_db),
    transientDensityCv: readNumber(transients?.transient_density_cv),
    timeline: getTransientsTimeline(analysis),
  };
}

export default async function DecisionCenterLabMetersPage({
  searchParams,
}: DecisionCenterLabMetersPageProps) {
  const params = await searchParams;
  const data = await readLocalFeedbackPageData(params.track);
  const selectedTrack = data.selectedTrack;
  const phaseCorrelationValue = selectedTrack
    ? getPhaseCorrelationValue(selectedTrack.analysis)
    : null;
  const lowEndMonoValues = selectedTrack
    ? getLowEndMonoValues(selectedTrack.analysis)
    : {
        phaseCorrelationLowBand: null,
        monoLossLowBandPercent: null,
        lowBandBalanceDb: null,
      };
  const streamingNormalizationValues = selectedTrack
    ? getStreamingNormalizationValues(selectedTrack.analysis)
    : {
        integratedLufs: null,
        truePeakDbtp: null,
      };
  const shortTermLufsValues = selectedTrack
    ? getShortTermLufsValues(selectedTrack.analysis)
    : {
        integratedLufs: null,
        dynamicRangeLu: null,
        points: [],
      };
  const limiterStressValues = selectedTrack
    ? getLimiterStressValues(selectedTrack.analysis)
    : {
        truePeakDbtp: null,
        peakDbfs: null,
        clippedSampleCount: null,
        plrLu: null,
        crestFactorDb: null,
        eventsPerMin: null,
        maxEventsPer10s: null,
        p95EventsPer10s: null,
        timeline: [],
      };
  const engineeringDynamicsValues = selectedTrack
    ? getEngineeringDynamicsValues(selectedTrack.analysis)
    : {
        integratedLufs: null,
        loudnessRangeLu: null,
        crestFactorDb: null,
        plrLu: null,
        integratedRmsDbfs: null,
      };
  const streamingRiskGaugeValues = selectedTrack
    ? getStreamingRiskGaugeValues(selectedTrack.analysis)
    : {
        integratedLufs: null,
        truePeakDbtp: null,
        clippedSampleCount: null,
        peakDbfs: null,
      };
  const midSideValues = selectedTrack
    ? getMidSideValues(selectedTrack.analysis)
    : {
        stereoWidth: null,
        sideMidRatio: null,
        phaseCorrelation: null,
      };
  const spectralRmsValues = selectedTrack
    ? getSpectralRmsValues(selectedTrack.analysis)
    : {
        subRmsDbfs: null,
        lowRmsDbfs: null,
        midRmsDbfs: null,
        highRmsDbfs: null,
        airRmsDbfs: null,
      };
  const transientsValues = selectedTrack
    ? getTransientsValues(selectedTrack.analysis)
    : {
        attackStrength: null,
        transientDensityPerSec: null,
        p95ShortCrestDb: null,
        meanShortCrestDb: null,
        transientDensityCv: null,
        timeline: [],
      };

  return (
    <>
      <ScrollUnlock />
      <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link
                  href={buildFeedbackHref(selectedTrack?.folderName)}
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  ← Back to detailed feedback
                </Link>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                  Meters & Technical Modules
                </p>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Technical meter view
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Detailed loudness, limiter, stereo, mono, tonal balance and transient
                  checks based on the current local analysis output.
                </p>
              </div>

              {selectedTrack ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 lg:min-w-[320px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Selected track
                  </p>

                  <h2 className="mt-2 text-base font-semibold leading-snug text-white">
                    {selectedTrack.payload.track?.title || selectedTrack.folderName}
                  </h2>

                  {selectedTrack.payload.track?.artist_name ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      {selectedTrack.payload.track.artist_name}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          {selectedTrack ? (
            <section className="flex flex-col gap-6">
              <MeterSection
                eyebrow="Release Safety"
                title="Streaming and limiter risk"
                description="Checks that help identify possible release, clipping, peak and platform-normalization risks."
                gridClassName="grid gap-4 xl:grid-cols-2"
              >
                <StreamingRiskGaugeMeterCard
                  integratedLufs={streamingRiskGaugeValues.integratedLufs}
                  truePeakDbtp={streamingRiskGaugeValues.truePeakDbtp}
                  clippedSampleCount={streamingRiskGaugeValues.clippedSampleCount}
                  peakDbfs={streamingRiskGaugeValues.peakDbfs}
                />
                <StreamingNormalizationMeterCard
                  integratedLufs={streamingNormalizationValues.integratedLufs}
                  truePeakDbtp={streamingNormalizationValues.truePeakDbtp}
                />
                <div className="xl:col-span-2">
                  <LimiterStressMeterCard
                    truePeakDbtp={limiterStressValues.truePeakDbtp}
                    peakDbfs={limiterStressValues.peakDbfs}
                    clippedSampleCount={limiterStressValues.clippedSampleCount}
                    plrLu={limiterStressValues.plrLu}
                    crestFactorDb={limiterStressValues.crestFactorDb}
                    eventsPerMin={limiterStressValues.eventsPerMin}
                    maxEventsPer10s={limiterStressValues.maxEventsPer10s}
                    p95EventsPer10s={limiterStressValues.p95EventsPer10s}
                    timeline={limiterStressValues.timeline}
                  />
                </div>
              </MeterSection>

              <MeterSection
                eyebrow="Loudness & Dynamics"
                title="Movement over time"
                description="Loudness movement and engineering dynamics for checking stability, density and musical headroom."
                gridClassName="grid gap-4 xl:grid-cols-2"
              >
                <div className="xl:col-span-2">
                  <ShortTermLufsMeterCard
                    integratedLufs={shortTermLufsValues.integratedLufs}
                    dynamicRangeLu={shortTermLufsValues.dynamicRangeLu}
                    points={shortTermLufsValues.points}
                  />
                </div>
                <div className="xl:col-span-2">
                  <EngineeringDynamicsMeterCard
                    integratedLufs={engineeringDynamicsValues.integratedLufs}
                    loudnessRangeLu={engineeringDynamicsValues.loudnessRangeLu}
                    crestFactorDb={engineeringDynamicsValues.crestFactorDb}
                    plrLu={engineeringDynamicsValues.plrLu}
                    integratedRmsDbfs={engineeringDynamicsValues.integratedRmsDbfs}
                  />
                </div>
              </MeterSection>

              <MeterSection
                eyebrow="Stereo & Mono"
                title="Translation and phase stability"
                description="Stereo image, phase relationship and low-end mono compatibility."
                gridClassName="grid gap-4 xl:grid-cols-3"
              >
                <PhaseCorrelationMeterCard value={phaseCorrelationValue} />
                <LowEndMonoMeterCard
                  phaseCorrelationLowBand={lowEndMonoValues.phaseCorrelationLowBand}
                  monoLossLowBandPercent={lowEndMonoValues.monoLossLowBandPercent}
                  lowBandBalanceDb={lowEndMonoValues.lowBandBalanceDb}
                />
                <MidSideMeterCard
                  stereoWidth={midSideValues.stereoWidth}
                  sideMidRatio={midSideValues.sideMidRatio}
                  phaseCorrelation={midSideValues.phaseCorrelation}
                />
              </MeterSection>

              <MeterSection
                eyebrow="Frequency & Punch"
                title="Tonal balance and transient detail"
                description="Spectral energy distribution and transient behavior across the track."
                gridClassName="grid gap-4 xl:grid-cols-2"
              >
                <SpectralRmsMeterCard
                  subRmsDbfs={spectralRmsValues.subRmsDbfs}
                  lowRmsDbfs={spectralRmsValues.lowRmsDbfs}
                  midRmsDbfs={spectralRmsValues.midRmsDbfs}
                  highRmsDbfs={spectralRmsValues.highRmsDbfs}
                  airRmsDbfs={spectralRmsValues.airRmsDbfs}
                />
                <TransientsMeterCard
                  attackStrength={transientsValues.attackStrength}
                  transientDensityPerSec={transientsValues.transientDensityPerSec}
                  p95ShortCrestDb={transientsValues.p95ShortCrestDb}
                  meanShortCrestDb={transientsValues.meanShortCrestDb}
                  transientDensityCv={transientsValues.transientDensityCv}
                  timeline={transientsValues.timeline}
                />
              </MeterSection>
            </section>
          ) : (
            <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
              <p className="text-sm text-zinc-400">
                No local analysis output with artist_decision_payload.json was
                found in analysis_engine/output.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
