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

type Range = "7d" | "28d" | "all";
type Point = { date: string; streams: number };

const mockStreamsAll: Point[] = [
  { date: "Dec 01", streams: 120 },
  { date: "Dec 02", streams: 135 },
  { date: "Dec 03", streams: 128 },
  { date: "Dec 04", streams: 142 },
  { date: "Dec 05", streams: 180 },
  { date: "Dec 06", streams: 165 },
  { date: "Dec 07", streams: 190 },
  { date: "Dec 08", streams: 155 },
  { date: "Dec 09", streams: 140 },
  { date: "Dec 10", streams: 172 },
  { date: "Dec 11", streams: 210 },
  { date: "Dec 12", streams: 225 },
  { date: "Dec 13", streams: 260 },
  { date: "Dec 14", streams: 240 },
  { date: "Dec 15", streams: 230 },
  { date: "Dec 16", streams: 215 },
  { date: "Dec 17", streams: 220 },
  { date: "Dec 18", streams: 245 },
  { date: "Dec 19", streams: 270 },
  { date: "Dec 20", streams: 290 },
  { date: "Dec 21", streams: 310 },
  { date: "Dec 22", streams: 295 },
  { date: "Dec 23", streams: 305 },
  { date: "Dec 24", streams: 315 },
  { date: "Dec 25", streams: 280 },
  { date: "Dec 26", streams: 300 },
  { date: "Dec 27", streams: 330 },
  { date: "Dec 28", streams: 360 },
];

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function StreamsOverTimeChart({ range }: { range: Range }) {
  const data =
    range === "7d"
      ? mockStreamsAll.slice(-7)
      : range === "28d"
      ? mockStreamsAll.slice(-28)
      : mockStreamsAll;

  const last = data[data.length - 1]?.streams ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Streams over time</div>
          <div className="mt-1 text-sm text-[#B3B3B3]">
            Mock data (Phase 2) · Range: {range} · Supabase later
          </div>
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

