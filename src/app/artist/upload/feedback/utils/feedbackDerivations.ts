export function renderAnalysisStatusBanner(payload: any) {
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

export function safeBool(x: any): boolean | null {
  if (x === true) return true;
  if (x === false) return false;
  return null;
}

export function findFirst<T = any>(obj: any, paths: string[]): T | null {
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

export function formatChipValue(v: any): string {
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
export function deriveHeroChips(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return {
      structure: "Pending",
      drop: "Pending",
      hook: "Pending",
      streaming: "Pending",
    };
  }

  // Sections (structure): prefer explicit label; fallback: presence of sections array
  const sections = findFirst<any[]>(payload, ["structure.sections", "structure.sections_v1", "structureSections", "sections"]);

  const structureLabel =
    formatChipValue(findFirst<string>(payload, ["structure.sections_label", "structure.structure_label", "structure.label"])) !== "—"
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

  const dropLabel =
    dropLabelRaw && dropLabelRaw.trim()
      ? dropLabelRaw.trim()
      : hasDrop
        ? "Detected"
        : "—";

  // Hook: prefer detected boolean
  const hookDetected = safeBool(
    findFirst<any>(payload, ["structure.hook.detected", "structure.hookDetected", "hook.detected", "hookDetected"])
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

export function deriveJourney(payload: any, isReady: boolean) {
  const durationS = (() => {
    const d = findFirst<number>(payload, ["track.duration_s", "track.durationS", "track.duration", "duration_s", "durationS"]);
    return typeof d === "number" && Number.isFinite(d) && d > 0 ? d : null;
  })();

  // V2 payload (verified): metrics.structure.sections
  const rawSections = isReady ? findFirst<any[]>(payload, ["metrics.structure.sections"]) : null;

  const sections = Array.isArray(rawSections)
    ? rawSections
        .map((s: any) => {
          const type = typeof s?.type === "string" ? String(s.type) : "unknown";

          const start = typeof s?.start === "number" && Number.isFinite(s.start) ? s.start : null;
          const end = typeof s?.end === "number" && Number.isFinite(s.end) ? s.end : null;

          // point marker (drop)
          const t = typeof s?.t === "number" && Number.isFinite(s.t) ? s.t : null;

          return { type, start, end, t };
        })
        .filter((x) => x.type && (x.t !== null || (x.start !== null && x.end !== null)))
    : [];

  return { durationS, sections };
}

export function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function deriveEnergySeries(payload: any, isReady: boolean) {
  if (!isReady || !payload) return null as null | number[];

  // V2 payload (verified): metrics.structure.energy_curve = [{t,e}, ...] where e is already 0..1-ish
  const energyCurve = findFirst<Array<{ t: number; e: number }>>(payload, ["metrics.structure.energy_curve"]) ?? null;

  if (!Array.isArray(energyCurve) || energyCurve.length < 20) return null;

  const pts = energyCurve
    .filter(
      (p) =>
        p &&
        typeof p.t === "number" &&
        Number.isFinite(p.t) &&
        typeof p.e === "number" &&
        Number.isFinite(p.e)
    )
    .sort((a, b) => a.t - b.t);

  if (pts.length < 20) return null;

  const t0 = pts[0]!.t;
  const tLast = pts[pts.length - 1]!.t;

  const durationS = (() => {
    const d = findFirst<number>(payload, ["track.duration_s", "track.durationS", "track.duration"]);
    if (typeof d === "number" && Number.isFinite(d) && d > 0) return d;
    const span = tLast - t0;
    return span > 0 ? span : null;
  })();

  if (!durationS || durationS <= 0) return null;

  // Stable render resolution for SVG
  const N = 220;
  const out = new Array(N).fill(0);

  let j = 0;
  for (let i = 0; i < N; i++) {
    const targetT = t0 + (i / (N - 1)) * durationS;

    while (j < pts.length - 2 && pts[j + 1]!.t < targetT) j++;

    const a = pts[j]!;
    const b = pts[Math.min(pts.length - 1, j + 1)]!;

    if (b.t <= a.t) {
      out[i] = clamp01(a.e);
      continue;
    }

    const alpha = clamp01((targetT - a.t) / (b.t - a.t));
    const e = a.e + (b.e - a.e) * alpha;

    // IMPORTANT: no section-step fallback, no renormalization guess — render engine energy as-is (clamped)
    out[i] = clamp01(e);
  }

  return out;
}

export function deriveWaveformSeriesFromShortTermLufs(payload: any, isReady: boolean): number[] | null {
  if (!isReady || !payload) return null;

  // Try multiple shapes (null-safe forever)
  const tl =
    findFirst<Array<{ t: number; lufs: number }>>(payload, [
      "metrics.loudness.short_term_lufs_timeline",
      "metrics.short_term_lufs_timeline",
      "track.private_metrics.short_term_lufs_timeline",
      "short_term_lufs_timeline",
    ]) ?? null;

  if (!Array.isArray(tl) || tl.length < 8) return null;

  const lufs = tl.map((p) => p?.lufs).filter((x) => typeof x === "number" && Number.isFinite(x)) as number[];
  if (lufs.length < 8) return null;

  // Robust normalization: use 10th..90th percentile to avoid outliers
  const sorted = [...lufs].sort((a, b) => a - b);
  const p = (q: number) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.round(q * (sorted.length - 1))));
    return sorted[idx]!;
  };

  const lo = p(0.10);
  const hi = p(0.90);
  const denom = Math.max(1e-6, hi - lo);

  // Convert LUFS to 0..1 amplitude (higher LUFS => taller bar)
  const raw = tl.map((pt) => {
    const v = typeof pt?.lufs === "number" && Number.isFinite(pt.lufs) ? (pt.lufs - lo) / denom : 0;
    return clamp01(v);
  });

  // Downsample to keep SVG light (max ~700 bars)
  const MAX_BARS = 700;
  if (raw.length <= MAX_BARS) return raw;

  const out: number[] = [];
  for (let i = 0; i < MAX_BARS; i++) {
    const a = Math.floor((i / MAX_BARS) * raw.length);
    const b = Math.floor(((i + 1) / MAX_BARS) * raw.length);
    let m = 0;
    let n = 0;
    for (let j = a; j < Math.max(a + 1, b); j++) {
      m = Math.max(m, raw[j] ?? 0);
      n++;
    }
    out.push(n > 0 ? m : 0);
  }
  return out;
}

export function buildSvgPath(series: number[], width: number, height: number) {
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

export function mapStructureTypeToImusic(type: string | null | undefined): string {
  switch (type) {
    case "intro":
      return "intro";
    case "outro":
      return "outro";
    case "drop":
      return "high_energy";
    case "break":
      return "low_energy";
    case "build":
      return "main";
    case "body":
      return "main";
    case "bridge":
      return "main";
    default:
      return "main";
  }
}

export function labelForSectionType(type: string) {
  const t = String(type || "unknown");
  if (t === "drop") return "Drop";
  if (t === "build") return "Build";
  if (t === "break") return "Break";
  if (t === "intro") return "Intro";
  if (t === "outro") return "Outro";
  if (t === "body") return "Body";

  // IMUSIC mapped types
  if (t === "main") return "Main Section";
  if (t === "high_energy") return "High Energy";
  if (t === "low_energy") return "Low Energy";

  if (t === "bridge") return "Bridge";
  return t.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function clsForSectionType(type: string) {
  // IMUSIC: readable segmentation colors (no judgement, just orientation)
  if (type === "high_energy" || type === "drop") return "bg-[rgba(0,255,198,0.28)]"; // turquoise
  if (type === "main" || type === "build" || type === "body") return "bg-[rgba(255,255,255,0.12)]"; // brighter grey
  if (type === "low_energy" || type === "break") return "bg-[rgba(120,120,160,0.22)]"; // grey-violet
  if (type === "intro") return "bg-[rgba(120,180,255,0.18)]"; // subtle blue
  if (type === "outro") return "bg-[rgba(200,140,255,0.16)]"; // subtle purple

  return "bg-[rgba(255,255,255,0.08)]";
}

export function resampleLinear(series: number[], targetN: number): number[] {
  const src = Array.isArray(series) ? series : [];
  if (src.length === 0) return [];
  const n = Math.max(2, Math.floor(targetN));
  if (src.length === n) return src.slice();

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (src.length - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(src.length - 1, i0 + 1);
    const frac = t - i0;
    const a = src[i0] ?? 0;
    const b = src[i1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

// Non-linear shaping to reveal low-level detail (more "sharp" visual micro-dynamics)
export function shapeWaveAmp(a: number): number {
  const x = clamp01(a);
  // gamma < 1 boosts quieter parts -> more detail, less "blob"
  return clamp01(Math.pow(x, 0.62));
}

export function deriveDropImpactCard(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return {
      label: "Pending",
      valuePct: null as number | null,
      confidencePct: null as number | null,
      explanation: "Analysis is still processing.",
    };
  }

  const score =
    findFirst<number>(payload, [
      // v2 real source (preferred)
      "metrics.structure.drop_confidence.items.0.features.impact_score_0_100",

      // legacy / fallback
      "metrics.structure.drop_confidence.impact_score",
      "metrics.structure.dropImpact.impact_score",
      "structure.drop.impact_score",
      "structure.dropImpact.score",
      "structure.dropImpact.impact_score",
      "structure.drop_confidence.impact_score",
      "drop.impact_score",
      "dropImpact",
      "dropImpact.score",
    ]) ?? null;

  const labelRaw =
    findFirst<string>(payload, [
      "structure.drop.label",
      "structure.dropImpact.label",
      "structure.drop_confidence.label",
      "drop.label",
      "dropImpact.label",
      "metrics.structure.drop_confidence.items.0.label",
    ]) ?? null;

  const confidence =
    findFirst<number>(payload, [
      "structure.drop.confidence",
      "structure.dropImpact.confidence",
      "structure.drop_confidence.confidence",
      "drop.confidence",
      "dropImpact.confidence",
      "metrics.structure.drop_confidence.items.0.confidence_0_100",
    ]) ?? null;

  const valuePct = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const confidencePct = typeof confidence === "number" && Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : null;

  const inferredLabel =
    valuePct === null
      ? "Not available"
      : valuePct >= 75
        ? "High contrast"
        : valuePct >= 45
          ? "Moderate contrast"
          : "Low contrast";

  const mapLabel = (raw: string | null) => {
    const v = (raw ?? "").trim();
    if (!v) return null;
    const m: Record<string, string> = {
      weak_drop: "Low contrast",
      solid_drop: "Moderate contrast",
      high_impact_drop: "High contrast",
    };
    return m[v] ?? v;
  };

  const label = mapLabel(labelRaw) ?? inferredLabel;

  const explanation =
    valuePct === null
      ? "No impact data available."
      : "How much the high point stands out compared to what comes right before it.";

  return { label, valuePct, confidencePct, explanation };
}

export function confidenceLabel(confPct: number | null) {
  if (confPct === null) return { short: "—", tone: "text-white/60" };
  if (confPct >= 75) return { short: "High", tone: "text-white/80" };
  if (confPct >= 45) return { short: "Med", tone: "text-white/70" };
  return { short: "Low", tone: "text-white/60" };
}

export function toSparkPoints(values01: number[], w: number, h: number) {
  const n = Math.max(2, values01.length);
  return values01.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - Math.max(0, Math.min(1, v)) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

export function sampleEnergyWindow(payload: any, t0: number, t1: number, n: number) {
  const curve = findFirst<any[]>(payload, ["metrics.structure.energy_curve", "structure.energy_curve"]) ?? null;

  if (!Array.isArray(curve) || curve.length < 2 || !(t1 > t0)) return null;

  // curve items: { t: number, e: number }
  const pts = curve
    .map((p) => ({ t: Number(p?.t), e: Number(p?.e) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.e))
    .sort((a, b) => a.t - b.t);

  if (pts.length < 2) return null;

  const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

  const valueAt = (t: number) => {
    // clamp
    if (t <= pts[0]!.t) return pts[0]!.e;
    if (t >= pts[pts.length - 1]!.t) return pts[pts.length - 1]!.e;

    // find segment (linear scan is ok at this scale)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (t >= a.t && t <= b.t) {
        const u = (t - a.t) / Math.max(1e-9, b.t - a.t);
        return lerp(a.e, b.e, u);
      }
    }
    return pts[pts.length - 1]!.e;
  };

  const out: number[] = [];
  const steps = Math.max(8, Math.min(64, n));
  for (let i = 0; i < steps; i++) {
    const t = lerp(t0, t1, i / (steps - 1));
    out.push(valueAt(t));
  }
  return out;
}

export function deriveStructureBalanceCard(payload: any, isReady: boolean) {
  if (!isReady || !payload) {
    return {
      score: null as number | null,
      dominant: null as string | null,
      coverage: null as number | null,
      explanation: "Analysis is still processing.",
    };
  }

  const score =
    findFirst<number>(payload, [
      "metrics.structure.balance.score_0_100",
    ]) ?? null;

  const dominancePct =
    findFirst<number>(payload, [
      "metrics.structure.balance.features.dominance_pct",
    ]) ?? null;

  const coverage =
    findFirst<number>(payload, [
      "metrics.structure.balance.features.covered_s",
    ]) ?? null;

  const duration =
    findFirst<number>(payload, [
      "metrics.structure.balance.features.duration_s",
    ]) ?? null;

  const dominantHighlight =
    findFirst<string>(payload, [
      "metrics.structure.balance.highlights.0",
    ]) ?? null;

  const coveragePct =
    typeof coverage === "number" && typeof duration === "number" && duration > 0
      ? Math.round((coverage / duration) * 100)
      : null;

  return {
    score: typeof score === "number" ? Math.round(score) : null,
    dominant: dominantHighlight ?? null,
    coverage: coveragePct,
    explanation:
      score === null
        ? "No structure data available."
        : "Shows how evenly segments are distributed over the timeline.",
  };
}

export function deriveArrangementDensityCard(payload: any, isReady: boolean) {
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

  const label = labelRaw && labelRaw.trim() ? labelRaw.trim() : inferredLabel;

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
