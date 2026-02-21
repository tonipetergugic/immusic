import React from "react";
import JourneyWaveformWithTooltip from "../../_components/JourneyWaveformWithTooltip";
import { V3JourneyStyles } from "./V3Styles";

type Journey = {
  durationS: number | null;
  sections: Array<{ type: string; start: number | null; end: number | null; t: number | null }>;
};

type Props = {
  payload: any;
  isReady: boolean;
  journey: Journey;

  deriveWaveformSeriesFromShortTermLufs: (payload: any, isReady: boolean) => number[] | null;
  resampleLinear: (series: number[], targetN: number) => number[];
  shapeWaveAmp: (a: number) => number;
  findFirst: <T = any>(obj: any, paths: string[]) => T | null;
};

export default function JourneySection({
  payload,
  isReady,
  journey,
  deriveWaveformSeriesFromShortTermLufs,
  resampleLinear,
  shapeWaveAmp,
  findFirst,
}: Props) {
  return (
    <section>
      <h2 className="text-3xl font-semibold tracking-tight text-white">Song Journey</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/50 leading-relaxed">
        Continuous energy flow based on short-term loudness. This view highlights dynamic movement, intensity shifts, and structural
        momentum across the entire track.
      </p>

      {(() => {
        const series = deriveWaveformSeriesFromShortTermLufs(payload, isReady);
        const hasSeries = Array.isArray(series) && series.length > 10;

        // pick a primary drop marker (first drop t)
        const firstDropT = journey.sections.find((s) => s.type === "drop" && s.t !== null)?.t ?? null;

        const dur = journey.durationS;
        const dropLeftPct = dur && firstDropT !== null ? Math.max(0, Math.min(100, (firstDropT / dur) * 100)) : null;

        const svgW = 1100;
        const svgH = 160;

        const shortTermLufsTimeline =
          findFirst<Array<{ t: number; lufs: number }>>(payload, [
            "metrics.loudness.short_term_lufs_timeline",
            "metrics.short_term_lufs_timeline",
            "track.private_metrics.short_term_lufs_timeline",
            "short_term_lufs_timeline",
          ]) ?? null;

        return (
          <div className="mt-6">
            <V3JourneyStyles />

            {/* Cinematic Curve Area */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
                </div>

                <div className="relative">
                  <div className="h-[180px] md:h-[220px]">
                    {hasSeries ? (
                      <JourneyWaveformWithTooltip
                        series={series}
                        durationS={journey.durationS}
                        svgW={svgW}
                        svgH={svgH}
                        lufsTimeline={shortTermLufsTimeline}
                      >
                        <defs>
                          <linearGradient id="v3WaveGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(240,244,248,0.12)" />
                            <stop offset="45%" stopColor="rgba(240,244,248,0.65)" />
                            <stop offset="100%" stopColor="rgba(240,244,248,0.14)" />
                          </linearGradient>
                          <linearGradient id="v3EnergyGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#2C3E73" />
                            <stop offset="45%" stopColor="#4C6FFF" />
                            <stop offset="75%" stopColor="#FF9F43" />
                            <stop offset="100%" stopColor="#FFD166" />
                          </linearGradient>
                          <filter id="v3WaveGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgb(0,255,198)" floodOpacity="0.15" />
                          </filter>
                        </defs>

                        {(() => {
                          // Increase visual resolution
                          const wave = resampleLinear(series!, 900);
                          const n = wave.length;

                          const pad = 6;
                          const w = Math.max(1, svgW - pad * 2);
                          const h = Math.max(1, svgH - pad * 2);
                          const midY = pad + h / 2;
                          const half = h / 2;

                          const step = w / Math.max(1, n - 1);
                          const barW = Math.max(1.0, Math.min(2.2, step * 0.9));

                          return (
                            <>
                              {/* Energy Curve */}
                              {(() => {
                                const curve = resampleLinear(series!, 240);
                                const nC = curve.length;

                                const padC = 10;
                                const wC = Math.max(1, svgW - padC * 2);
                                const hC = Math.max(1, svgH - padC * 2);

                                const topY = padC + 22;
                                const bottomY = padC + hC * 0.55;

                                const pts: string[] = [];
                                for (let i = 0; i < nC; i++) {
                                  const x = padC + (i / (nC - 1)) * wC;
                                  const a = Math.max(0, Math.min(1, curve[i] ?? 0));
                                  const y = bottomY - a * (bottomY - topY);
                                  pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
                                }

                                const refY = padC + hC * 0.5;

                                return (
                                  <>
                                    <line
                                      x1={padC}
                                      x2={padC + wC}
                                      y1={refY}
                                      y2={refY}
                                      stroke="rgba(255,255,255,0.10)"
                                      strokeWidth={1}
                                    />

                                    {(() => {
                                      const hexToRgb = (hex: string) => {
                                        const h = hex.replace("#", "").trim();
                                        const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
                                        const n = parseInt(full, 16);
                                        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
                                      };

                                      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

                                      const mixHex = (c1: string, c2: string, t: number) => {
                                        const A = hexToRgb(c1);
                                        const B = hexToRgb(c2);
                                        const r = Math.round(lerp(A.r, B.r, t));
                                        const g = Math.round(lerp(A.g, B.g, t));
                                        const b = Math.round(lerp(A.b, B.b, t));
                                        return `rgb(${r},${g},${b})`;
                                      };

                                      const energyColor = (aRaw: number) => {
                                        const a = Math.max(0, Math.min(1, aRaw));
                                        const C0 = "#2C3E73";
                                        const C1 = "#4C6FFF";
                                        const C2 = "#FF9F43";
                                        const C3 = "#FF6A2A";

                                        if (a <= 0.35) return mixHex(C0, C1, a / 0.35);
                                        if (a <= 0.65) return mixHex(C1, C2, (a - 0.35) / (0.65 - 0.35));
                                        if (a <= 0.85) return mixHex(C2, C3, (a - 0.65) / (0.85 - 0.65));
                                        return mixHex(C3, C3, 0);
                                      };

                                      const pObjs = pts.map((p, i) => {
                                        const [xs, ys] = p.split(",");
                                        const x = Number(xs);
                                        const y = Number(ys);
                                        const a = Math.max(0, Math.min(1, curve[i] ?? 0));
                                        return { x, y, a };
                                      });

                                      return (
                                        <>
                                          {pObjs.slice(0, -1).map((p1, i) => {
                                            const p2 = pObjs[i + 1]!;
                                            const aAvg = (p1.a + p2.a) * 0.5;
                                            if (aAvg < 0.7) return null;

                                            const glow = aAvg >= 0.85 ? "rgba(255,106,42,0.24)" : "rgba(255,159,67,0.20)";
                                            return (
                                              <path
                                                key={`eglow-${i}`}
                                                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                                                fill="none"
                                                stroke={glow}
                                                strokeWidth={8}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.24}
                                              />
                                            );
                                          })}

                                          {pObjs.slice(0, -1).map((p1, i) => {
                                            const p2 = pObjs[i + 1]!;
                                            const aAvg = (p1.a + p2.a) * 0.5;
                                            return (
                                              <path
                                                key={`ecurve-${i}`}
                                                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                                                fill="none"
                                                stroke={energyColor(aAvg)}
                                                strokeWidth={3.2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.95}
                                                style={{ filter: "drop-shadow(0 0 6px rgba(255,140,80,0.25))" }}
                                              />
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                  </>
                                );
                              })()}

                              {/* Bars */}
                              <g shapeRendering="crispEdges" filter="url(#v3WaveGlow)">
                                {wave.map((a, i) => {
                                  const x = pad + (i / (n - 1)) * w;
                                  const amp = shapeWaveAmp(a);
                                  const yTop = midY - amp * (half - 2);
                                  const yBot = midY + amp * (half - 2);
                                  const height = Math.max(1, yBot - yTop);
                                  const op = 0.1 + 0.2 * amp;

                                  return (
                                    <rect
                                      key={`g-${i}`}
                                      x={x - barW / 2}
                                      y={yTop}
                                      width={barW}
                                      height={height}
                                      fill="rgba(240,244,248,0.14)"
                                      opacity={op}
                                    />
                                  );
                                })}

                                {wave.map((a, i) => {
                                  const x = pad + (i / (n - 1)) * w;
                                  const amp = shapeWaveAmp(a);
                                  const yTop = midY - amp * (half - 2);
                                  const yBot = midY + amp * (half - 2);
                                  const height = Math.max(1, yBot - yTop);
                                  const op = 0.55 + 0.45 * amp;

                                  return (
                                    <rect
                                      key={`b-${i}`}
                                      x={x - barW / 2}
                                      y={yTop}
                                      width={barW}
                                      height={height}
                                      fill="url(#v3WaveGrad)"
                                      opacity={op}
                                    />
                                  );
                                })}
                              </g>

                              {/* (Optional marker calc kept for parity; UI marker not rendered here yet) */}
                              {dropLeftPct === null ? null : null}
                            </>
                          );
                        })()}
                      </JourneyWaveformWithTooltip>
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

                  {/* Energy Flow */}
                  <div className="mt-4">
                    {(() => {
                      const dur = journey.durationS;
                      return (
                        <div className="mt-3 px-2 py-2">
                          <div className="flex items-center justify-between text-[11px] text-white/45 tabular-nums">
                            <span>0:00</span>
                            <span className="text-white/35">Energy Flow</span>
                            <span>
                              {dur ? `${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, "0")}` : "—"}
                            </span>
                          </div>
                          <div className="mt-2 h-[2px] w-full rounded-full bg-white/10" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Energy Metrics */}
                  <div className="mt-10 px-2">
                    {(() => {
                      const raw = series ?? [];
                      if (raw.length < 10) return null;

                      const n = raw.length;
                      const sorted = [...raw].sort((a, b) => a - b);
                      const threshold = sorted[Math.floor(n * 0.7)];

                      const highCount = raw.filter((v) => v >= threshold).length;
                      const highCoverage = Math.round((highCount / n) * 100);

                      const mean = raw.reduce((a, b) => a + b, 0) / n;
                      const variance = raw.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
                      const std = Math.sqrt(variance);
                      const variability = std > 0.18 ? "High" : std > 0.1 ? "Medium" : "Low";

                      let maxBuild = 0;
                      for (let i = 0; i < n - 10; i++) {
                        const delta = raw[i + 10] - raw[i];
                        if (delta > maxBuild) maxBuild = delta;
                      }
                      const buildVal = (maxBuild * 10).toFixed(1);

                      let longest = 0;
                      let current = 1;
                      for (let i = 1; i < n; i++) {
                        if (Math.abs(raw[i] - raw[i - 1]) < 0.02) current++;
                        else {
                          longest = Math.max(longest, current);
                          current = 1;
                        }
                      }
                      longest = Math.max(longest, current);

                      const plateauSec = journey.durationS ? Math.round((longest / n) * journey.durationS) : 0;

                      return (
                        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4 md:gap-y-0">
                          <div className="pr-4">
                            <div className="text-[10px] tracking-widest text-white/35">High Energy</div>
                            <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{highCoverage}%</div>
                            <div className="mt-0.5 text-[11px] text-white/35">Above upper range</div>
                          </div>

                          <div className="pl-0 pr-4 md:pl-4">
                            <div className="text-[10px] tracking-widest text-white/35">Variability</div>
                            <div className="mt-1 text-2xl font-semibold text-white">{variability}</div>
                            <div className="mt-0.5 text-[11px] text-white/35">Overall movement</div>
                          </div>

                          <div className="pr-4 md:pl-4">
                            <div className="text-[10px] tracking-widest text-white/35">Biggest Build</div>
                            <div className="mt-1 text-2xl font-semibold text-white tabular-nums">+{buildVal}</div>
                            <div className="mt-0.5 text-[11px] text-white/35">Short-term rise</div>
                          </div>

                          <div className="md:pl-4">
                            <div className="text-[10px] tracking-widest text-white/35">Plateau</div>
                            <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{plateauSec}s</div>
                            <div className="mt-0.5 text-[11px] text-white/35">Stable segment</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
