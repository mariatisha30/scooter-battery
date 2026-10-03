"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

// Recharts needs window APIs; load it after first paint in its own chunk.
const HistoryChart = dynamic(() => import("./HistoryChart").then((m) => m.HistoryChart), {
  ssr: false,
  loading: () => <div className="mt-3 h-40 animate-pulse rounded-xl bg-white/[0.04]" />,
});

type Point = { t: number; pct: number };
type RangeKey = "7d" | "30d" | "all";

const RANGES: { key: RangeKey; label: string; title: string; days: number | null }[] = [
  { key: "7d", label: "7D", title: "Last 7 days", days: 7 },
  { key: "30d", label: "30D", title: "Last 30 days", days: 30 },
  { key: "all", label: "All", title: "All readings", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function HistoryCard({ points, floor }: { points: Point[]; floor: number }) {
  const [range, setRange] = useState<RangeKey>("7d");
  const active = RANGES.find((r) => r.key === range)!;

  const filtered = useMemo(() => {
    if (active.days == null) return points;
    const cutoff = Date.now() - active.days * DAY_MS;
    return points.filter((p) => p.t >= cutoff);
  }, [points, active.days]);

  return (
    <section className="glass rounded-[22px] px-3.5 pb-2.5 pt-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{active.title}</h3>
        <div className="flex gap-0.5 rounded-full bg-white/[0.05] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`num rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-wider transition-colors ${
                range === r.key ? "bg-white/[0.1] text-fg" : "text-dim hover:text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="mt-3 flex h-40 items-center justify-center text-xs text-muted">
          No readings in this range yet.
        </div>
      ) : (
        <HistoryChart data={filtered} floor={floor} />
      )}
    </section>
  );
}
