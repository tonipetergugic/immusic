"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Range, StreamsPoint } from "./ArtistAnalyticsClient";

type Point = { date: string; streams: number };

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDayLabel(isoDay: string) {
  const d = new Date(`${isoDay}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export default function StreamsOverTimeChart({
  range,
  points,
}: {
  range: Range;
  points: StreamsPoint[];
}) {
  const data: Point[] = (points || []).map((p) => ({
    date: formatDayLabel(p.day),
    streams: Number(p.streams ?? 0),
  }));

  const last = data[data.length - 1]?.streams ?? 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setChartWidth(Math.max(0, Math.floor(rect.width)));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Streams over time</div>
          <div className="mt-1 text-sm text-[#B3B3B3]">Server data · Range: {range}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#B3B3B3]">Last point</div>
          <div className="text-base font-semibold text-white">{formatNumber(last)}</div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-6 h-[360px] w-full min-w-0"
        style={{ minHeight: 360 }}
      >
        {chartWidth > 0 ? (
          <LineChart
            width={chartWidth}
            height={360}
            data={data}
            margin={{ top: 10, right: 14, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />

            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
            />

            <YAxis
              width={44}
              tickFormatter={(v) => formatNumber(Number(v))}
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
            />

            <Tooltip
              contentStyle={{
                background: "#0E0E10",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "white",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.8)" }}
              formatter={(value) => [formatNumber(Number(value)), "Streams"]}
            />

            <Line
              type="monotone"
              dataKey="streams"
              stroke="#00FFC6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        ) : (
          <div className="h-full w-full rounded-xl border border-white/10 bg-black/10" />
        )}
      </div>
    </div>
  );
}
