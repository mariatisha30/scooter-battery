import { cellStats, formatCellVolts, isBalancing } from "@/lib/cells";

type BarsProps = {
  cellsMv: number[];
  balanceMask?: number | null;
  /** Height of the bar area in px */
  height?: number;
  /** Scale labels + cell-number ticks (Health page). Off for the compact card. */
  detailed?: boolean;
};

/**
 * Each cell drawn as a bar above or below the pack average, in pack order.
 * The scale never shrinks below ±10 mV, so a well-balanced pack looks flat
 * instead of dramatic. Highest cell = state accent, lowest = amber;
 * `detailed` also dots the cells the BMS is balancing.
 */
export function CellBars({ cellsMv, balanceMask, height = 54, detailed = false }: BarsProps) {
  const s = cellStats(cellsMv);
  if (!s) return null;
  const halfRange = Math.max(10, ...cellsMv.map((mv) => Math.abs(mv - s.avg)));
  // Balancing dots need the Health page legend — skip them in the compact card.
  const anyBalancing = detailed && cellsMv.some((_, i) => isBalancing(balanceMask, i));

  return (
    <div className="flex gap-2">
      {detailed && (
        <div
          className="num flex w-10 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-dim"
          style={{ height, marginTop: anyBalancing ? 8 : 0 }}
        >
          <span>+{Math.round(halfRange)} mV</span>
          <span>avg</span>
          <span>−{Math.round(halfRange)} mV</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {anyBalancing && (
          <div className="mb-1 flex h-1 gap-[3px]" aria-hidden>
            {cellsMv.map((_, i) => (
              <span key={i} className="flex flex-1 justify-center">
                {isBalancing(balanceMask, i) && <span className="h-1 w-1 rounded-full bg-em" />}
              </span>
            ))}
          </div>
        )}
        <div
          className="relative flex gap-[3px]"
          style={{ height }}
          role="img"
          aria-label={`${s.count} cells, ${s.delta} mV between highest and lowest`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-line" />
          {cellsMv.map((mv, i) => {
            const cell = i + 1;
            const dev = mv - s.avg;
            const barPx = Math.max(2, (Math.abs(dev) / halfRange) * (height / 2));
            const tone =
              s.delta > 0 && cell === s.maxCell
                ? "bg-hi"
                : s.delta > 0 && cell === s.minCell
                ? "bg-amber"
                : "bg-white/20";
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
          <div className="num mt-1.5 flex gap-[3px] text-[10px] leading-none text-dim" aria-hidden>
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
            ? "border-hi/60"
            : s.delta > 0 && cell === s.minCell
            ? "border-amber/60"
            : "border-line";
        return (
          <div key={cell} className={`rounded-lg border ${edge} bg-white/[0.03] px-1 py-1.5 text-center`}>
            <div className="flex items-center justify-center gap-1 text-[10px] leading-none text-dim">
              {cell}
              {isBalancing(balanceMask, i) && <span className="h-1 w-1 rounded-full bg-em" />}
            </div>
            <div className="num mt-1 text-[14px] font-semibold leading-none text-fg">{formatCellVolts(mv)}</div>
          </div>
        );
      })}
    </div>
  );
}
