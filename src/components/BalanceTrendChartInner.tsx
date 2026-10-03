"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BalancePoint } from "./BalanceTrendChart";

export function BalanceTrendChartInner({ points }: { points: BalancePoint[] }) {
  const max = Math.max(...points.map((p) => p.full ?? p.other ?? 0));

  return (
    <div className="h-44 w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" })
            }
            stroke="#525252"
            fontSize={10}
          />
          <YAxis
            domain={[0, Math.max(30, Math.ceil((max * 1.2) / 10) * 10)]}
            stroke="#525252"
            fontSize={10}
            width={42}
            tickFormatter={(v) => `${v} mV`}
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #404040",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a3a3a3" }}
            labelFormatter={(t) =>
              new Date(t).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            formatter={(v: number, name: string) => [
              `${v} mV`,
              name === "full" ? "Spread near full" : "Spread",
            ]}
          />
          {/* Near-full readings carry the real signal — joined into a trend line. */}
          <Line
            type="monotone"
            dataKey="full"
            stroke="#34d399"
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="other"
            stroke="none"
            dot={{ r: 2.5, fill: "#0a0a0a", stroke: "#737373", strokeWidth: 1.5 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
