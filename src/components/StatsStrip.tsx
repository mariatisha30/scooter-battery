type Props = {
  tripCount: number;
  totalKm: number;
  lastTripDate: string | null;
};

export function StatsStrip({ tripCount, totalKm, lastTripDate }: Props) {
  return (
    <section className="grid grid-cols-3 divide-x divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900/50">
      <Stat label="Trips" value={String(tripCount)} />
      <Stat label="Total km" value={totalKm.toFixed(0)} />
      <Stat
        label="Last ride"
        value={lastTripDate ? relativeDay(lastTripDate) : "—"}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-xl font-semibold tabular-nums text-neutral-100">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yest.";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}
