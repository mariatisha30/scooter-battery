"use client";

import { useId } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { t: number; pct: number };

export function HistoryChart({ data, floor }: { data: Point[]; floor: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="mt-3 h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, left: -26, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--acc2)", stopOpacity: 0.28 }} />
              <stop offset="1" style={{ stopColor: "var(--acc2)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id={`line${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: "var(--acc2)" }} />
              <stop offset="1" style={{ stopColor: "var(--acc)" }} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fill: "#76827b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fill: "#76827b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "rgb(255 255 255 / 0.15)" }}
            contentStyle={{
              background: "#0b0e0c",
              border: "1px solid rgb(255 255 255 / 0.1)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#8d9a94" }}
            labelFormatter={(v) =>
              new Date(v as number).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            formatter={(value) => [`${value}%`, "Battery"]}
          />
          <ReferenceLine y={floor} stroke="#ff5e5e" strokeOpacity={0.6} strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="pct"
            stroke={`url(#line${id})`}
            strokeWidth={2.2}
            fill={`url(#fill${id})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, style: { fill: "var(--acc)" } }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
