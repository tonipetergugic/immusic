import Link from "next/link";
import { notFound } from "next/navigation";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Circle,
  Sparkles,
  Unlock,
} from "lucide-react";
import { ScrollUnlock } from "./ScrollUnlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalysisPayload = Record<string, unknown>;

type PageProps = {
  searchParams?: Promise<{
    track?: string;
  }>;
};

type StatusBlock = {
  label?: string;
  text?: string;
};

type ReleaseReadiness = {
  state?: string;
  label?: string;
  text?: string;
};

type CriticalWarning = {
  title?: string;
  text?: string;
  severity?: string;
  area?: string;
};

type TechnicalReleaseCheck = {
  area?: string;
  label?: string;
  state?: string;
  short_text?: string;
};

type NextStep = {
  title?: string;
  text?: string;
  button_label?: string;
  action_type?: string;
};

type OptionalFeedback = {
  available?: boolean;
  locked?: boolean;
  label?: string;
  text?: string;
};

type KeyStrength = {
  title?: string;
  text?: string;
  area?: string;
};

type ThingToCheck = {
  title?: string;
  text?: string;
  severity?: string;
  area?: string;
};

type ArtistDecisionPayload = {
  track?: {
    title?: string;
    artist_name?: string;
    main_genre?: string;
    subgenre?: string;
    bpm?: number;
    key?: string;
    duration_sec?: number;
  };
  track_status?: StatusBlock;
  release_readiness?: ReleaseReadiness;
  critical_warnings?: CriticalWarning[];
  technical_release_checks?: TechnicalReleaseCheck[];
  key_strengths?: KeyStrength[];
  things_to_check?: ThingToCheck[];
  next_step?: NextStep;
  optional_feedback?: OptionalFeedback;
  meta?: {
    source?: string;
    warnings?: string[];
  };
};

type LabItem = {
  folderName: string;
  payloadPath: string;
  payload: ArtistDecisionPayload;
  analysis: AnalysisPayload | null;
};

async function loadLabItems(): Promise<LabItem[]> {
  const outputRoot = path.join(process.cwd(), "analysis_engine", "output");

  let entries;
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const payloadPath = path.join(
          outputRoot,
          entry.name,
          "artist_decision_payload.json",
        );
        const analysisPath = path.join(outputRoot, entry.name, "analysis.json");

        try {
          const raw = await readFile(payloadPath, "utf-8");
          const payload = JSON.parse(raw) as ArtistDecisionPayload;
          let analysis: AnalysisPayload | null = null;

          try {
            const analysisRaw = await readFile(analysisPath, "utf-8");
            analysis = JSON.parse(analysisRaw) as AnalysisPayload;
          } catch {
            analysis = null;
          }

          return {
            folderName: entry.name,
            payloadPath,
            payload,
            analysis,
          };
        } catch {
          return null;
        }
      }),
  );

  return items
    .filter((item): item is LabItem => Boolean(item))
    .sort((a, b) => a.folderName.localeCompare(b.folderName));
}

function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "Duration unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatBpm(bpm?: number): string | null {
  if (typeof bpm !== "number" || !Number.isFinite(bpm)) {
    return null;
  }

  return `${Math.round(bpm)} BPM`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getArrayLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function formatBarList(value: unknown): string {
  const values = getArray(value)
    .map((item) => {
      const asNumber = getNumber(item);
      if (asNumber !== null) {
        return Number.isInteger(asNumber) ? String(asNumber) : asNumber.toFixed(2);
      }

      const asString = getString(item);
      return asString;
    })
    .filter((item): item is string => Boolean(item));

  return values.length > 0 ? values.join(", ") : "—";
}

function formatMetricValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const formatted = formatNumber(value, 2);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() ? value : "—";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? formatNumber(value, 2) : "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "—";
}

function formatDebugJson(
  value: unknown,
  options?: { maxLength?: number; pretty?: boolean },
): string {
  if (value === null || value === undefined) {
    return "Not available.";
  }

  try {
    const serialized = options?.pretty
      ? JSON.stringify(value, null, 2)
      : JSON.stringify(value);
    if (!serialized) {
      return "Not available.";
    }

    if (
      typeof options?.maxLength === "number" &&
      serialized.length > options.maxLength
    ) {
      return `${serialized.slice(0, options.maxLength)}...`;
    }

    return serialized;
  } catch {
    return "Could not render JSON.";
  }
}

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

function getCheckClasses(state?: string): string {
  if (state === "ok") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (state === "warning") {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-100";
  }

  if (state === "problem") {
    return "border-red-400/20 bg-red-400/10 text-red-100";
  }

  return "border-white/10 bg-white/5 text-zinc-200";
}

function getCheckStateMeta(state?: string) {
  if (state === "ok") {
    return {
      wrapper: "border-emerald-400/15 bg-emerald-400/[0.06]",
      chip: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      dot: "text-emerald-300",
      icon: CheckCircle2,
      label: "OK",
    };
  }

  if (state === "warning") {
    return {
      wrapper: "border-yellow-400/15 bg-yellow-400/[0.06]",
      chip: "border-yellow-300/25 bg-yellow-300/10 text-yellow-100",
      dot: "text-yellow-300",
      icon: AlertTriangle,
      label: "Warning",
    };
  }

  if (state === "problem") {
    return {
      wrapper: "border-red-400/15 bg-red-400/[0.06]",
      chip: "border-red-300/25 bg-red-300/10 text-red-100",
      dot: "text-red-300",
      icon: AlertTriangle,
      label: "Problem",
    };
  }

  if (state === "unavailable") {
    return {
      wrapper: "border-white/10 bg-white/[0.025]",
      chip: "border-white/10 bg-white/[0.04] text-zinc-300",
      dot: "text-zinc-500",
      icon: Circle,
      label: "N/A",
    };
  }

  return {
    wrapper: "border-white/10 bg-white/[0.03]",
    chip: "border-white/10 bg-white/[0.03] text-zinc-300",
    dot: "text-zinc-500",
    icon: Circle,
    label: "Unknown",
  };
}

function getWarningClasses(severity?: string): string {
  if (severity === "problem") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  return "border-yellow-400/25 bg-yellow-400/10 text-yellow-100";
}

function EmptyLabState() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
        No local payloads found
      </p>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        Run the analysis engine first.
      </h2>
      <p className="mt-3 text-sm text-zinc-400">
        Expected files: analysis_engine/output/&lt;track&gt;/artist_decision_payload.json
      </p>
    </section>
  );
}

function TrackSelector({
  items,
  selectedFolderName,
}: {
  items: LabItem[];
  selectedFolderName: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Local test tracks
      </p>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.folderName === selectedFolderName;
          const title = item.payload.track?.title || item.folderName;

          return (
            <Link
              key={item.folderName}
              href={{
                pathname: "/decision-center-lab",
                query: { track: item.folderName },
              }}
              className={[
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                isActive
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="line-clamp-2">{title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HeaderBlock({ payload }: { payload: ArtistDecisionPayload }) {
  const track = payload.track;
  const metadata = [
    track?.artist_name,
    track?.main_genre,
    track?.subgenre,
    formatBpm(track?.bpm),
    track?.key,
  ].filter((value): value is string => Boolean(value));

  return (
    <header className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Local Lab
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Track Decision Center
        </h1>
        <p className="mt-4 max-w-2xl text-base text-zinc-400">
          Local test surface for the new artist-facing release decision flow.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Selected track
        </p>
        <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-white">
          {track?.title || "Untitled track"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDuration(track?.duration_sec)}
        </p>
        {metadata.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {metadata.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function ReleaseReadinessPanel({ payload }: { payload: ArtistDecisionPayload }) {
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

function CriticalWarningsPanel({ warnings }: { warnings: CriticalWarning[] }) {
  if (warnings.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-medium text-zinc-300">No critical issues.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Critical Warnings
      </p>

      <div className="mt-4 grid gap-3">
        {warnings.map((warning, index) => (
          <article
            key={`${warning.area || "warning"}-${index}`}
            className={[
              "rounded-2xl border p-4",
              getWarningClasses(warning.severity),
            ].join(" ")}
          >
            <h3 className="font-semibold">{warning.title || "Check recommended"}</h3>
            {warning.text ? (
              <p className="mt-2 text-sm opacity-80">{warning.text}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function TechnicalReleaseChecksPanel({
  checks,
}: {
  checks: TechnicalReleaseCheck[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Technical Release Checks
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check, index) => (
          (() => {
            const meta = getCheckStateMeta(check.state);
            const Icon = meta.icon;

            return (
              <article
                key={`${check.area || "check"}-${index}`}
                className={[
                  "rounded-2xl border px-4 py-3.5",
                  meta.wrapper,
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Icon className={["h-4.5 w-4.5", meta.dot].join(" ")} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {check.label || "Check"}
                      </h3>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                          meta.chip,
                        ].join(" ")}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {check.short_text ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/58">
                        {check.short_text}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })()
        ))}
      </div>
    </section>
  );
}

function NextStepPanel({ nextStep }: { nextStep?: NextStep }) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,rgba(7,15,19,0.98),rgba(6,10,14,0.98))] p-7 shadow-[0_24px_70px_rgba(8,145,178,0.14)] md:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
        Next Step
      </p>

      <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {nextStep?.title || "Continue"}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50/76">
            {nextStep?.text || "Continue with the next step for this track."}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-bold text-black shadow-[0_14px_40px_rgba(255,255,255,0.14)] transition hover:bg-cyan-50"
        >
          {nextStep?.button_label || "Continue"}
          <ArrowRight className="h-4.5 w-4.5" />
        </button>
      </div>
    </section>
  );
}

function ExtendedFeedbackPreview({
  optionalFeedback,
  keyStrengths = [],
  thingsToCheck = [],
}: {
  optionalFeedback?: OptionalFeedback;
  keyStrengths?: KeyStrength[];
  thingsToCheck?: ThingToCheck[];
}) {
  const isAvailable = optionalFeedback?.available !== false;
  const isLocked = optionalFeedback?.locked === true;
  const feedbackLabel =
    optionalFeedback?.label ||
    (isAvailable ? "Extended Feedback" : "Not available yet");
  const buttonLabel = isLocked ? "Unlock Full Insights" : "Open insights";

  const visibleKeyStrengths =
    keyStrengths.length > 0
      ? keyStrengths
      : [
          {
            title: "No strengths available yet",
            text: "The track check has not provided strength notes for this track yet.",
            area: "track_check",
          },
        ];

  const visibleThingsToCheck =
    thingsToCheck.length > 0
      ? thingsToCheck
      : [
          {
            title: "No review notes available yet",
            text: "The track check has not provided additional review notes for this track yet.",
            severity: "info",
            area: "track_check",
          },
        ];

  return (
    <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.96),rgba(10,10,12,0.98))] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.22)] md:p-9">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            <Sparkles className="h-4 w-4 text-zinc-400" />
            Extended Feedback
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
              {feedbackLabel}
            </span>
            {!isAvailable ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Not available
              </span>
            ) : null}

            {isLocked ? (
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                Credits required
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Optional deeper insight layer
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            {optionalFeedback?.text ||
              "Extended creative interpretation, premium commentary, and optional deep-dive guidance can sit here without diluting the core release decision."}
          </p>
        </div>

        {isAvailable ? (
          <div className="shrink-0">
            <button
              type="button"
              className={[
                "inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-bold transition",
                isLocked
                  ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/15"
                  : "border-white/12 bg-white/[0.05] text-white hover:bg-white/[0.08]",
              ].join(" ")}
            >
              {isLocked ? <Unlock className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              {buttonLabel}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
            Key Strengths
          </div>

          <div className="mt-5 space-y-4">
            {visibleKeyStrengths.map((item, index) => (
              <div key={`${item.area || "strength"}-${index}`} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                <h3 className="text-sm font-semibold text-white">
                  {item.title || "Strength"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {item.text || "No description available."}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="inline-flex rounded-full border border-yellow-300/15 bg-yellow-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow-100/80">
            Things to Check
          </div>

          <div className="mt-5 space-y-4">
            {visibleThingsToCheck.map((item, index) => (
              <div key={`${item.area || "check"}-${index}`} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    {item.title || "Review note"}
                  </h3>

                  {item.severity ? (
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                      {item.severity}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {item.text || "No description available."}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
            AI Consultant
          </div>

          <h3 className="mt-4 text-lg font-semibold text-white">
            Premium interpretation layer
          </h3>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Optional deeper explanation layer for artists who want more detailed guidance after the release check.
          </p>

          <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4 text-sm leading-6 text-cyan-50/80">
            This layer can later explain the check results in plain language and connect them to practical next actions.
          </div>
        </article>
      </div>
    </section>
  );
}

function PayloadWarningsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.05] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-100/75">
        Payload warnings
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-yellow-50/88">
        {warnings.map((warning, index) => (
          <li
            key={`${warning}-${index}`}
            className="rounded-2xl border border-yellow-300/10 bg-black/15 px-3 py-2"
          >
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EngineSummaryPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Analysis JSON not available for this track.
        </p>
      </section>
    );
  }

  const fileInfo = isRecord(analysis.file_info) ? analysis.file_info : null;
  const summary = isRecord(analysis.summary) ? analysis.summary : null;
  const structure = isRecord(analysis.structure) ? analysis.structure : null;

  const rowCandidates: Array<{ label: string; value: string | number | null }> = [
    { label: "Filename", value: getString(fileInfo?.filename) },
    { label: "Duration", value: getNumber(fileInfo?.duration_sec) },
    { label: "Sample rate", value: getNumber(fileInfo?.sample_rate) },
    { label: "Channels", value: getNumber(fileInfo?.channels) },
    { label: "Tempo", value: getNumber(summary?.tempo_estimate) },
    { label: "Beat count", value: getNumber(summary?.beat_count) },
    { label: "Downbeats", value: getNumber(summary?.downbeat_count) },
    { label: "Bar count", value: getNumber(summary?.bar_count) },
    { label: "Segments", value: getNumber(structure?.segment_count) },
    { label: "Repetition", value: getNumber(structure?.repetition_score) },
    { label: "Contrast", value: getNumber(structure?.contrast_score) },
    { label: "Transition", value: getNumber(structure?.transition_score) },
    { label: "Issues", value: getArrayLength(analysis.issues) },
    { label: "product_payload", value: isRecord(analysis.product_payload) ? "yes" : "no" },
    { label: "consultant_input", value: isRecord(analysis.consultant_input) ? "yes" : "no" },
  ];

  const rows = rowCandidates.reduce<Array<{ label: string; value: string | number }>>(
    (accumulator, row) => {
      if (row.value !== null) {
        accumulator.push({ label: row.label, value: row.value });
      }

      return accumulator;
    },
    [],
  );

  const formatValue = (value: string | number) => {
    if (typeof value === "string") {
      return value;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Internal Lab
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">Engine Summary</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
          Analysis JSON loaded
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{formatValue(row.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StructureMetricsPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Structure data not available for this track.
        </p>
      </section>
    );
  }

  const structure = isRecord(analysis.structure) ? analysis.structure : null;

  if (!structure) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Structure data not available for this track.
        </p>
      </section>
    );
  }

  const metricRows = [
    { label: "Beats", value: getNumber(structure.beat_count), digits: 0 },
    { label: "Downbeats", value: getNumber(structure.downbeat_count), digits: 0 },
    { label: "Segments", value: getNumber(structure.segment_count), digits: 0 },
    { label: "Repetition Score", value: getNumber(structure.repetition_score), digits: 2 },
    { label: "Contrast Score", value: getNumber(structure.contrast_score), digits: 2 },
    { label: "Transition Score", value: getNumber(structure.transition_score), digits: 2 },
  ];

  const segments = getArray(structure.segments)
    .map((segment, index) => {
      const record = isRecord(segment) ? segment : null;
      const startSec = getNumber(record?.start_sec) ?? getNumber(record?.start);
      const endSec = getNumber(record?.end_sec) ?? getNumber(record?.end);
      const durationSec =
        getNumber(record?.duration_sec) ??
        (startSec !== null && endSec !== null ? endSec - startSec : null);
      const startBar =
        getNumber(record?.start_bar) ?? getNumber(record?.start_bar_index);
      const endBar = getNumber(record?.end_bar) ?? getNumber(record?.end_bar_index);
      const explicitIndex = getNumber(record?.index);

      return {
        index: explicitIndex ?? index,
        startSec,
        endSec,
        durationSec,
        startBar,
        endBar,
      };
    });

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Internal Lab
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">Structure Metrics</h3>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {metricRows.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {item.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              {formatNumber(item.value, item.digits)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-white">Segment Overview</h4>
          <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            {segments.length} segments
          </span>
        </div>

        {segments.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No segment data available.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">Index</th>
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">Start</th>
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">End</th>
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">Duration</th>
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">Start Bar</th>
                  <th className="border-b border-white/10 px-3 py-2 font-semibold">End Bar</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment) => (
                  <tr key={`segment-${segment.index}-${segment.startSec ?? "na"}`} className="text-zinc-300">
                    <td className="border-b border-white/5 px-3 py-2">{formatNumber(segment.index, 0)}</td>
                    <td className="border-b border-white/5 px-3 py-2">{formatSeconds(segment.startSec)}</td>
                    <td className="border-b border-white/5 px-3 py-2">{formatSeconds(segment.endSec)}</td>
                    <td className="border-b border-white/5 px-3 py-2">{formatSeconds(segment.durationSec)}</td>
                    <td className="border-b border-white/5 px-3 py-2">{formatNumber(segment.startBar, 0)}</td>
                    <td className="border-b border-white/5 px-3 py-2">{formatNumber(segment.endBar, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function BoundarySectionDebugPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">Boundary / Section Debug</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Boundary and section debug data not available for this track.
        </p>
      </section>
    );
  }

  const boundaryDecision = getRecord(analysis.boundary_decision);
  const sections = getRecord(analysis.sections);
  const macroSections = getRecord(analysis.macro_sections);
  const micro = getRecord(analysis.micro);
  const fusion = getRecord(analysis.fusion);

  const sectionRows = getArray(sections?.sections ?? sections?.detected_sections).map(
    (section, index) => {
      const record = getRecord(section);
      const startSec = getNumber(record?.start_sec) ?? getNumber(record?.start);
      const endSec = getNumber(record?.end_sec) ?? getNumber(record?.end);
      const durationSec =
        getNumber(record?.duration_sec) ??
        (startSec !== null && endSec !== null ? endSec - startSec : null);
      const startBar =
        getNumber(record?.start_bar_index) ?? getNumber(record?.start_bar);
      const endBar = getNumber(record?.end_bar_index) ?? getNumber(record?.end_bar);

      return {
        index: getNumber(record?.index) ?? index,
        startSec,
        endSec,
        durationSec,
        startBar,
        endBar,
      };
    },
  );

  const macroSectionRows = getArray(
    macroSections?.macro_sections ?? macroSections?.sections,
  ).map((section, index) => {
    const record = getRecord(section);
    const startSec = getNumber(record?.start_sec) ?? getNumber(record?.start);
    const endSec = getNumber(record?.end_sec) ?? getNumber(record?.end);
    const startBar =
      getNumber(record?.start_bar_index) ?? getNumber(record?.start_bar);
    const endBar = getNumber(record?.end_bar_index) ?? getNumber(record?.end_bar);

    return {
      index: getNumber(record?.index) ?? index,
      startSec,
      endSec,
      startBar,
      endBar,
    };
  });

  const fusionTopRows = fusion
    ? Object.entries(fusion).filter(([, value]) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return true;
        }

        if (Array.isArray(value)) {
          return value.every(
            (item) =>
              (typeof item === "number" && Number.isFinite(item)) ||
              typeof item === "string",
          );
        }

        return false;
      })
    : [];

  const renderKeyValueGrid = (
    rows: Array<{ label: string; value: string }>,
    emptyText: string,
  ) => {
    if (rows.length === 0) {
      return <p className="mt-3 text-sm text-zinc-400">{emptyText}</p>;
    }

    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{row.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Boundary / Section Debug</h3>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Boundary Summary</h4>
          {boundaryDecision ? (
            renderKeyValueGrid(
              [
                { label: "decision_mode", value: getString(boundaryDecision.decision_mode) || "—" },
                {
                  label: "input_candidate_count",
                  value: formatNumber(getNumber(boundaryDecision.input_candidate_count), 0),
                },
                {
                  label: "scored_candidate_count",
                  value: formatNumber(getNumber(boundaryDecision.scored_candidate_count), 0),
                },
                {
                  label: "final_boundary_count",
                  value: formatNumber(getNumber(boundaryDecision.final_boundary_count), 0),
                },
                {
                  label: "kept_boundary_bar_indices",
                  value: formatBarList(boundaryDecision.kept_boundary_bar_indices),
                },
                {
                  label: "removed_boundary_bar_indices",
                  value: formatBarList(boundaryDecision.removed_boundary_bar_indices),
                },
                {
                  label: "final_boundaries",
                  value: formatBarList(boundaryDecision.final_boundaries),
                },
              ],
              "No boundary_decision data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No boundary_decision data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Section Summary</h4>
          {sections ? (
            <>
              {renderKeyValueGrid(
                [
                  {
                    label: "section_count",
                    value: formatNumber(getNumber(sections.section_count), 0),
                  },
                ],
                "No sections data.",
              )}
              {sectionRows.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">No sections data.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Index</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Start</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">End</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Duration</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Start Bar</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">End Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((section) => (
                        <tr key={`section-${section.index}-${section.startSec ?? "na"}`} className="text-zinc-300">
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.index, 0)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatSeconds(section.startSec)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatSeconds(section.endSec)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatSeconds(section.durationSec)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.startBar, 0)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.endBar, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No sections data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Macro Section Summary</h4>
          {macroSections ? (
            <>
              {renderKeyValueGrid(
                [
                  {
                    label: "macro_section_count",
                    value: formatNumber(getNumber(macroSections.macro_section_count), 0),
                  },
                  {
                    label: "macro_boundary_bar_indices",
                    value: formatBarList(macroSections.macro_boundary_bar_indices),
                  },
                  {
                    label: "ignored_boundary_bar_indices",
                    value: formatBarList(macroSections.ignored_boundary_bar_indices),
                  },
                  {
                    label: "selected_group_anchor_bar_indices",
                    value: formatBarList(macroSections.selected_group_anchor_bar_indices),
                  },
                ],
                "No macro_sections data.",
              )}
              {macroSectionRows.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">No macro_sections data.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Index</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Start</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">End</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">Start Bar</th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">End Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {macroSectionRows.map((section) => (
                        <tr key={`macro-section-${section.index}-${section.startSec ?? "na"}`} className="text-zinc-300">
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.index, 0)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatSeconds(section.startSec)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatSeconds(section.endSec)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.startBar, 0)}</td>
                          <td className="border-b border-white/5 px-3 py-2">{formatNumber(section.endBar, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No macro_sections data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Micro / Fusion Mini Summary</h4>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">micro</p>
              {micro ? (
                renderKeyValueGrid(
                  [
                    {
                      label: "micro_marker_count",
                      value: formatNumber(getNumber(micro.micro_marker_count), 0),
                    },
                    {
                      label: "micro_markers",
                      value: formatBarList(micro.micro_markers),
                    },
                  ],
                  "No micro data.",
                )
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No micro data.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">fusion</p>
              {fusion ? (
                fusionTopRows.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">No fusion data.</p>
                ) : (
                  renderKeyValueGrid(
                    fusionTopRows.map(([key, value]) => ({
                      label: key,
                      value: Array.isArray(value)
                        ? formatBarList(value)
                        : formatNumber(getNumber(value), 4),
                    })),
                    "No fusion data.",
                  )
                )
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No fusion data.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechnicalMetricsRawPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">Technical Metrics Raw</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Technical metrics not available for this track.
        </p>
      </section>
    );
  }

  const loudness = getRecord(analysis.loudness);
  const dynamics = getRecord(analysis.dynamics);
  const stereo = getRecord(analysis.stereo);
  const lowEnd = getRecord(analysis.low_end);

  const renderMetricGrid = (
    rows: Array<{ label: string; value: string }>,
    emptyText: string,
  ) => {
    if (rows.length === 0) {
      return <p className="mt-3 text-sm text-zinc-400">{emptyText}</p>;
    }

    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{row.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Technical Metrics Raw</h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Loudness</h4>
          {loudness ? (
            renderMetricGrid(
              [
                {
                  label: "integrated_lufs",
                  value: formatMetricValue(getNumber(loudness.integrated_lufs), "LUFS"),
                },
                {
                  label: "loudness_range_lu",
                  value: formatMetricValue(getNumber(loudness.loudness_range_lu), "LU"),
                },
                {
                  label: "true_peak_dbtp",
                  value: formatMetricValue(getNumber(loudness.true_peak_dbtp), "dBTP"),
                },
                {
                  label: "peak_dbfs",
                  value: formatMetricValue(getNumber(loudness.peak_dbfs), "dBFS"),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(loudness.sample_rate)),
                },
              ],
              "No loudness data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No loudness data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Dynamics</h4>
          {dynamics ? (
            renderMetricGrid(
              [
                {
                  label: "crest_factor_db",
                  value: formatMetricValue(getNumber(dynamics.crest_factor_db), "dB"),
                },
                {
                  label: "integrated_rms_dbfs",
                  value: formatMetricValue(getNumber(dynamics.integrated_rms_dbfs), "dBFS"),
                },
                {
                  label: "plr_lu",
                  value: formatMetricValue(getNumber(dynamics.plr_lu), "LU"),
                },
              ],
              "No dynamics data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No dynamics data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Stereo</h4>
          {stereo ? (
            renderMetricGrid(
              [
                {
                  label: "side_mid_ratio",
                  value: formatMetricValue(getNumber(stereo.side_mid_ratio)),
                },
                {
                  label: "phase_correlation",
                  value: formatMetricValue(getNumber(stereo.phase_correlation)),
                },
                {
                  label: "stereo_width",
                  value: formatMetricValue(getNumber(stereo.stereo_width)),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(stereo.sample_rate)),
                },
              ],
              "No stereo data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No stereo data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Low End</h4>
          {lowEnd ? (
            renderMetricGrid(
              [
                {
                  label: "mono_loss_low_band_percent",
                  value: formatMetricValue(getNumber(lowEnd.mono_loss_low_band_percent), "%"),
                },
                {
                  label: "phase_correlation_low_band",
                  value: formatMetricValue(getNumber(lowEnd.phase_correlation_low_band)),
                },
                {
                  label: "low_band_balance_db",
                  value: formatMetricValue(getNumber(lowEnd.low_band_balance_db), "dB"),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(lowEnd.sample_rate)),
                },
              ],
              "No low-end data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No low-end data.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function IssueDebugScoreContextPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">Issue Debug &amp; Score Context</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Issue and score context data not available for this track.
        </p>
      </section>
    );
  }

  const rootIssues = getArray(analysis.issues);
  const productPayload = getRecord(analysis.product_payload);
  const consultantInput = getRecord(analysis.consultant_input);
  const productPayloadIssues = getArray(productPayload?.issues);
  const consultantInputIssues = getArray(consultantInput?.issues);
  const scoreContext = getRecord(consultantInput?.score_context);

  const scoreContextRows = scoreContext
    ? Object.entries(scoreContext).map(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return { key, value: formatPrimitive(value) };
        }

        if (Array.isArray(value)) {
          const isPrimitiveList = value.every(
            (item) =>
              item === null ||
              item === undefined ||
              typeof item === "string" ||
              typeof item === "number" ||
              typeof item === "boolean",
          );

          return {
            key,
            value: isPrimitiveList
              ? value.map((item) => formatPrimitive(item)).join(", ") || "—"
              : formatDebugJson(value),
          };
        }

        return { key, value: formatDebugJson(value) };
      })
    : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Issue Debug &amp; Score Context</h3>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Root Issues</h4>
          {rootIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No root issues.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {rootIssues.map((issue, index) => {
                const record = getRecord(issue);
                const details = getRecord(record?.details);
                const detailsPrimitiveEntries = details
                  ? Object.entries(details).filter(([, value]) =>
                      value === null ||
                      value === undefined ||
                      typeof value === "string" ||
                      typeof value === "number" ||
                      typeof value === "boolean",
                    )
                  : [];

                return (
                  <article
                    key={`root-issue-${index}`}
                    className="rounded-xl border border-white/8 bg-black/15 p-3"
                  >
                    <div className="grid gap-1 text-xs text-zinc-300">
                      <p>
                        <span className="text-zinc-500">code:</span>{" "}
                        {formatPrimitive(record?.code)}
                      </p>
                      <p>
                        <span className="text-zinc-500">severity:</span>{" "}
                        {formatPrimitive(record?.severity)}
                      </p>
                      <p>
                        <span className="text-zinc-500">area:</span>{" "}
                        {formatPrimitive(record?.area)}
                      </p>
                      <p>
                        <span className="text-zinc-500">message:</span>{" "}
                        {formatPrimitive(record?.message)}
                      </p>
                      <p>
                        <span className="text-zinc-500">text:</span>{" "}
                        {formatPrimitive(record?.text)}
                      </p>
                      <p>
                        <span className="text-zinc-500">details:</span>{" "}
                        {detailsPrimitiveEntries.length > 0
                          ? detailsPrimitiveEntries
                              .map(
                                ([key, value]) =>
                                  `${key}=${formatPrimitive(value)}`,
                              )
                              .join(", ")
                          : "—"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Product Payload Issues</h4>
          {productPayloadIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No product payload issues.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {productPayloadIssues.map((issue, index) => (
                <pre
                  key={`product-payload-issue-${index}`}
                  className="overflow-x-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300"
                >
                  {formatDebugJson(issue, { maxLength: 420 })}
                </pre>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Consultant Input Issues</h4>
          {consultantInputIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No consultant input issues.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {consultantInputIssues.map((issue, index) => (
                <pre
                  key={`consultant-input-issue-${index}`}
                  className="overflow-x-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300"
                >
                  {formatDebugJson(issue, { maxLength: 420 })}
                </pre>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Score Context</h4>
          {!scoreContext ? (
            <p className="mt-3 text-sm text-zinc-400">No score context.</p>
          ) : scoreContextRows.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No score context.</p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {scoreContextRows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {row.key}
                  </p>
                  <p className="mt-1 break-words text-sm text-zinc-200">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RawJsonInspectorPanel({
  analysis,
  artistDecisionPayload,
}: {
  analysis: AnalysisPayload | null;
  artistDecisionPayload: ArtistDecisionPayload;
}) {
  const productPayload = getRecord(analysis?.product_payload);
  const consultantInput = getRecord(analysis?.consultant_input);
  const structure = getRecord(analysis?.structure);
  const boundaryDecision = getRecord(analysis?.boundary_decision);
  const sections = getRecord(analysis?.sections);
  const macroSections = getRecord(analysis?.macro_sections);
  const micro = getRecord(analysis?.micro);
  const fusion = getRecord(analysis?.fusion);

  const renderAnalysisBlock = (value: unknown) => {
    if (!analysis) {
      return (
        <p className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-sm text-zinc-400">
          Analysis JSON not available for this track.
        </p>
      );
    }

    return (
      <pre className="max-h-[520px] overflow-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300">
        {formatDebugJson(value, { pretty: true })}
      </pre>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Raw JSON Inspector</h3>

      <div className="mt-4 space-y-3">
        <details className="rounded-xl border border-white/10 bg-black/10 p-3" open>
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Artist Decision Payload
          </summary>
          <div className="mt-3">
            <pre className="max-h-[520px] overflow-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300">
              {formatDebugJson(artistDecisionPayload, { pretty: true })}
            </pre>
          </div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Product Payload
          </summary>
          <div className="mt-3">{renderAnalysisBlock(productPayload)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Consultant Input
          </summary>
          <div className="mt-3">{renderAnalysisBlock(consultantInput)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Structure
          </summary>
          <div className="mt-3">{renderAnalysisBlock(structure)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Boundary Decision
          </summary>
          <div className="mt-3">{renderAnalysisBlock(boundaryDecision)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Sections
          </summary>
          <div className="mt-3">{renderAnalysisBlock(sections)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Macro Sections
          </summary>
          <div className="mt-3">{renderAnalysisBlock(macroSections)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Micro
          </summary>
          <div className="mt-3">{renderAnalysisBlock(micro)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Fusion
          </summary>
          <div className="mt-3">{renderAnalysisBlock(fusion)}</div>
        </details>

        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Full Analysis JSON
          </summary>
          <div className="mt-3">{renderAnalysisBlock(analysis)}</div>
        </details>
      </div>
    </section>
  );
}

export default async function DecisionCenterLabPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const items = await loadLabItems();

  const selectedItem =
    items.find((item) => item.folderName === resolvedSearchParams.track) ||
    items[0] ||
    null;

  return (
    <>
      <ScrollUnlock />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(22,78,99,0.16),transparent_26%),linear-gradient(180deg,#09090b_0%,#0b0b0f_100%)] px-4 py-8 text-white md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          {selectedItem ? (
            <>
              <HeaderBlock payload={selectedItem.payload} />

              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-6">
                  <ReleaseReadinessPanel payload={selectedItem.payload} />

                  <CriticalWarningsPanel
                    warnings={selectedItem.payload.critical_warnings || []}
                  />

                  <TechnicalReleaseChecksPanel
                    checks={selectedItem.payload.technical_release_checks || []}
                  />

                  <NextStepPanel nextStep={selectedItem.payload.next_step} />

                  <ExtendedFeedbackPreview
                    optionalFeedback={selectedItem.payload.optional_feedback}
                    keyStrengths={selectedItem.payload.key_strengths}
                    thingsToCheck={selectedItem.payload.things_to_check}
                  />

                  <PayloadWarningsPanel
                    warnings={selectedItem.payload.meta?.warnings || []}
                  />

                  <EngineSummaryPanel analysis={selectedItem.analysis} />

                  <StructureMetricsPanel analysis={selectedItem.analysis} />

                  <BoundarySectionDebugPanel analysis={selectedItem.analysis} />

                  <TechnicalMetricsRawPanel analysis={selectedItem.analysis} />

                  <IssueDebugScoreContextPanel analysis={selectedItem.analysis} />

                  <RawJsonInspectorPanel
                    analysis={selectedItem.analysis}
                    artistDecisionPayload={selectedItem.payload}
                  />
                </div>

                <aside className="lg:sticky lg:top-8 lg:self-start">
                  <TrackSelector
                    items={items}
                    selectedFolderName={selectedItem.folderName}
                  />
                </aside>
              </div>
            </>
          ) : (
            <EmptyLabState />
          )}
        </div>
      </main>
    </>
  );
}
