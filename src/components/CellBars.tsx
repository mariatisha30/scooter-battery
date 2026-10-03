import { cellStats, formatCellVolts, isBalancing } from "@/lib/cells";

type BarsProps = {
  cellsMv: number[];
  balanceMask?: number | null;
  /** Height of the bar area in px */
  height?: number;
  /** Scale labels + cell-number ticks (Health page). Off for the compact strip. */
  detailed?: boolean;
};

/**
 * Each cell drawn as a bar above or below the pack average, in pack order.
 * The scale never shrinks below ±10 mV, so a well-balanced pack looks flat
 * instead of dramatic. Highest cell sky, lowest amber; `detailed` dots balancing cells.
 */
export function CellBars({ cellsMv, balanceMask, height = 64, detailed = false }: BarsProps) {
  const s = cellStats(cellsMv);
  if (!s) return null;
  const halfRange = Math.max(10, ...cellsMv.map((mv) => Math.abs(mv - s.avg)));
  // Balancing dots need the Health page legend — skip them in the compact strip.
  const anyBalancing = detailed && cellsMv.some((_, i) => isBalancing(balanceMask, i));

  return (
    <div className="flex gap-2">
      {detailed && (
        <div
          className="flex w-10 shrink-0 flex-col justify-between text-right text-[9px] leading-none tabular-nums text-neutral-600"
          style={{ height, marginTop: anyBalancing ? 8 : 0 }}
        >
          <span>+{Math.round(halfRange)} mV</span>
          <span>avg</span>
          <span>−{Math.round(halfRange)} mV</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {anyBalancing && (
          <div className="mb-1 flex h-1 gap-[2px]" aria-hidden>
            {cellsMv.map((_, i) => (
              <span key={i} className="flex flex-1 justify-center">
                {isBalancing(balanceMask, i) && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
              </span>
            ))}
          </div>
        )}
        <div
          className="relative flex gap-[2px]"
          style={{ height }}
          role="img"
          aria-label={`${s.count} cells, ${s.delta} mV between highest and lowest`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-neutral-700/70" />
          {cellsMv.map((mv, i) => {
            const cell = i + 1;
            const dev = mv - s.avg;
            const barPx = Math.max(1.5, (Math.abs(dev) / halfRange) * (height / 2));
            const tone =
              s.delta > 0 && cell === s.maxCell
                ? "bg-sky-400"
                : s.delta > 0 && cell === s.minCell
                ? "bg-amber-400"
                : "bg-neutral-500";
            return (
              <div key={cell} className="relative flex-1" title={`Cell ${cell} · ${formatCellVolts(mv)} V`}>
                <div
                  className={`absolute inset-x-0 rounded-[2px] ${tone}`}
                  style={dev >= 0 ? { bottom: "50%", height: barPx } : { top: "50%", height: barPx }}
                />
              </div>
            );
          })}
        </div>
        {detailed && (
          <div className="mt-1.5 flex gap-[2px] text-[9px] leading-none tabular-nums text-neutral-600" aria-hidden>
            {cellsMv.map((_, i) => (
              <span key={i} className="flex-1 text-center">
                {i === 0 || (i + 1) % 6 === 0 ? i + 1 : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Every cell's exact voltage, 6 per row. */
export function CellGrid({ cellsMv, balanceMask }: { cellsMv: number[]; balanceMask?: number | null }) {
  const s = cellStats(cellsMv);
  if (!s) return null;
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {cellsMv.map((mv, i) => {
        const cell = i + 1;
        const edge =
          s.delta > 0 && cell === s.maxCell
            ? "border-sky-400/50"
            : s.delta > 0 && cell === s.minCell
            ? "border-amber-400/50"
            : "border-neutral-800";
        return (
          <div key={cell} className={`rounded-lg border ${edge} bg-neutral-950/60 px-1 py-1.5 text-center`}>
            <div className="flex items-center justify-center gap-1 text-[9px] leading-none text-neutral-500">
              {cell}
              {isBalancing(balanceMask, i) && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
            </div>
            <div className="mt-1 text-[11px] font-medium leading-none tabular-nums text-neutral-200">
              {formatCellVolts(mv)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
