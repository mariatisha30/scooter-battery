import Link from "next/link";
import { IconUser, IconUsers } from "@tabler/icons-react";
import {
  BALANCE_CHIP_CLASS,
  BALANCE_LABEL,
  balanceLevel,
  cellStats,
  formatCellVolts,
} from "@/lib/cells";
import { CellBars } from "../CellBars";

export type IconType = React.ComponentType<{
  size?: number;
  stroke?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

export type Tone = "acc" | "idle" | "amber" | "red";
const TONES: Record<Tone, string> = {
  acc: "bg-acc/15 text-acc",
  idle: "bg-white/[0.07] text-fg",
  amber: "bg-amber/15 text-amber",
  red: "bg-red/15 text-red",
};

export function Pill({ tone, icon: I, children }: { tone: Tone; icon: IconType; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-[9px] pr-3 text-xs font-semibold ${TONES[tone]}`}>
      <I size={15} stroke={2} aria-hidden />
      {children}
    </span>
  );
}

export type Rider = "solo" | "pax";

export function RangeToggle({
  rider,
  onChange,
  solo,
  pax,
}: {
  rider: Rider;
  onChange: (r: Rider) => void;
  solo: string;
  pax: string;
}) {
  const opts: [Rider, string, string, IconType][] = [
    ["solo", "Solo", solo, IconUser],
    ["pax", "+1 rider", pax, IconUsers],
  ];
  return (
    <div className="glass flex gap-1 rounded-2xl p-1" role="group" aria-label="Range for">
      {opts.map(([key, label, km, I]) => {
        const on = rider === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
              on ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"
            }`}
          >
            <I size={16} stroke={1.75} aria-hidden />
            {label}
            <span className="num text-[17px] font-semibold text-fg">{km}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Telemetry({ items }: { items: [label: string, value: string, accent?: boolean][] }) {
  return (
    <section
      className="glass grid rounded-[20px] px-1 py-3"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(([k, v, acc], i) => (
        <div key={k} className={`text-center ${i ? "shadow-[-1px_0_0_var(--color-line)]" : ""}`}>
          <span className="num block text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">{k}</span>
          <span className={`num mt-0.5 block text-2xl font-semibold ${acc ? "text-acc" : "text-fg"}`}>{v}</span>
        </div>
      ))}
    </section>
  );
}

export function CellsCard({
  cells,
  balanceMask,
  underLoad,
}: {
  cells: number[] | null;
  balanceMask?: number | null;
  underLoad?: boolean;
}) {
  const s = cellStats(cells);
  const level = s ? balanceLevel(s) : null;
  return (
    <Link href="/health" className="glass block rounded-[22px] px-3.5 pb-3 pt-3.5 transition-colors hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{s ? `${s.count} cells` : "Cells"}</h3>
        {s &&
          (underLoad ? (
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-muted">
              Under load · {s.delta} mV spread
            </span>
          ) : (
            level && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BALANCE_CHIP_CLASS[level]}`}>
                {BALANCE_LABEL[level]} · {s.delta} mV spread
              </span>
            )
          ))}
      </div>
      {s && cells ? (
        <>
          <div className="mt-3">
            <CellBars cellsMv={cells} balanceMask={balanceMask} height={54} />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] text-muted">
            <span>
              Low <b className="font-medium text-fg">{formatCellVolts(s.min)}</b> #{s.minCell}
            </span>
            <span>
              Avg <b className="font-medium text-fg">{formatCellVolts(s.avg)} V</b>
            </span>
            <span>
              High <b className="font-medium text-fg">{formatCellVolts(s.max)}</b> #{s.maxCell}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-muted">Cell voltages appear after your next sync.</p>
      )}
    </Link>
  );
}

export function StatsRow({
  cycles,
  alarms,
  peakTemp,
}: {
  cycles: number | null;
  /** null = not tracked yet */
  alarms: number | null;
  peakTemp: number | null;
}) {
  const stats: [string, string, string][] = [
    [cycles != null ? String(cycles) : "—", "cycles", "text-fg"],
    [alarms != null ? String(alarms) : "—", "alarms", alarms ? "text-red" : alarms === 0 ? "text-acc" : "text-fg"],
    [peakTemp != null ? `${peakTemp.toFixed(1)}°` : "—", "peak temp", "text-fg"],
  ];
  return (
    <Link
      href="/health"
      className="glass grid grid-cols-3 rounded-[22px] px-1 py-3.5 text-center transition-colors hover:bg-white/[0.06]"
    >
      {stats.map(([v, l, tone]) => (
        <div key={l}>
          <b className={`num block text-[30px] font-semibold leading-[1.05] ${tone}`}>{v}</b>
          <span className="text-[11px] text-dim">{l}</span>
        </div>
      ))}
    </Link>
  );
}
