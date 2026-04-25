import type { ArtistDecisionPayload } from "@/components/decision-center/types";

function getReadinessClasses(state?: string): string {
  if (state === "ready") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (state === "almost_ready") {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-100";
  }

  if (state === "needs_revision") {
    return "border-orange-400/40 bg-orange-400/10 text-orange-100";
  }

  if (state === "blocked") {
    return "border-red-400/40 bg-red-400/10 text-red-100";
  }

  return "border-white/15 bg-white/10 text-white";
}

function getReadinessTone(state?: string) {
  if (state === "ready") {
    return {
      panel:
        "border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.22),transparent_38%),linear-gradient(180deg,rgba(12,18,24,0.98),rgba(6,10,14,0.98))] shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_24px_80px_rgba(16,185,129,0.18)]",
      ringOuter: "border-emerald-300/25 bg-emerald-300/10 shadow-[0_0_60px_rgba(45,212,191,0.22)]",
      ringMiddle: "border-emerald-300/35 bg-emerald-300/10",
      ringInner: "border-emerald-200/25 bg-emerald-200/10 text-emerald-50",
      eyebrow: "text-emerald-100/70",
      accent: "text-emerald-100",
    };
  }

  if (state === "almost_ready") {
    return {
      panel:
        "border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.14),transparent_34%),linear-gradient(180deg,rgba(12,18,24,0.98),rgba(7,10,15,0.98))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_80px_rgba(34,211,238,0.12)]",
      ringOuter: "border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_60px_rgba(34,211,238,0.18)]",
      ringMiddle: "border-yellow-300/30 bg-yellow-300/10",
      ringInner: "border-cyan-100/20 bg-cyan-100/10 text-cyan-50",
      eyebrow: "text-cyan-100/70",
      accent: "text-cyan-50",
    };
  }

  if (state === "needs_revision") {
    return {
      panel:
        "border-orange-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_38%),linear-gradient(180deg,rgba(20,14,10,0.98),rgba(10,8,7,0.98))] shadow-[0_0_0_1px_rgba(251,146,60,0.08),0_24px_80px_rgba(251,146,60,0.12)]",
      ringOuter: "border-orange-300/25 bg-orange-300/10 shadow-[0_0_60px_rgba(251,146,60,0.14)]",
      ringMiddle: "border-orange-200/30 bg-orange-300/10",
      ringInner: "border-orange-100/20 bg-orange-100/10 text-orange-50",
      eyebrow: "text-orange-100/70",
      accent: "text-orange-50",
    };
  }

  if (state === "blocked") {
    return {
      panel:
        "border-red-300/25 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.18),transparent_38%),linear-gradient(180deg,rgba(24,11,13,0.99),rgba(12,7,8,0.99))] shadow-[0_0_0_1px_rgba(248,113,113,0.08),0_24px_80px_rgba(239,68,68,0.14)]",
      ringOuter: "border-red-300/25 bg-red-300/10 shadow-[0_0_60px_rgba(248,113,113,0.18)]",
      ringMiddle: "border-red-200/30 bg-red-300/10",
      ringInner: "border-red-100/20 bg-red-100/10 text-red-50",
      eyebrow: "text-red-100/70",
      accent: "text-red-50",
    };
  }

  return {
    panel:
      "border-white/12 bg-[linear-gradient(180deg,rgba(18,18,20,0.96),rgba(10,10,12,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.22)]",
    ringOuter: "border-white/15 bg-white/5",
    ringMiddle: "border-white/15 bg-white/5",
    ringInner: "border-white/10 bg-white/5 text-white",
    eyebrow: "text-zinc-400",
    accent: "text-white",
  };
}

export function ReleaseReadinessPanel({
  payload,
}: {
  payload: ArtistDecisionPayload;
}) {
  const readiness = payload.release_readiness;
  const state = readiness?.state || "unknown";
  const tone = getReadinessTone(state);

  return (
    <section
      className={[
        "overflow-hidden rounded-[32px] border p-7 md:p-10",
        tone.panel,
      ].join(" ")}
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_260px] lg:items-center">
        <div>
          <p
            className={[
              "text-xs font-semibold uppercase tracking-[0.24em]",
              tone.eyebrow,
            ].join(" ")}
          >
            Release Readiness
          </p>

          <div
            className={[
              "mt-6 inline-flex rounded-full border px-6 py-2.5 text-sm font-bold uppercase tracking-[0.2em]",
              getReadinessClasses(state),
            ].join(" ")}
          >
            {readiness?.label || "UNKNOWN"}
          </div>

          <h2
            className={[
              "mt-7 max-w-3xl text-3xl font-semibold leading-tight md:text-[2.55rem]",
              tone.accent,
            ].join(" ")}
          >
            {readiness?.text || "No release decision is available yet."}
          </h2>

          {payload.track_status?.text ? (
            <div className="mt-5 max-w-2xl">
              {payload.track_status?.label ? (
                <div className="mb-3 inline-flex rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                  {payload.track_status.label}
                </div>
              ) : null}
              <p className="text-base leading-7 text-white/76">
                {payload.track_status.text}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex items-center justify-center">
          <div
            className={[
              "flex h-60 w-60 items-center justify-center rounded-full border backdrop-blur-sm",
              tone.ringOuter,
            ].join(" ")}
          >
            <div
              className={[
                "flex h-44 w-44 items-center justify-center rounded-full border",
                tone.ringMiddle,
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-28 w-28 flex-col items-center justify-center rounded-full border text-center",
                  tone.ringInner,
                ].join(" ")}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Track
                </span>
                <span className="mt-2 text-sm font-semibold uppercase tracking-[0.18em]">
                  {readiness?.label || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
