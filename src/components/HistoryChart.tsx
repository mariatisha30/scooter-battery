"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { t: number; pct: number };

export function HistoryChart({ data, floor }: { data: Point[]; floor: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-neutral-800 text-sm text-neutral-500">
        No readings yet — log your first battery %.
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            }
            tick={{ fill: "#737373", fontSize: 11 }}
            stroke="#404040"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "#737373", fontSize: 11 }}
            stroke="#404040"
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #262626",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => new Date(v as number).toLocaleString()}
            formatter={(value) => [`${value}%`, "Battery"]}
          />
          <ReferenceLine y={floor} stroke="#f87171" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 2, fill: "#34d399" }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
