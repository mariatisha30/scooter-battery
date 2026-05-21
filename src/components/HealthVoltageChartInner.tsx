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
import type { Point } from "./HealthVoltageChart";

export function HealthVoltageChartInner({ points }: { points: Point[] }) {
  const ys = points.map((p) => p.v);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = Math.max(0.5, (max - min) * 0.15);

  return (
    <div className="h-48 w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 p-2">
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
            domain={[min - pad, max + pad]}
            stroke="#525252"
            fontSize={10}
            width={42}
            tickFormatter={(v) => `${v.toFixed(1)}V`}
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
            formatter={(v: number) => [`${v.toFixed(2)} V`, "Pack voltage"]}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 2, fill: "#34d399" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
