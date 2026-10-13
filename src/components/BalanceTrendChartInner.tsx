"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BalancePoint } from "./BalanceTrendChart";

export function BalanceTrendChartInner({ points }: { points: BalancePoint[] }) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(...points.map((p) => p.full ?? p.other ?? 0));

  return (
    <div className="glass h-44 w-full rounded-[22px] p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`bal${id}`} x1="0" y1="0" x2="1" y2="0">
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
            domain={[0, Math.max(30, Math.ceil((max * 1.2) / 10) * 10)]}
            tick={{ fill: "#76827b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(v) => `${v} mV`}
          />
          <Tooltip
            contentStyle={{ background: "#0b0e0c", border: "1px solid rgb(255 255 255 / 0.1)", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "#8d9a94" }}
            labelFormatter={(t) =>
              new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            }
            formatter={(v: number, name: string) => [`${v} mV`, name === "full" ? "Spread near full" : "Spread"]}
          />
          {/* Near-full readings carry the real signal — joined into a trend line. */}
          <Line
            type="monotone"
            dataKey="full"
            stroke={`url(#bal${id})`}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, strokeWidth: 0, style: { fill: "var(--acc)" } }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="other"
            stroke="none"
            dot={{ r: 2.5, fill: "#040605", stroke: "#76827b", strokeWidth: 1.5 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
