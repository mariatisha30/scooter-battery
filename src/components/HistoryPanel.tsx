"use client";

import { useMemo, useState } from "react";
import { HistoryChart } from "./HistoryChartLazy";

type Point = { t: number; pct: number };

type RangeKey = "7d" | "30d" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "all", label: "All", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function HistoryPanel({ points, floor }: { points: Point[]; floor: number }) {
  const [range, setRange] = useState<RangeKey>("30d");

  const filtered = useMemo(() => {
    if (range === "all") return points;
    const days = RANGES.find((r) => r.key === range)?.days;
    if (days == null) return points;
    const cutoff = Date.now() - days * DAY_MS;
    return points.filter((p) => p.t >= cutoff);
  }, [points, range]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          History
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-full border border-neutral-800 bg-neutral-950 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  range === r.key
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                aria-pressed={range === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] tabular-nums uppercase tracking-wider text-neutral-500">
            {filtered.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-neutral-800 text-xs text-neutral-500">
          No readings in this range yet.
        </div>
      ) : (
        <HistoryChart data={filtered} floor={floor} />
      )}
    </section>
  );
}
