"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Range, ListenersPoint } from "./ArtistAnalyticsClient";

type Point = { date: string; listeners: number };

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDayLabel(isoDay: string) {
  const d = new Date(`${isoDay}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export default function ListenersOverTimeChart({
  range,
  points,
}: {
  range: Range;
  points: ListenersPoint[];
}) {
  const data: Point[] = (points || []).map((p) => ({
    date: formatDayLabel(p.day),
    listeners: Number(p.listeners ?? 0),
  }));

  const last = data[data.length - 1]?.listeners ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Listeners over time</div>
          <div className="mt-1 text-sm text-[#B3B3B3]">Server data · Range: {range}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#B3B3B3]">Last point</div>
          <div className="text-base font-semibold text-white">{formatNumber(last)}</div>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
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
              formatter={(value) => [formatNumber(Number(value)), "Listeners"]}
            />
            <Line type="monotone" dataKey="listeners" stroke="#00FFC6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
