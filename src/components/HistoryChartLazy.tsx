"use client";

import dynamic from "next/dynamic";

// Client wrapper so we can use `ssr: false` (Recharts depends on
// ResizeObserver / window-only APIs). The actual HistoryChart code +
// Recharts itself is split into a separate JS chunk loaded after first
// paint, keeping the dashboard's initial bundle small.
export const HistoryChart = dynamic(
  () => import("./HistoryChart").then((m) => m.HistoryChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 animate-pulse rounded-2xl bg-neutral-800/70" />
    ),
  }
);
