import type { ReactNode } from "react";

export function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export function safeNumber(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function formatHardFailReason(r: any): { title: string; detail: string } {
  const id = typeof r?.id === "string" ? r.id : "unknown";
  const value = typeof r?.value === "number" && Number.isFinite(r.value) ? r.value : null;
  const threshold = typeof r?.threshold === "number" && Number.isFinite(r.threshold) ? r.threshold : null;

  const val = value !== null ? value.toFixed(3) : null;
  const thr = threshold !== null ? threshold.toFixed(3) : null;

  switch (id) {
    case "dynamic_collapse": {
      const crest =
        (typeof r?.values?.crest_factor_db === "number" && Number.isFinite(r.values.crest_factor_db))
          ? r.values.crest_factor_db
          : (typeof r?.value === "number" && Number.isFinite(r.value))
            ? r.value
            : null;

      const lufs =
        (typeof r?.values?.integrated_lufs === "number" && Number.isFinite(r.values.integrated_lufs))
          ? r.values.integrated_lufs
          : null;

      const crestThr =
        (typeof r?.thresholds?.crest_factor_db === "number" && Number.isFinite(r.thresholds.crest_factor_db))
          ? r.thresholds.crest_factor_db
          : null;

      const lufsThr =
        (typeof r?.thresholds?.integrated_lufs === "number" && Number.isFinite(r.thresholds.integrated_lufs))
          ? r.thresholds.integrated_lufs
          : null;

      const crestText =
        crest !== null
          ? `Crest Factor ${crest.toFixed(2)} dB${crestThr !== null ? ` (threshold ${crestThr.toFixed(2)} dB)` : ""}`
          : null;

      const lufsText =
        lufs !== null
          ? `Integrated LUFS ${lufs.toFixed(1)}${lufsThr !== null ? ` (threshold ${lufsThr.toFixed(1)})` : ""}`
          : null;

      const parts = [crestText, lufsText].filter(Boolean);

      return {
        title: "Dynamic collapse (over-limited master)",
        detail:
          parts.length > 0
            ? `${parts.join(", ")}. The master is extremely flattened/over-limited and may be distorted or fatiguing.`
            : "The master is extremely flattened/over-limited (dynamic collapse).",
      };
    }

    case "tp_over_1_0":
      return {
        title: "Extreme True Peak",
        detail: `True Peak exceeded +1.0 dBTP${val ? ` (${val} dBTP)` : ""}${thr ? `; threshold ${thr} dBTP` : ""}.`,
      };

    case "massive_clipping":
      return {
        title: "Massive clipping",
        detail: `Clipping is severe${value !== null ? ` (${Math.trunc(value)} clipped samples)` : ""}.`,
      };

    // Future-proofing (if gate reasons are persisted later)
    case "duration_invalid":
      return { title: "Invalid duration", detail: "The audio file duration is invalid or unreadable." };
    case "duration_too_long":
      return { title: "Track too long", detail: "Track exceeds the maximum allowed duration." };
    case "silence_dropout":
      return { title: "Dropout silence", detail: "A long silent dropout was detected." };
    case "silence_ratio":
      return { title: "Mostly silence", detail: "The track is mostly silent." };
    case "dc_offset":
      return { title: "Extreme DC offset", detail: "DC offset is extreme and can cause distortion/translation issues." };

    default:
      return { title: `Hard-fail: ${id}`, detail: "Technical listenability problem detected." };
  }
}
