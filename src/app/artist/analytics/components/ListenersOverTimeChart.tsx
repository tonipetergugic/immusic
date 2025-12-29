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
type Point = { date: string; listeners: number };

const mockAll: Point[] = [
  { date: "Dec 01", listeners: 42 },
  { date: "Dec 02", listeners: 46 },
  { date: "Dec 03", listeners: 45 },
  { date: "Dec 04", listeners: 48 },
  { date: "Dec 05", listeners: 55 },
  { date: "Dec 06", listeners: 52 },
  { date: "Dec 07", listeners: 58 },
  { date: "Dec 08", listeners: 50 },
  { date: "Dec 09", listeners: 49 },
  { date: "Dec 10", listeners: 54 },
  { date: "Dec 11", listeners: 62 },
  { date: "Dec 12", listeners: 64 },
  { date: "Dec 13", listeners: 71 },
  { date: "Dec 14", listeners: 69 },
  { date: "Dec 15", listeners: 66 },
  { date: "Dec 16", listeners: 63 },
  { date: "Dec 17", listeners: 65 },
  { date: "Dec 18", listeners: 68 },
  { date: "Dec 19", listeners: 72 },
  { date: "Dec 20", listeners: 78 },
  { date: "Dec 21", listeners: 82 },
  { date: "Dec 22", listeners: 79 },
  { date: "Dec 23", listeners: 81 },
  { date: "Dec 24", listeners: 83 },
  { date: "Dec 25", listeners: 74 },
  { date: "Dec 26", listeners: 77 },
  { date: "Dec 27", listeners: 86 },
  { date: "Dec 28", listeners: 92 },
];

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function ListenersOverTimeChart({ range }: { range: Range }) {
  const data =
    range === "7d" ? mockAll.slice(-7) : range === "28d" ? mockAll.slice(-28) : mockAll;

  const last = data[data.length - 1]?.listeners ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Listeners over time</div>
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
              formatter={(value) => [formatNumber(Number(value)), "Listeners"]}
            />
            <Line
              type="monotone"
              dataKey="listeners"
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

