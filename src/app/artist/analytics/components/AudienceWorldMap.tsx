"use client";

import { useEffect, useRef, useState } from "react";
import { zoom, zoomIdentity } from "d3-zoom";
import type { ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

type CountryValues = Record<string, number>; // key = ISO_A3, value = listeners/streams

// Mock values (Phase 2). Later: load from Supabase aggregated listen_events by country.
const mockValues: CountryValues = {
  DEU: 1240,
  GBR: 860,
  NLD: 540,
  ESP: 420,
  USA: 980,
  BRA: 310,
  AUS: 260,
  FRA: 610,
  ITA: 480,
};

function getFill(value: number | undefined) {
  // simple bucket coloring (Tailwind-free inline colors to keep it stable)
  if (!value) return "rgba(255,255,255,0.10)";
  if (value >= 900) return "rgba(0,255,198,0.85)";
  if (value >= 600) return "rgba(0,255,198,0.55)";
  if (value >= 300) return "rgba(0,255,198,0.35)";
  return "rgba(0,255,198,0.22)";
}

export default function AudienceWorldMap() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<any>(null);
  const [t, setT] = useState<ZoomTransform>(() => zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);

    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .on("zoom", (event) => {
        setT(event.transform);
      });

    zoomRef.current = z;
    svg.call(z as any);

    // optional: disable double click zoom (feels better for dashboards)
    svg.on("dblclick.zoom", null);

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const handleResetView = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(200)
      .call(zoomRef.current.transform, zoomIdentity);
  };

  return (
    <div className="mt-4 h-[420px] rounded-xl border border-white/10 bg-black/20 relative overflow-hidden">
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute inset-0 flex flex-col justify-between py-6">
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
        </div>
        <div className="absolute inset-0 flex justify-between px-10">
          <div className="w-px bg-white/10" />
          <div className="w-px bg-white/10" />
          <div className="w-px bg-white/10" />
          <div className="w-px bg-white/10" />
        </div>
      </div>

      <div className="absolute inset-0">
        <svg ref={svgRef} className="h-full w-full" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${t.x}, ${t.y}) scale(${t.k})`}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [0, 20] }}
              width={1000}
              height={420}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography="/maps/countries.geojson">
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const iso3 =
                      (geo.properties?.ISO_A3 as string) ||
                      (geo.properties?.ADM0_A3 as string) ||
                      "";

                    const name =
                      (geo.properties?.ADMIN as string) ||
                      (geo.properties?.name as string) ||
                      "Unknown";

                    const value = iso3 ? mockValues[iso3] : undefined;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFill(value)}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: "rgba(0,255,198,0.95)" },
                          pressed: { outline: "none" },
                        }}
                        title={`${name}${value ? ` · ${value.toLocaleString()} listeners` : ""}`}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </g>
        </svg>
      </div>

      <button
        type="button"
        onClick={handleResetView}
        className="absolute top-3 right-3 text-xs px-3 py-2 rounded-xl border border-white/10 bg-black/30 text-[#B3B3B3] hover:bg-white/10 hover:text-white transition"
      >
        Reset view
      </button>

      <div className="absolute bottom-12 left-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <span className="text-xs text-[#B3B3B3]">Low</span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(0,255,198,0.22)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(0,255,198,0.35)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(0,255,198,0.55)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(0,255,198,0.85)" }} />
        </div>
        <span className="text-xs text-[#B3B3B3]">High</span>
      </div>

      {/* bottom label */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-xs text-[#B3B3B3]">Audience map (mock)</span>
        <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-black/30 text-[#00FFC6]">
          Live later
        </span>
      </div>
    </div>
  );
}

