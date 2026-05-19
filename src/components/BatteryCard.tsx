type Props = {
  pct: number | null;
  remainingKm: number;
  floor: number;
  kmPerPct: number;
  source: "calibrated" | "default";
  sampleSize: number;
  lastLoggedAt: string | null;
};

export function BatteryCard({ pct, remainingKm, floor, kmPerPct, source, sampleSize, lastLoggedAt }: Props) {
  const color = pct === null
    ? "text-neutral-500"
    : pct <= floor
    ? "text-red-400"
    : pct <= floor + 15
    ? "text-amber-400"
    : "text-emerald-400";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="text-xs uppercase tracking-wider text-neutral-500">Current battery</div>
      <div className={`mt-1 text-6xl font-semibold tabular-nums ${color}`}>
        {pct === null ? "—" : `${pct}%`}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">Range left</div>
          <div className="mt-1 text-2xl font-medium tabular-nums">
            {pct === null ? "—" : `${remainingKm.toFixed(1)} km`}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">down to {floor}%</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">km / %</div>
          <div className="mt-1 text-2xl font-medium tabular-nums">{kmPerPct.toFixed(2)}</div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {source === "calibrated" ? `from ${sampleSize} trip${sampleSize === 1 ? "" : "s"}` : "default"}
          </div>
        </div>
      </div>

      {lastLoggedAt && (
        <div className="mt-4 text-[11px] text-neutral-500">
          Last logged {new Date(lastLoggedAt).toLocaleString()}
        </div>
      )}
    </section>
  );
}
