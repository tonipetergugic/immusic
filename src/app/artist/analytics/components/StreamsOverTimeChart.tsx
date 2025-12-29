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

type Point = { date: string; streams: number };

const mockStreams: Point[] = [
  { date: "Dec 01", streams: 120 },
  { date: "Dec 05", streams: 180 },
  { date: "Dec 09", streams: 140 },
  { date: "Dec 13", streams: 260 },
  { date: "Dec 17", streams: 220 },
  { date: "Dec 21", streams: 310 },
  { date: "Dec 25", streams: 280 },
  { date: "Dec 28", streams: 360 },
];

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function StreamsOverTimeChart() {
  const last = mockStreams[mockStreams.length - 1]?.streams ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Streams over time</div>
          <div className="mt-1 text-sm text-[#B3B3B3]">
            Mock data (Phase 2) — will be wired to Supabase later
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#B3B3B3]">Last point</div>
          <div className="text-base font-semibold text-white">{formatNumber(last)}</div>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockStreams} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
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
        </ResponsiveContainer>
      </div>
    </div>
  );
}

