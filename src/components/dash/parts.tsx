import Link from "next/link";
import { IconChevronRight, IconUser, IconUsers } from "@tabler/icons-react";
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

/** Charge left as a small battery: lime normally, amber under 25%, red under 10%. */
export function MiniBattery({ pct }: { pct: number | null }) {
  const fill =
    pct === null
      ? "bg-white/20"
      : pct < 10
      ? "bg-red"
      : pct < 25
      ? "bg-amber"
      : "bg-linear-to-r from-acc2 to-acc";
  return (
    <div className="flex items-center gap-2" aria-label={pct === null ? "No reading yet" : `${pct}% charge left`}>
      <span className="relative h-[18px] w-[46px] rounded-[6px] p-[2px] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.28)]">
        <span className={`block h-full rounded-[3.5px] ${fill}`} style={{ width: `${pct ?? 0}%` }} />
        <span className="absolute -right-[4px] top-[5px] h-2 w-[3px] rounded-r-[2px] bg-white/28" />
      </span>
      <b className="num text-[22px] font-semibold leading-none">{pct === null ? "—" : `${pct}%`}</b>
    </div>
  );
}

export type StatRow = {
  icon: IconType;
  title: string;
  sub: string;
  value: string;
  unit: string;
  tone?: string;
  iconTone?: string;
  href?: string;
};

/** Scooter stats as one glass list: label + detail on the left, value right. */
export function StatsList({ rows }: { rows: StatRow[] }) {
  return (
    <section className="glass overflow-hidden rounded-[22px] py-1">
      {rows.map((r, i) => {
        const body = (
          <>
            <span
              className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-white/[0.05] ${r.iconTone ?? "text-muted"}`}
            >
              <r.icon size={17} stroke={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px]">{r.title}</span>
              <span className="block truncate text-[11px] text-dim">{r.sub}</span>
            </span>
            <span className={`num flex shrink-0 items-baseline gap-1 text-[22px] font-semibold leading-none ${r.tone ?? "text-fg"}`}>
              {r.value}
              {r.unit && <small className="text-sm font-semibold text-muted">{r.unit}</small>}
              {r.href && <IconChevronRight size={14} stroke={1.75} className="self-center text-dim" aria-hidden />}
            </span>
          </>
        );
        const cls = `flex items-center gap-3 px-4 py-3 ${i ? "shadow-[inset_0_1px_0_var(--color-line)]" : ""}`;
        return r.href ? (
          <Link key={r.title} href={r.href} className={`${cls} transition-colors hover:bg-white/[0.04]`}>
            {body}
          </Link>
        ) : (
          <div key={r.title} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
