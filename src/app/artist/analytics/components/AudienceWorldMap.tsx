"use client";

import { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

function normalizeIso2(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!c) return null;
  const cleaned = c.replace(/[^A-Z]/g, "");
  if (cleaned.length !== 2) return null;
  return cleaned;
}

type Item = {
  country_iso2: string;     // ISO2 only
  listeners_30d: number;   // rolling 30d
};

export default function AudienceWorldMap(props: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const byIso2 = useMemo(() => {
    const m = new Map<string, Item>();
    for (const row of props.items || []) {
      const iso2 = normalizeIso2(row.country_iso2);
      if (!iso2) continue;
      m.set(iso2, row);
    }
    return m;
  }, [props.items]);

  const [tip, setTip] = useState<null | { x: number; y: number; name: string; value: number }>(null);
  const [hoverCode, setHoverCode] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  return (
    <div ref={containerRef} className="relative mt-4 h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
      {/* Tooltip (außerhalb SVG) */}
      {tip ? (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs text-white"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <div className="font-semibold">{tip.name}</div>
          <div className="text-[#B3B3B3]">
            {tip.value > 0 ? `Listeners: ${tip.value}` : "No listeners yet"}
          </div>
        </div>
      ) : null}

      <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(z + 0.5, 1, 6))}
          className="h-9 w-9 rounded-lg border border-white/10 bg-black/60 text-white/90 hover:bg-black/80"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(z - 0.5, 1, 6))}
          className="h-9 w-9 rounded-lg border border-white/10 bg-black/60 text-white/90 hover:bg-black/80"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="h-9 w-9 rounded-lg border border-white/10 bg-black/60 text-white/90 hover:bg-black/80"
          aria-label="Reset zoom"
        >
          ⟳
        </button>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [0, 20] }}
        width={1000}
        height={420}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          zoom={zoom}
          minZoom={1}
          maxZoom={6}
          onMoveStart={() => {
            setIsDragging(true);
            setTip(null);
            setHoverCode(null);
          }}
          onMoveEnd={() => {
            setIsDragging(false);
          }}
        >
        <Geographies geography="/maps/countries_iso2.geojson">
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const props: any = geo.properties ?? {};

              const iso2 =
                normalizeIso2(props.ISO_A2) ??
                normalizeIso2(props.ISO2) ??
                normalizeIso2(props.iso_a2) ??
                normalizeIso2(props.iso2);

              const matched = iso2 ? byIso2.get(iso2) : undefined;
              const value = matched ? Number((matched as any).listeners_30d ?? 0) : 0;

              const name =
                props.NAME || props.ADMIN || props.name || "Unknown";

              const hasValue = value > 0;
              const keyCode = (iso2 ?? "").toUpperCase();

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseMove={(e: React.MouseEvent) => {
                    if (isDragging) return;
                    setHoverCode(keyCode || null);
                    const el = containerRef.current;
                    if (!el) return;
                    const rect = el.getBoundingClientRect();
                    setTip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      name,
                      value,
                    });
                  }}
                  onMouseLeave={() => {
                    if (isDragging) return;
                    setTip(null);
                    setHoverCode(null);
                  }}
                  style={{
                    default: {
                      fill: hasValue ? "rgba(0,255,198,0.25)" : "rgba(255,255,255,0.06)",
                      stroke: "rgba(255,255,255,0.10)",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: "rgba(0,255,198,0.70)",
                      stroke: "rgba(0,255,198,0.55)",
                      strokeWidth: 0.9,
                      filter: "drop-shadow(0 0 10px rgba(0,255,198,0.55))",
                      outline: "none",
                      cursor: isDragging ? "grabbing" : "pointer",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
