"use client";

import { formatTime, safeNumber, safeString } from "../_lib/feedbackHelpers";

export default function IssuesPanel(props: {
  isReady: boolean;
  issues: any[];
  topSummaryText: string;
}) {
  const { isReady, issues, topSummaryText } = props;

  return (
    <div className="rounded-lg bg-black/20 p-4 border border-white/5">
      {isReady ? (
        issues.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {issues.slice(0, 10).map((it: any, idx: number) => {
              const t = safeNumber(it?.t);
              const title = safeString(it?.title) || "Issue";
              const detail = safeString(it?.detail);
              const sev = safeString(it?.severity);
              return (
                <li key={idx} className="rounded-lg bg-black/20 p-3 border border-white/5">
                  <div className="flex items-center gap-2">
                    {t !== null && (
                      <span className="text-xs text-white/50 tabular-nums">
                        {formatTime(t)}
                      </span>
                    )}
                    <span className="text-sm text-white/80 font-medium">{title}</span>
                    {sev && <span className="ml-auto text-xs text-white/40">{sev}</span>}
                  </div>
                  {detail ? <p className="text-xs text-white/60 mt-1">{detail}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-white/50 text-xs mt-2">{topSummaryText}</p>
        )
      ) : (
        <p className="text-white/50 text-xs mt-1">No data yet</p>
      )}
    </div>
  );
}
