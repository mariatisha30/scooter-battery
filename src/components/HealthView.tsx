import Link from "next/link";
import { IconArrowLeft, IconArrowRight, IconChevronDown } from "@tabler/icons-react";
import {
  BALANCE_LABEL,
  BALANCE_TEXT_CLASS,
  balanceLevel,
  balanceZone,
  cellStats,
  formatCellVolts,
  isBalancing,
  protectionLabels,
  type BalanceZone,
  type CellStats,
} from "@/lib/cells";
import { detectChargeSessions, formatChargeDuration } from "@/lib/charging";
import { formatLocalDateTime } from "@/lib/datetime";
import type { BatteryLog } from "@/lib/supabase";
import { BalanceTrendChart, type BalancePoint } from "./BalanceTrendChart";
import { CellBars, CellGrid } from "./CellBars";
import { HealthVoltageChart } from "./HealthVoltageChart";

// LiFePO4 packs are typically rated for ~2000–3000 full cycles to 80% capacity.
const EXPECTED_CYCLES = 2500;

type CellReading = { log: BatteryLog; cells: number[]; stats: CellStats };

const ZONE_NOTE: Record<BalanceZone, string> = {
  top: "Read near full, where differences between cells show best.",
  mid: "Mid-charge, LFP cells look alike even when they aren't. The reading right after a full charge is the real test.",
  bottom: "Read near empty, where a weak cell shows up first.",
};

function shortDate(iso: string) {
  return formatLocalDateTime(iso, { day: "numeric", month: "short" });
}
function shortDateTime(iso: string) {
  return formatLocalDateTime(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Health page body. `logs` are newest first. */
export function HealthView({ logs }: { logs: BatteryLog[] }) {
  const cellReadings: CellReading[] = logs.flatMap((log) => {
    const stats = cellStats(log.cell_mv);
    return stats && log.cell_mv ? [{ log, cells: log.cell_mv, stats }] : [];
  });
  const latestCells = cellReadings[0] ?? null;
  const fullReadings = cellReadings.filter((r) => balanceZone(r.stats) === "top");
  // The verdict prefers the latest near-full reading — that's where LFP
  // differences actually show.
  const balanceRef = fullReadings[0] ?? latestCells;
  const balance = balanceRef ? balanceLevel(balanceRef.stats) : null;
  const runner = repeatHighCell(fullReadings);
  const balancingNow = latestCells
    ? latestCells.cells.some((_, i) => isBalancing(latestCells.log.balance_mask, i))
    : false;

  const withCycles = logs.filter((l) => l.cycles != null);
  const latestCycles = withCycles[0]?.cycles ?? null;
  const lifeUsedPct = latestCycles != null ? (latestCycles / EXPECTED_CYCLES) * 100 : null;

  const withTemp = logs.filter((l) => l.max_temp_c != null);
  const maxTempEver = withTemp.length ? Math.max(...withTemp.map((l) => Number(l.max_temp_c))) : null;
  const avgTemp = withTemp.length
    ? withTemp.reduce((s, l) => s + Number(l.max_temp_c), 0) / withTemp.length
    : null;

  const withProtection = logs.filter((l) => l.protection != null);
  const alarmEvents = withProtection.filter((l) => l.protection !== 0);

  const nominalAh = logs.find((l) => l.nominal_ah != null)?.nominal_ah ?? null;
  const chips = [
    "LiFePO4",
    latestCells ? `${latestCells.stats.count}S` : null,
    nominalAh != null ? `${Number(nominalAh).toFixed(0)} Ah` : null,
  ].filter((c): c is string => c !== null);

  const balancePoints: BalancePoint[] = cellReadings
    .slice()
    .reverse()
    .map((r) => {
      const full = balanceZone(r.stats) === "top";
      return {
        t: new Date(r.log.logged_at).getTime(),
        full: full ? r.stats.delta : null,
        other: full ? null : r.stats.delta,
      };
    });

  // Pack voltage trend: one point per reading, oldest → newest
  const voltagePoints = logs
    .filter((l) => l.voltage_v != null)
    .reverse()
    .map((l) => ({ t: new Date(l.logged_at).getTime(), v: Number(l.voltage_v) }));

  const charges = detectChargeSessions(logs);

  return (
    <div className="space-y-6">
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">Battery health</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-neutral-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Long-term signals from your BMS. Watch the trend over weeks, not minutes.
        </p>
      </div>

      {/* Headline cards */}
      <section className="grid grid-cols-2 gap-3">
        <Card>
          <Stat label="Cell balance">
            {balanceRef && balance ? (
              <span className={`text-2xl font-semibold tabular-nums ${BALANCE_TEXT_CLASS[balance]}`}>
                {balanceRef.stats.delta}
                <span className="ml-1 text-sm font-medium">mV</span>
              </span>
            ) : (
              <span className="text-2xl font-semibold text-neutral-500">—</span>
            )}
          </Stat>
          <Sub>
            {balanceRef && balance
              ? `${BALANCE_LABEL[balance]} · at ${balanceRef.log.battery_pct}%`
              : "Shows after your next sync"}
          </Sub>
        </Card>

        <Card>
          <Stat label="Cycles">
            <span className="text-2xl font-semibold tabular-nums text-emerald-300">
              {latestCycles ?? "—"}
            </span>
            {latestCycles != null && (
              <span className="ml-1 text-xs text-neutral-500">
                / ~{EXPECTED_CYCLES.toLocaleString("en-US")}
              </span>
            )}
          </Stat>
          <Sub>
            {lifeUsedPct == null
              ? "Sync to see"
              : `${lifeUsedPct < 1 ? "Under 1%" : `${Math.round(lifeUsedPct)}%`} of rated life used`}
          </Sub>
        </Card>

        <Card>
          <Stat label="Hottest ever">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                maxTempEver == null
                  ? "text-neutral-500"
                  : maxTempEver > 55
                  ? "text-red-300"
                  : maxTempEver > 45
                  ? "text-amber-300"
                  : "text-emerald-300"
              }`}
            >
              {maxTempEver != null ? `${maxTempEver.toFixed(1)}°` : "—"}
            </span>
          </Stat>
          {avgTemp != null && <Sub>avg {avgTemp.toFixed(1)}° across {withTemp.length} reads</Sub>}
        </Card>

        <Card>
          <Stat label="BMS alarms">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                alarmEvents.length > 0
                  ? "text-red-300"
                  : withProtection.length > 0
                  ? "text-emerald-300"
                  : "text-neutral-500"
              }`}
            >
              {withProtection.length === 0 ? "—" : alarmEvents.length === 0 ? "None" : alarmEvents.length}
            </span>
          </Stat>
          <Sub>
            {withProtection.length === 0
              ? "Tracked from your next sync"
              : alarmEvents.length === 0
              ? `in ${withProtection.length} reading${withProtection.length === 1 ? "" : "s"}`
              : `latest ${shortDate(alarmEvents[0].logged_at)}`}
          </Sub>
        </Card>
      </section>

      {/* Cells */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <SectionTitle>Cells</SectionTitle>
          {latestCells && (
            <span className="text-[10px] tabular-nums text-neutral-500">
              {shortDateTime(latestCells.log.logged_at)} · {latestCells.log.battery_pct}%
            </span>
          )}
        </div>
        {latestCells ? (
          <>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
              <CellBars
                cellsMv={latestCells.cells}
                balanceMask={latestCells.log.balance_mask}
                height={88}
                detailed
              />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-center">
                <MiniStat
                  label="Lowest"
                  value={formatCellVolts(latestCells.stats.min)}
                  sub={`cell ${latestCells.stats.minCell}`}
                  tone="text-amber-300"
                />
                <MiniStat label="Average" value={formatCellVolts(latestCells.stats.avg)} sub="volts" />
                <MiniStat
                  label="Highest"
                  value={formatCellVolts(latestCells.stats.max)}
                  sub={`cell ${latestCells.stats.maxCell}`}
                  tone="text-sky-300"
                />
              </div>
              {runner && (
                <p className="mt-3 rounded-lg bg-neutral-950/60 px-3 py-2 text-[11px] text-neutral-300">
                  Cell {runner.cell} was the highest in {runner.count} of {runner.total} full-charge
                  readings. It&apos;s the one to watch.
                </p>
              )}
              <details className="group mt-3 border-t border-neutral-800 pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] text-neutral-400 hover:text-neutral-200 [&::-webkit-details-marker]:hidden">
                  All {latestCells.stats.count} cell voltages
                  <IconChevronDown
                    size={14}
                    stroke={1.75}
                    className="transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="mt-3">
                  <CellGrid cellsMv={latestCells.cells} balanceMask={latestCells.log.balance_mask} />
                </div>
              </details>
            </div>
            <p className="text-[11px] text-neutral-500">
              {ZONE_NOTE[balanceZone(latestCells.stats)]}
              {balancingNow && " Green dots mark cells the BMS was balancing."}
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
            Cell voltages appear after your next sync. Open the app near the scooter and it reads
            all of them automatically.
          </div>
        )}
      </section>

      {/* Balance trend */}
      {cellReadings.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Balance over time</SectionTitle>
          <BalanceTrendChart points={balancePoints} />
          <div className="flex items-center gap-4 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              near full
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-neutral-500" />
              other readings
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Spread is the highest cell minus the lowest. If the green line keeps climbing, the cells
            are drifting apart.
          </p>
        </section>
      )}

      {/* Alarms */}
      {alarmEvents.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Alarms</SectionTitle>
          <ul className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-red-500/20 bg-neutral-900/50">
            {alarmEvents.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-red-200">{protectionLabels(l.protection).join(" · ")}</span>
                <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                  {shortDateTime(l.logged_at)} · {l.battery_pct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-neutral-500">
            The app only sees alarms that are active while it reads, so short ones between syncs
            won&apos;t show here.
          </p>
        </section>
      )}

      {/* Voltage trend */}
      <section className="space-y-2">
        <SectionTitle>Pack voltage over time</SectionTitle>
        <HealthVoltageChart points={voltagePoints} />
        <p className="text-[11px] text-neutral-500">
          Healthy LFP packs hold ~84 V at 100% and ~64 V at 0%. A gradual drop in the high-end is
          the earliest signal of capacity loss.
        </p>
      </section>

      {/* Charge sessions */}
      <section className="space-y-2">
        <SectionTitle>Recent charges</SectionTitle>
        {charges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
            No charge sessions detected yet. A charge is auto-recorded when SOC rises ≥5% across
            consecutive readings.
          </div>
        ) : (
          <ul className="space-y-2">
            {charges.slice(0, 8).map((c, i) => {
              const gained = c.endPct - c.startPct;
              return (
                <li
                  key={`${c.startAt}-${i}`}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="flex items-center gap-1 text-base font-medium tabular-nums">
                        {c.startPct}%
                        <IconArrowRight size={14} stroke={1.75} className="text-neutral-500" aria-hidden />
                        {c.endPct}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300">
                        +{gained}%
                      </span>
                    </div>
                    <div className="text-xs tabular-nums text-neutral-300">
                      {formatChargeDuration(c.durationMin)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{shortDateTime(c.endAt)}</span>
                    <span className="tabular-nums">{c.ratePctPerHour.toFixed(1)} %/h</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export function HealthEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6">
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">Battery health</h1>
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-12 text-center">
        <div className="text-base font-medium text-neutral-100">{title}</div>
        <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>
      </div>
    </div>
  );
}

/** Cell that keeps topping out first at full charge — the one to watch. */
function repeatHighCell(full: CellReading[]): { cell: number; count: number; total: number } | null {
  if (full.length < 3) return null;
  const counts = new Map<number, number>();
  for (const r of full) {
    // Under ~10 mV the "highest" cell is just noise.
    if (r.stats.delta >= 10) counts.set(r.stats.maxCell, (counts.get(r.stats.maxCell) ?? 0) + 1);
  }
  let best: [number, number] | null = null;
  for (const entry of counts) if (!best || entry[1] > best[1]) best = entry;
  if (!best || best[1] * 2 <= full.length) return null;
  return { cell: best[0], count: best[1], total: full.length };
}

function BackLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100">
      <IconArrowLeft size={16} stroke={1.75} aria-hidden />
      Back
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{children}</h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-3 py-2.5">
      {children}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-0.5">{children}</div>
    </>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-[10px] text-neutral-500">{children}</div>;
}

function MiniStat({
  label,
  value,
  sub,
  tone = "text-neutral-100",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] text-neutral-500">{sub}</div>
    </div>
  );
}
