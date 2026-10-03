"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Point } from "./HealthVoltageChart";

export function HealthVoltageChartInner({ points }: { points: Point[] }) {
  const id = useId().replace(/:/g, "");
  const ys = points.map((p) => p.v);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = Math.max(0.5, (max - min) * 0.15);

  return (
    <div className="glass h-48 w-full rounded-[22px] p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: -4 }}>
          <defs>
            <linearGradient id={`v${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: "var(--acc2)" }} />
              <stop offset="1" style={{ stopColor: "var(--acc)" }} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            tick={{ fill: "#76827b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fill: "#76827b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(v) => `${v.toFixed(0)} V`}
          />
          <Tooltip
            contentStyle={{ background: "#0b0e0c", border: "1px solid rgb(255 255 255 / 0.1)", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "#8d9a94" }}
            labelFormatter={(t) =>
              new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            }
            formatter={(v: number) => [`${v.toFixed(2)} V`, "Pack voltage"]}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={`url(#v${id})`}
            strokeWidth={2}
            dot={{ r: 2, strokeWidth: 0, style: { fill: "var(--acc)" } }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
