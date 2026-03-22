"use client";

import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

import type { FeedbackIssue } from "../utils/deriveFeedbackSummary";

type Props = {
  critical: FeedbackIssue[];
  improvements: FeedbackIssue[];
  stable?: FeedbackIssue[];
};

function scrollToTarget(targetId: string) {
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold tracking-wide text-white/80">{label}</span>
    </div>
  );
}

function IssueRow({
  issue,
  tone,
}: {
  issue: FeedbackIssue;
  tone: "critical" | "warn" | "good";
}) {
  const toneClasses =
    tone === "critical"
      ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/15"
      : tone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15"
        : "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15";

  return (
    <button
      type="button"
      onClick={() => scrollToTarget(issue.targetId)}
      className={`w-full cursor-pointer rounded-2xl border px-5 py-4 text-left transition ${toneClasses}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight text-white">
            {issue.title}
          </div>

          {typeof (issue as any).framing === "string" && (issue as any).framing.trim().length > 0 ? (
            <div className="mt-1.5 text-sm leading-relaxed text-white/55">{(issue as any).framing}</div>
          ) : null}

          <div className="mt-3 text-[15px] leading-relaxed text-white/78">
            {issue.message}
          </div>
        </div>
        <div className="mt-0.5 shrink-0 text-sm font-medium text-white/45">View</div>
      </div>
    </button>
  );
}

export default function FeedbackSummary({ critical, improvements, stable }: Props) {
  const hasAny =
    (Array.isArray(critical) && critical.length > 0) ||
    (Array.isArray(improvements) && improvements.length > 0) ||
    (Array.isArray(stable) && stable.length > 0);

  if (!hasAny) return null;

  return (
    <section id="feedback-summary" className="space-y-4 w-full">
      <div className="rounded-[28px] border border-white/15 bg-black/30 px-6 py-6 sm:px-7 sm:py-7">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">

          {/* LEFT — SYSTEM HEALTH */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-lg font-semibold tracking-tight text-white">System Health</span>
            </div>

            {Array.isArray(stable) && stable.length > 0 ? (
              <div className="space-y-2">
                {stable.slice(0, 5).map((issue) => (
                  <IssueRow
                    key={`${issue.source}:${issue.targetId}:${issue.title}`}
                    issue={issue}
                    tone="good"
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/50">
                No stable metrics detected yet.
              </div>
            )}
          </div>

          {/* RIGHT — ACTION REQUIRED */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <span className="text-lg font-semibold tracking-tight text-white">
                Action Required
              </span>
            </div>

            {(Array.isArray(critical) && critical.length > 0) ||
             (Array.isArray(improvements) && improvements.length > 0) ? (
              <div className="space-y-4">

                {Array.isArray(critical) && critical.length > 0 && (
                  <div className="space-y-2">
                    {critical.slice(0, 3).map((issue) => (
                      <IssueRow
                        key={`${issue.source}:${issue.targetId}:${issue.title}`}
                        issue={issue}
                        tone="critical"
                      />
                    ))}
                  </div>
                )}

                {Array.isArray(improvements) && improvements.length > 0 && (
                  <div className="space-y-2">
                    {improvements.slice(0, 4).map((issue) => (
                      <IssueRow
                        key={`${issue.source}:${issue.targetId}:${issue.title}`}
                        issue={issue}
                        tone="warn"
                      />
                    ))}
                  </div>
                )}

              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm leading-relaxed text-emerald-300">
                No active technical risks. Track is upload-ready from a technical perspective.
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

