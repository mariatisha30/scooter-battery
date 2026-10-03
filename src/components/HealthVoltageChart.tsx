"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./Skeleton";

const Chart = dynamic(() => import("./HealthVoltageChartInner").then((m) => m.HealthVoltageChartInner), {
  ssr: false,
  loading: () => <Skeleton className="h-48 rounded-[22px]" />,
});

export type Point = { t: number; v: number };

export function HealthVoltageChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[22px] border border-dashed border-line px-4 text-center text-xs text-muted">
        Need more readings to plot voltage trend.
      </div>
    );
  }
  return <Chart points={points} />;
}
