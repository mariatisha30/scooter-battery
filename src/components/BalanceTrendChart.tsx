"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./Skeleton";

const Chart = dynamic(() => import("./BalanceTrendChartInner").then((m) => m.BalanceTrendChartInner), {
  ssr: false,
  loading: () => <Skeleton className="h-44 rounded-2xl" />,
});

/** One cell-spread sample; exactly one of `full` / `other` is set. */
export type BalancePoint = { t: number; full: number | null; other: number | null };

export function BalanceTrendChart({ points }: { points: BalancePoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-neutral-800 px-4 text-center text-xs text-neutral-500">
        The trend builds up as you sync. Readings right after a full charge count most.
      </div>
    );
  }
  return <Chart points={points} />;
}
