import BackLink from "@/components/BackLink";
import UnlockPanel from "../_components/UnlockPanel";
import { unlockPaidFeedbackAction } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

function renderAnalysisStatusBanner(payload: any) {
  const hardFail = !!payload?.hard_fail?.triggered;
  const severity = payload?.summary?.severity; // "info" | "warn" | "critical"

  if (hardFail) {
    return {
      badge: "HARD-FAIL",
      badgeClass: "border-red-400/30 bg-red-500/10 text-red-200",
      text: "Hard-fail triggered — release blocked due to technical issues.",
    };
  }

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

function safeBool(x: any): boolean | null {
  if (x === true) return true;
  if (x === false) return false;
  return null;
}

function findFirst<T = any>(obj: any, paths: string[]): T | null {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== "object" || !(part in cur)) {
        ok = false;
        break;
      }
      cur = (cur as any)[part];
    }
    if (ok) return cur as T;
  }
  return null;
}

function formatChipValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "—";
}

/**
 * V3 Hero chips:
 * - null-safe
 * - neutral wording
 * - if payload shape changes, we keep UI stable by falling back to "—"
 */
function deriveHeroChips(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return {
      structure: "Pending",
      drop: "Pending",
      hook: "Pending",
      streaming: "Pending",
    };
  }

  // Sections (structure): prefer explicit label; fallback: presence of sections array
  const sections = findFirst<any[]>(payload, [
    "structure.sections",
    "structure.sections_v1",
    "structureSections",
    "sections",
  ]);

  const structureLabel =
    formatChipValue(
      findFirst<string>(payload, ["structure.sections_label", "structure.structure_label", "structure.label"])
    ) !== "—"
      ? formatChipValue(findFirst<string>(payload, ["structure.sections_label", "structure.structure_label", "structure.label"]))
      : Array.isArray(sections) && sections.length > 0
        ? "Detected"
        : "—";

  // Drop: prefer a label if present; fallback: detect a drop section marker
  const dropLabelRaw = findFirst<string>(payload, [
    "structure.drop.label",
    "structure.drop_confidence.label",
    "structure.dropConfidence.label",
    "drop.label",
    "dropConfidence.label",
  ]);

  const hasDrop =
    Array.isArray(sections) &&
    sections.some((s: any) => {
      const t = typeof s?.type === "string" ? s.type : null;
      return t === "drop";
    });

  const dropLabel = dropLabelRaw && dropLabelRaw.trim()
    ? dropLabelRaw.trim()
    : hasDrop
      ? "Detected"
      : "—";

  // Hook: prefer detected boolean
  const hookDetected = safeBool(
    findFirst<any>(payload, [
      "structure.hook.detected",
      "structure.hookDetected",
      "hook.detected",
      "hookDetected",
    ])
  );

  const hookLabel = hookDetected === true ? "Detected" : hookDetected === false ? "Not detected" : "—";

  // Streaming: prefer explicit risk label; fallback: severity-based hint
  const streamingRiskLabel = findFirst<string>(payload, [
    "streaming.risk.label",
    "streaming.distortion_risk.label",
    "streaming.distortionRisk.label",
    "codec.risk.label",
    "codec.distortion_risk.label",
    "codec.distortionRisk.label",
  ]);

  const severity = findFirst<string>(payload, ["summary.severity"]);

  const streamingLabel =
    streamingRiskLabel && streamingRiskLabel.trim()
      ? streamingRiskLabel.trim()
      : severity === "warn"
        ? "Moderate risk"
        : severity === "critical"
          ? "Risk"
          : "—";

  return {
    structure: structureLabel,
    drop: dropLabel,
    hook: hookLabel,
    streaming: streamingLabel,
  };
}

function deriveJourney(payload: any, isReady: boolean) {
  const durationS = (() => {
    const d = findFirst<number>(payload, [
      "track.duration_s",
      "track.durationS",
      "track.duration",
      "duration_s",
      "durationS",
    ]);
    return typeof d === "number" && Number.isFinite(d) && d > 0 ? d : null;
  })();

  const rawSections = isReady
    ? findFirst<any[]>(payload, ["structure.sections", "structureSections", "sections", "structure.sections_v1"])
    : null;

  const sections = Array.isArray(rawSections)
    ? rawSections
        .map((s: any) => {
          const type = typeof s?.type === "string" ? String(s.type) : "unknown";

          const start = typeof s?.start === "number" && Number.isFinite(s.start) ? s.start : null;
          const end = typeof s?.end === "number" && Number.isFinite(s.end) ? s.end : null;

          // some drops come as point-in-time `t`
          const t = typeof s?.t === "number" && Number.isFinite(s.t) ? s.t : null;

          return { type, start, end, t };
        })
        .filter((x) => x.type && (x.t !== null || (x.start !== null && x.end !== null)))
    : [];

  return { durationS, sections };
}

function deriveEnergySeries(payload: any, isReady: boolean) {
  if (!isReady || !payload) return null as null | number[];

  // Prefer a real energy curve if present
  const curve =
    findFirst<number[]>(payload, [
      "structure.energy.curve",
      "structure.energyCurve",
      "energy.curve",
      "energyCurve",
    ]) ?? null;

  if (Array.isArray(curve) && curve.length >= 20 && curve.every((x) => typeof x === "number" && Number.isFinite(x))) {
    // normalize to 0..1
    const min = Math.min(...curve);
    const max = Math.max(...curve);
    const span = max - min;
    if (span > 1e-9) return curve.map((x) => clamp01((x - min) / span));
    return curve.map(() => 0.5);
  }

  // Fallback: build a simple stepped curve from sections (drop higher, build mid, break lower)
  const j = deriveJourney(payload, isReady);
  if (!j.durationS || j.sections.length === 0) return null;

  const N = 120;
  const base = new Array(N).fill(0.35);

  const sectionEnergy = (t: string) => {
    if (t === "drop") return 0.9;
    if (t === "build") return 0.6;
    if (t === "break") return 0.25;
    if (t === "intro" || t === "outro") return 0.4;
    return 0.45;
  };

  for (const s of j.sections) {
    if (s.start !== null && s.end !== null && s.end > s.start) {
      const a = Math.floor((s.start / j.durationS) * (N - 1));
      const b = Math.floor((s.end / j.durationS) * (N - 1));
      for (let i = Math.max(0, a); i <= Math.min(N - 1, b); i++) {
        base[i] = Math.max(base[i], sectionEnergy(s.type));
      }
    }
    if (s.type === "drop" && s.t !== null) {
      const i = Math.floor((s.t / j.durationS) * (N - 1));
      if (i >= 0 && i < N) base[i] = 1.0;
    }
  }

  // light smoothing
  const out = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = base[Math.max(0, i - 1)]!;
    const c = base[i]!;
    const n = base[Math.min(N - 1, i + 1)]!;
    out[i] = (p + c * 2 + n) / 4;
  }

  return out.map((x) => clamp01(x));
}

function buildSvgPath(series: number[], width: number, height: number) {
  const n = series.length;
  if (n < 2) return "";
  const pad = 6;
  const w = Math.max(1, width - pad * 2);
  const h = Math.max(1, height - pad * 2);

  let d = "";
  for (let i = 0; i < n; i++) {
    const x = pad + (i / (n - 1)) * w;
    const y = pad + (1 - clamp01(series[i]!)) * h;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

function labelForSectionType(type: string) {
  const t = String(type || "unknown");
  if (t === "drop") return "Drop";
  if (t === "build") return "Build";
  if (t === "break") return "Break";
  if (t === "intro") return "Intro";
  if (t === "outro") return "Outro";
  if (t === "bridge") return "Bridge";
  return t.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function clsForSectionType(type: string) {
  // IMUSIC: subtle, readable, non-judgmental. Uses tinting, not loud colors.
  // (Tailwind arbitrary values OK)
  if (type === "drop") return "bg-[rgba(0,255,198,0.22)]";         // accent turquoise
  if (type === "build") return "bg-[rgba(255,255,255,0.10)]";      // soft white
  if (type === "break") return "bg-[rgba(120,120,160,0.14)]";      // cool grey-violet
  if (type === "intro") return "bg-[rgba(255,255,255,0.06)]";
  if (type === "outro") return "bg-[rgba(255,255,255,0.06)]";
  return "bg-[rgba(255,255,255,0.05)]";
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function deriveDropImpactCard(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return { label: "Pending", valuePct: null as number | null, confidencePct: null as number | null, explanation: "Analysis is still processing." };
  }

  // Try multiple possible shapes — keep null-safe forever
  const score =
    findFirst<number>(payload, [
      "structure.drop.impact_score",
      "structure.dropImpact.score",
      "structure.dropImpact.impact_score",
      "structure.drop_confidence.impact_score",
      "drop.impact_score",
      "dropImpact",
      "dropImpact.score",
    ]) ?? null;

  // Some modules produce label strings
  const labelRaw =
    findFirst<string>(payload, [
      "structure.drop.label",
      "structure.dropImpact.label",
      "structure.drop_confidence.label",
      "drop.label",
      "dropImpact.label",
    ]) ?? null;

  const confidence =
    findFirst<number>(payload, [
      "structure.drop.confidence",
      "structure.dropImpact.confidence",
      "structure.drop_confidence.confidence",
      "drop.confidence",
      "dropImpact.confidence",
    ]) ?? null;

  const valuePct = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const confidencePct = typeof confidence === "number" && Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : null;

  // Neutral wording (no genre bias). If label exists, we use it, otherwise infer from score.
  const inferredLabel =
    valuePct === null
      ? "—"
      : valuePct >= 75
        ? "High separation"
        : valuePct >= 45
          ? "Moderate separation"
          : "Low separation";

  const label = (labelRaw && labelRaw.trim()) ? labelRaw.trim() : inferredLabel;

  const explanation =
    valuePct === null
      ? "No drop impact data available."
      : "Measures how clearly the drop separates from the preceding build — reference, not a rule.";

  return { label, valuePct, confidencePct, explanation };
}

function deriveStructureBalanceCard(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return { label: "Pending", valuePct: null as number | null, explanation: "Analysis is still processing." };
  }

  // Try multiple likely keys (null-safe forever)
  const score =
    findFirst<number>(payload, [
      "structure.balance.index",
      "structure.balance.score",
      "structure.structureBalance.index",
      "structureBalance.index",
      "structureBalance.score",
      "structure_balance.index",
      "structure_balance.score",
    ]) ?? null;

  const valuePct = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;

  const inferredLabel =
    valuePct === null
      ? "—"
      : valuePct >= 75
        ? "Well balanced"
        : valuePct >= 45
          ? "Mostly balanced"
          : "Unbalanced";

  const labelRaw =
    findFirst<string>(payload, [
      "structure.balance.label",
      "structureBalance.label",
      "structure_balance.label",
    ]) ?? null;

  const label = (labelRaw && labelRaw.trim()) ? labelRaw.trim() : inferredLabel;

  const explanation =
    valuePct === null
      ? "No structure balance data available."
      : "Checks whether section lengths feel proportioned and readable — reference, not a rule.";

  return { label, valuePct, explanation };
}

function deriveArrangementDensityCard(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return {
      label: "Pending",
      valuePct: null as number | null,
      stability: "—",
      explanation: "Analysis is still processing.",
      details: null as null | { density: number | null; cv: number | null; std: number | null },
    };
  }

  // Primary density score (if you already normalize to 0–100 somewhere)
  const densityScore =
    findFirst<number>(payload, [
      "structure.arrangement_density.score",
      "structure.arrangementDensity.score",
      "arrangementDensity.score",
      "arrangement_density.score",
    ]) ?? null;

  // Or compute a soft score from transient_density if no explicit score exists
  const densityRaw =
    findFirst<number>(payload, [
      "track.private_metrics.transient_density",
      "private_metrics.transient_density",
      "metrics.private_metrics.transient_density",
      "metrics.transient_density",
      "transient_density",
    ]) ?? null;

  const cvRaw =
    findFirst<number>(payload, [
      "track.private_metrics.transient_density_cv",
      "private_metrics.transient_density_cv",
      "metrics.private_metrics.transient_density_cv",
      "metrics.transient_density_cv",
      "transient_density_cv",
    ]) ?? null;

  const stdRaw =
    findFirst<number>(payload, [
      "track.private_metrics.transient_density_std",
      "private_metrics.transient_density_std",
      "metrics.private_metrics.transient_density_std",
      "metrics.transient_density_std",
      "transient_density_std",
    ]) ?? null;

  const stabilityClass =
    findFirst<string>(payload, [
      "structure.arrangement_density.stability_class",
      "structure.arrangementDensity.stability_class",
      "arrangementDensity.stability_class",
      "arrangement_density.stability_class",
      "structure.arrangement_density.stabilityClass",
      "structure.arrangementDensity.stabilityClass",
      "arrangementDensity.stabilityClass",
      "arrangement_density.stabilityClass",
    ]) ?? null;

  // Value selection:
  // 1) use explicit normalized score if present
  // 2) else soft-map raw density (unknown scale) into 0–100 via squashing
  let valuePct: number | null = null;
  if (typeof densityScore === "number" && Number.isFinite(densityScore)) {
    valuePct = Math.max(0, Math.min(100, densityScore));
  } else if (typeof densityRaw === "number" && Number.isFinite(densityRaw) && densityRaw >= 0) {
    // soft squashing: densityRaw / (densityRaw + k)
    const k = 12; // conservative
    const pct = clamp01(densityRaw / (densityRaw + k)) * 100;
    valuePct = Math.max(0, Math.min(100, pct));
  }

  const stability =
    stabilityClass && stabilityClass.trim()
      ? stabilityClass.trim().replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : "—";

  const inferredLabel =
    valuePct === null
      ? "—"
      : valuePct >= 75
        ? "Very filled"
        : valuePct >= 45
          ? "Balanced"
          : "Very open";

  const labelRaw =
    findFirst<string>(payload, [
      "structure.arrangement_density.label",
      "structure.arrangementDensity.label",
      "arrangementDensity.label",
      "arrangement_density.label",
    ]) ?? null;

  const label = (labelRaw && labelRaw.trim()) ? labelRaw.trim() : inferredLabel;

  const explanation =
    valuePct === null
      ? "No arrangement density data available."
      : "Estimates how filled the arrangement feels over time — reference, not a rule.";

  return {
    label,
    valuePct,
    stability,
    explanation,
    details: {
      density: typeof densityRaw === "number" && Number.isFinite(densityRaw) ? densityRaw : null,
      cv: typeof cvRaw === "number" && Number.isFinite(cvRaw) ? cvRaw : null,
      std: typeof stdRaw === "number" && Number.isFinite(stdRaw) ? stdRaw : null,
    },
  };
}

const V3HeroStyles = () => (
  <style>{`
    @keyframes v3Breathe {
      0%   { transform: translateX(-50%) translateY(0px) scale(1); opacity: 0.55; }
      50%  { transform: translateX(-50%) translateY(6px) scale(1.02); opacity: 0.75; }
      100% { transform: translateX(-50%) translateY(0px) scale(1); opacity: 0.55; }
    }
    .v3-hero-glow {
      animation: v3Breathe 8.5s ease-in-out infinite;
      will-change: transform, opacity;
    }
  `}</style>
);

const V3JourneyStyles = () => (
  <style>{`
    @keyframes v3Shimmer {
      0%   { transform: translateX(-30%); opacity: 0.0; }
      20%  { opacity: 0.35; }
      50%  { opacity: 0.20; }
      100% { transform: translateX(130%); opacity: 0.0; }
    }
    @keyframes v3CurvePulse {
      0%   { opacity: 0.70; filter: blur(0px); }
      50%  { opacity: 0.95; filter: blur(0.4px); }
      100% { opacity: 0.70; filter: blur(0px); }
    }
    .v3-journey-shimmer {
      animation: v3Shimmer 3.6s ease-in-out infinite;
      will-change: transform, opacity;
    }
    .v3-curve-pulse {
      animation: v3CurvePulse 6.8s ease-in-out infinite;
      will-change: opacity, filter;
    }
  `}</style>
);

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
        <section className="relative overflow-hidden px-6 pt-12 pb-20 md:pt-16 md:pb-28">
          <V3HeroStyles />
          {/* Background layers (static for now; subtle motion comes in Hero module step) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-[#0B1220] to-[#0E0E10]" />
            <div className="absolute -top-24 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl v3-hero-glow" />
          </div>

          <div className="relative">
            <div className="flex flex-col gap-3">
              <div className="text-xs text-white/50">Feedback</div>

              <div className="flex flex-col gap-1">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  {queueTitle}
                </h1>
                <p className="text-white/50 text-base md:text-lg">
                  Structure & impact overview — designed for fast understanding.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold tracking-wide " + banner.badgeClass}>
                  {banner.badge}
                </span>
                <span className="text-xs text-white/70">{banner.text}</span>
              </div>

              {/* Status chips (neutral, null-safe) */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {[
                  { title: "Structure", value: heroChips.structure },
                  { title: "Drop", value: heroChips.drop },
                  { title: "Hook", value: heroChips.hook },
                  { title: "Streaming", value: heroChips.streaming },
                ].map((x) => (
                  <div
                    key={x.title}
                    className="group relative overflow-hidden rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    <div className="relative flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-wider text-white/40">
                        {x.title}
                      </span>
                      <span className="text-sm font-semibold text-white/85">
                        {x.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-white/40">
                Note: Feedback is tied to the exact audio file. Re-uploading requires a new unlock.
              </p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <main className="px-6 pb-16">
          {!unlocked ? (
            <div className="mt-6">
              <p className="text-white/70">
                Detailed AI feedback is locked. Unlock to view the full analysis for this upload.
              </p>

              <div className="mt-6">
                <UnlockPanel
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
              {/* Journey */}
              <section>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-lg font-semibold">Song Journey</h2>
                  <span className="text-xs text-white/40">
                    {isReady ? "Ready" : "Pending"}
                  </span>
                </div>
                {(() => {
                  const series = deriveEnergySeries(payload, isReady);
                  const hasSeries = Array.isArray(series) && series.length > 10;

                  // pick a primary drop marker (first drop t)
                  const firstDropT =
                    journey.sections.find((s) => s.type === "drop" && s.t !== null)?.t ??
                    null;

                  const dur = journey.durationS;

                  const dropLeftPct =
                    dur && firstDropT !== null ? Math.max(0, Math.min(100, (firstDropT / dur) * 100)) : null;

                  const svgW = 1100;
                  const svgH = 160;
                  const path = hasSeries ? buildSvgPath(series!, svgW, svgH) : "";

                  return (
                    <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
                      <V3JourneyStyles />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-white/90">Song Journey</div>
                          <div className="mt-1 text-xs text-white/45">
                            Energy flow + estimated structure boundaries • Reference, not a rule
                          </div>
                        </div>
                        <div className="text-xs text-white/45 tabular-nums">
                          {dur ? `Duration ${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, "0")}` : ""}
                        </div>
                      </div>

                      {/* Cinematic Curve Area */}
                      <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
                          </div>

                          <div className="relative">
                            <div className="h-[180px] md:h-[220px]">
                              {hasSeries ? (
                                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full">
                                  <defs>
                                    <linearGradient id="v3CurveGrad" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                                      <stop offset="45%" stopColor="rgba(0,255,198,0.28)" />
                                      <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
                                    </linearGradient>

                                    <linearGradient id="v3AreaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="rgba(0,255,198,0.16)" />
                                      <stop offset="60%" stopColor="rgba(255,255,255,0.04)" />
                                      <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
                                    </linearGradient>
                                  </defs>

                                  {/* area fill */}
                                  <path
                                    d={`${path} L ${svgW - 6} ${svgH - 6} L 6 ${svgH - 6} Z`}
                                    fill="url(#v3AreaGrad)"
                                    opacity="0.9"
                                  />

                                  {/* glow underlay */}
                                  <path
                                    d={path}
                                    fill="none"
                                    stroke="rgba(0,255,198,0.10)"
                                    strokeWidth="18"
                                    strokeLinecap="round"
                                    className="v3-curve-pulse"
                                  />

                                  {/* main curve */}
                                  <path
                                    d={path}
                                    fill="none"
                                    stroke="url(#v3CurveGrad)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : (
                                <div className="relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-6 text-center">
                                  <div className="text-sm font-semibold text-white/70">Journey data not available yet</div>
                                  <div className="text-xs text-white/40">
                                    This can happen if the track is very short or structure patterns are not stable enough.
                                  </div>
                                  <div className="mt-1 text-[11px] text-white/35">
                                    Tip: Try a full-length render and re-upload for the most reliable structure read.
                                  </div>

                                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 v3-journey-shimmer">
                                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sections overlay bar + legend */}
                            <div className="mt-4">
                              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                                {[
                                  { k: "Intro/Outro", t: "intro", c: clsForSectionType("intro") },
                                  { k: "Build", t: "build", c: clsForSectionType("build") },
                                  { k: "Break", t: "break", c: clsForSectionType("break") },
                                  { k: "Drop", t: "drop", c: clsForSectionType("drop") },
                                ].map((x) => (
                                  <div key={x.k} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                                    <span className={"h-2 w-2 rounded-full " + x.c} />
                                    <span>{x.k}</span>
                                  </div>
                                ))}
                                <span className="ml-1 text-white/35">• Reference, not a rule</span>
                              </div>

                              <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
                                {dur && journey.sections.length > 0
                                  ? journey.sections
                                      .map((s, idx) => {
                                        if (s.start !== null && s.end !== null && s.end > s.start) {
                                          const leftPct = Math.max(0, Math.min(100, (s.start / dur) * 100));
                                          const widthPct = Math.max(0, Math.min(100 - leftPct, ((s.end - s.start) / dur) * 100));
                                          return (
                                            <div
                                              key={`${s.type}-${idx}-${s.start}-${s.end}`}
                                              className={"absolute top-0 h-full " + clsForSectionType(s.type)}
                                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                              title={labelForSectionType(s.type)}
                                            />
                                          );
                                        }
                                        return null;
                                      })
                                      .filter(Boolean)
                                  : null}

                                {/* Drop marker */}
                                {dropLeftPct !== null ? (
                                  <div className="absolute top-0 h-full w-[2px] bg-white/80" style={{ left: `${dropLeftPct}%` }}>
                                    <div className="absolute -top-4 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white/25 blur-md" />
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[10px] text-white/40 tabular-nums">
                                <span>0:00</span>
                                <span>{dur ? `${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, "0")}` : "—"}</span>
                              </div>
                            </div>

                            {/* Inline Labels (minimal) */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {journey.sections.length > 0 ? (
                                journey.sections
                                  .filter((s) => s.start !== null && s.end !== null)
                                  .slice(0, 8)
                                  .map((s, idx) => (
                                    <span
                                      key={`${s.type}-${idx}`}
                                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/55"
                                    >
                                      {labelForSectionType(s.type)}
                                    </span>
                                  ))
                              ) : (
                                <span className="text-[11px] text-white/40">
                                  No stable sections detected yet.
                                </span>
                              )}

                              {dropLeftPct !== null ? (
                                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/65">
                                  Drop marker
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Performance cards */}
              <section>
                <h2 className="text-lg font-semibold">Performance</h2>
                <p className="mt-1 text-sm text-white/60">
                  The top three modules — focused, visual, and neutral.
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {/* Card #1 — Drop Impact (real) */}
                  {(() => {
                    const di = deriveDropImpactCard(payload, isReady);
                    const fill = di.valuePct === null ? 0 : Math.max(0, Math.min(100, di.valuePct));
                    const conf = di.confidencePct === null ? null : Math.max(0, Math.min(100, di.confidencePct));

                    return (
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">Drop Impact</div>
                            <div className="mt-1 text-xs text-white/50">{di.explanation}</div>
                          </div>

                          <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80">
                            {di.label}
                          </div>
                        </div>

                        {/* Visual meter */}
                        <div className="mt-4">
                          <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
                            <div
                              className="h-full bg-white/35"
                              style={{ width: `${fill}%` }}
                              aria-label="Drop impact meter"
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums">
                            <span>Low</span>
                            <span>
                              {di.valuePct === null ? "—" : `${Math.round(di.valuePct)}/100`}
                            </span>
                            <span>High</span>
                          </div>
                        </div>

                        {/* Confidence (optional) */}
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-white/60">Confidence</div>
                            <div className="text-xs text-white/45 tabular-nums">
                              {conf === null ? "—" : `${Math.round(conf)}%`}
                            </div>
                          </div>

                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-white/25"
                              style={{ width: `${conf ?? 0}%` }}
                              aria-label="Confidence meter"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card #2 — Structure Balance (real) */}
                  {(() => {
                    const sb = deriveStructureBalanceCard(payload, isReady);
                    const fill = sb.valuePct === null ? 0 : Math.max(0, Math.min(100, sb.valuePct));

                    return (
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">Structure Balance</div>
                            <div className="mt-1 text-xs text-white/50">{sb.explanation}</div>
                          </div>

                          <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80">
                            {sb.label}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
                            <div
                              className="h-full bg-white/35"
                              style={{ width: `${fill}%` }}
                              aria-label="Structure balance meter"
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums">
                            <span>Low</span>
                            <span>
                              {sb.valuePct === null ? "—" : `${Math.round(sb.valuePct)}/100`}
                            </span>
                            <span>High</span>
                          </div>
                        </div>

                        <div className="mt-4 text-[11px] text-white/40">
                          Tip: If the build or break sections dominate, the perceived pacing can feel less clear.
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card #3 — Arrangement Density (real) */}
                  {(() => {
                    const ad = deriveArrangementDensityCard(payload, isReady);
                    const fill = ad.valuePct === null ? 0 : Math.max(0, Math.min(100, ad.valuePct));

                    return (
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">Arrangement Density</div>
                            <div className="mt-1 text-xs text-white/50">{ad.explanation}</div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80">
                              {ad.label}
                            </div>
                            <div className="text-[11px] text-white/40">Stability: {ad.stability}</div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
                            <div
                              className="h-full bg-white/35"
                              style={{ width: `${fill}%` }}
                              aria-label="Arrangement density meter"
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums">
                            <span>Open</span>
                            <span>
                              {ad.valuePct === null ? "—" : `${Math.round(ad.valuePct)}/100`}
                            </span>
                            <span>Filled</span>
                          </div>
                        </div>

                        {/* Details (small, optional) */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[
                            { k: "Density", v: ad.details?.density },
                            { k: "Std", v: ad.details?.std },
                            { k: "CV", v: ad.details?.cv },
                          ].map((x) => (
                            <div key={x.k} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] text-white/45">{x.k}</div>
                              <div className="mt-1 text-xs text-white/70 tabular-nums">
                                {typeof x.v === "number" ? x.v.toFixed(3) : "—"}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 text-[11px] text-white/40">
                          Tip: If density is very high, leaving micro-gaps can improve perceived clarity.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>

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
              <section className="mt-10">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Engineering</h2>
                      <p className="mt-1 text-sm text-white/60">
                        Purely technical — no taste, no gate.
                      </p>
                    </div>
                    <span className="text-xs text-white/40">{isReady ? "Ready" : "Pending"}</span>
                  </div>

                  {/* V3 Engineering KPIs (minimal, stable) */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { k: "Integrated LUFS", v: v2LufsI, fmt: (x: number) => x.toFixed(1) },
                      { k: "True Peak (dBTP)", v: v2TruePeak, fmt: (x: number) => x.toFixed(2) },
                      { k: "Duration", v: v2DurationS, fmt: (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}` },
                      { k: "Transient density", v: v2TransientDensity, fmt: (x: number) => x.toFixed(3) },
                      { k: "Punch index", v: v2PunchIndex, fmt: (x: number) => x.toFixed(0) },
                      { k: "Short crest p95", v: v2P95ShortCrest, fmt: (x: number) => x.toFixed(2) },
                      { k: "Short crest mean", v: v2MeanShortCrest, fmt: (x: number) => x.toFixed(2) },
                    ].map((m) => (
                      <div key={m.k} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">{m.k}</div>
                        <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                          {typeof m.v === "number" && Number.isFinite(m.v) ? m.fmt(m.v) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Headroom & Streaming (V3) */}
                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white/85">Headroom & Streaming</div>
                        <div className="mt-1 text-xs text-white/45">
                          Protects against encoding distortion and normalization clipping.
                        </div>
                      </div>

                      {headroomBadge ? (
                        <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold tracking-wide " + headroomBadge.cls}>
                          {headroomBadge.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">True Peak</div>
                        <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                          {typeof v2TruePeak === "number" ? `${v2TruePeak.toFixed(2)} dBTP` : "—"}
                        </div>
                        <div className="mt-1 text-xs text-white/40">Source peak (pre-encode)</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Headroom</div>
                        <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                          {typeof headroomSourceDb === "number" ? `${headroomSourceDb.toFixed(2)} dB` : "—"}
                        </div>
                        <div className="mt-1 text-xs text-white/40">0.0 dBTP minus True Peak</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Guidance</div>
                        <div className="mt-1 text-xs text-white/60">
                          {headroomSourceDb === null
                            ? "—"
                            : headroomSourceDb <= 0.10
                              ? "Reduce limiter ceiling (e.g. -1.0 dBTP) to avoid encoding overs."
                              : headroomSourceDb <= 0.30
                                ? "Consider a slightly lower ceiling for safer streaming."
                                : "Headroom looks safe for typical encoding."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Streaming normalization (V3) */}
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white/85">Streaming normalization</div>
                        <div className="mt-1 text-xs text-white/45">
                          Estimated playback gain based on loudness targets.
                        </div>
                      </div>
                      <span className="text-xs text-white/35">Down-only unless headroom allows</span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        {
                          title: "Spotify",
                          sub: "Target −14 LUFS",
                          gain: normSpotifyGain,
                          extra: normSpotifyDesired !== null ? `Desired: ${normSpotifyDesired.toFixed(1)} dB` : null,
                        },
                        {
                          title: "YouTube",
                          sub: "Target −14 LUFS",
                          gain: normYoutubeGain,
                          extra: "Down-only",
                        },
                        {
                          title: "Apple Music",
                          sub: "Target −16 LUFS",
                          gain: normAppleGain,
                          extra: normAppleUpCap !== null ? `Up capped by headroom: ${normAppleUpCap.toFixed(1)} dB` : null,
                        },
                      ].map((x) => (
                        <div key={x.title} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className="text-xs font-semibold text-white/80">{x.title}</div>
                          <div className="mt-1 text-[11px] text-white/45">{x.sub}</div>

                          <div className="mt-4 text-2xl font-semibold text-white/85 tabular-nums">
                            {typeof x.gain === "number" ? `${x.gain > 0 ? "+" : ""}${x.gain.toFixed(1)} dB` : "—"}
                          </div>

                          {x.extra ? (
                            <div className="mt-2 text-[11px] text-white/45">{x.extra}</div>
                          ) : (
                            <div className="mt-2 text-[11px] text-white/35">—</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-white/40">
                    More engineering panels (codec simulation, true-peak events, spectral bands, stereo/phase) will be added module-by-module.
                  </div>
                </div>
              </section>

              {/* Unlock panel (still shown for errors/balance; unlocked=true) */}
              <section>
                <UnlockPanel
                  unlocked={true}
                  error={error}
                  creditBalance={creditBalance}
                  queueId={queueId}
                  unlockPaidFeedbackAction={unlockPaidFeedbackAction}
                />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
