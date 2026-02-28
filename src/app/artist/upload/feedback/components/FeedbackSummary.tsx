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
      className={`w-full text-left rounded-xl border px-4 py-2.5 transition ${toneClasses}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{issue.title}</div>
          <div className="mt-1 text-sm text-white/70 leading-snug">{issue.message}</div>
        </div>
        <div className="shrink-0 text-xs text-white/40 mt-0.5">View</div>
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
      <div className="rounded-2xl bg-black/30 border border-white/15 px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-white">Feedback Summary</div>
            <div className="mt-1 text-sm text-white/55">
              Fix these before you upload — click an item to jump to the module.
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT — SYSTEM HEALTH */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-base font-semibold tracking-wide">System Health</span>
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
              <span className="text-base font-semibold tracking-wide">
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
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                No active technical risks. Track is upload-ready from a technical perspective.
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

