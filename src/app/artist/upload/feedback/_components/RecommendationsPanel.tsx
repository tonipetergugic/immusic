"use client";

import { safeString } from "../_lib/feedbackHelpers";

export default function RecommendationsPanel(props: {
  isReady: boolean;
  schemaVersion: number | null;
  v2Recommendations: any[];
  recommendations: any[];
}) {
  const { isReady, schemaVersion, v2Recommendations, recommendations } = props;

  return (
    <div className="rounded-lg bg-black/20 p-4 border border-white/5">
      {isReady ? (
        schemaVersion === 2 ? (
          v2Recommendations.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {v2Recommendations.slice(0, 10).map((it: any, idx: number) => {
                const title = safeString(it?.title) || "Recommendation";
                const why = safeString(it?.why);
                const howArr = Array.isArray(it?.how) ? (it.how as any[]) : [];
                const how = howArr.map((x) => safeString(x)).filter(Boolean);

                return (
                  <li key={idx} className="rounded-lg bg-black/20 p-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-white/80 font-medium">{title}</div>
                      {typeof it?.severity === "string" ? (
                        <span
                          className={
                            "text-[10px] px-2 py-0.5 rounded-full border " +
                            (it.severity === "critical"
                              ? "border-red-400/30 bg-red-500/10 text-red-200"
                              : it.severity === "warn"
                                ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-200"
                                : "border-white/10 bg-white/5 text-white/60")
                          }
                        >
                          {String(it.severity).toUpperCase()}
                        </span>
                      ) : null}
                    </div>

                    {why ? <p className="text-xs text-white/60 mt-1">{why}</p> : null}

                    {how.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {how.slice(0, 6).map((h, hIdx) => (
                          <li key={hIdx} className="text-xs text-white/55">
                            • {h}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-white/50 text-xs mt-2">No recommendations</p>
          )
        ) : (
          recommendations.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {recommendations.slice(0, 10).map((it: any, idx: number) => {
                const title = safeString(it?.title) || "Recommendation";
                const detail = safeString(it?.detail);
                return (
                  <li key={idx} className="rounded-lg bg-black/20 p-3 border border-white/5">
                    <span className="text-sm text-white/80 font-medium">{title}</span>
                    {detail ? <p className="text-xs text-white/60 mt-1">{detail}</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-white/50 text-xs mt-2">No recommendations</p>
          )
        )
      ) : (
        <p className="text-white/50 text-xs mt-1">No data yet</p>
      )}
    </div>
  );
}
