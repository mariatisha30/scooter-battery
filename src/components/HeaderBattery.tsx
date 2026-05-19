export function HeaderBattery({ pct, floor }: { pct: number | null; floor: number }) {
  if (pct === null) return null;
  const color =
    pct <= floor
      ? "text-red-300 border-red-500/30 bg-red-500/10"
      : pct <= floor + 15
      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
      : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${color}`}
      title="Current battery"
    >
      {pct}%
    </span>
  );
}
