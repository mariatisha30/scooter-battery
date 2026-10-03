import {
  IconArrowRight,
  IconCaretDownFilled,
  IconCaretUpFilled,
  IconChevronDown,
  IconRoute,
} from "@tabler/icons-react";
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
import { ConnectionCard } from "./bms/ConnectionCard";
import { CellBars, CellGrid } from "./CellBars";
import { HealthVoltageChart } from "./HealthVoltageChart";
import { LogoutButton } from "./LogoutButton";
import { RowActions } from "./RowActions";

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

  const latestCycles = logs.find((l) => l.cycles != null)?.cycles ?? null;
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
  const hotTone =
    maxTempEver == null ? "text-dim" : maxTempEver > 55 ? "text-red" : maxTempEver > 45 ? "text-amber" : "text-fg";

  return (
    <div className="space-y-7 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Battery health</h1>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-muted">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-sm text-muted">Long-term signals from your BMS. Watch the trend over weeks, not minutes.</p>
      </div>

      {/* Headline cards */}
      <section className="grid grid-cols-2 gap-2.5">
        <Card>
          <Label>Cell balance</Label>
          <Big className={balance ? BALANCE_TEXT_CLASS[balance] : "text-dim"}>
            {balanceRef ? balanceRef.stats.delta : "—"}
            {balanceRef && <small className="ml-1 text-base font-semibold">mV</small>}
          </Big>
          <Sub>
            {balanceRef && balance
              ? `${BALANCE_LABEL[balance]} · at ${balanceRef.log.battery_pct}%`
              : "Shows after your next sync"}
          </Sub>
        </Card>
        <Card>
          <Label>Cycles</Label>
          <Big className="text-fg">
            {latestCycles ?? "—"}
            {latestCycles != null && (
              <small className="ml-1 text-sm font-medium text-dim">/ ~{EXPECTED_CYCLES.toLocaleString("en-US")}</small>
            )}
          </Big>
          <Sub>
            {lifeUsedPct == null
              ? "Sync to see"
              : `${lifeUsedPct < 1 ? "Under 1%" : `${Math.round(lifeUsedPct)}%`} of rated life used`}
          </Sub>
        </Card>
        <Card>
          <Label>Hottest ever</Label>
          <Big className={hotTone}>{maxTempEver != null ? `${maxTempEver.toFixed(1)}°` : "—"}</Big>
          {avgTemp != null && <Sub>avg {avgTemp.toFixed(1)}° across {withTemp.length} reads</Sub>}
        </Card>
        <Card>
          <Label>BMS alarms</Label>
          <Big className={alarmEvents.length > 0 ? "text-red" : withProtection.length > 0 ? "text-acc" : "text-dim"}>
            {withProtection.length === 0 ? "—" : alarmEvents.length === 0 ? "None" : alarmEvents.length}
          </Big>
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
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Cells</h2>
          {latestCells && (
            <span className="text-[11px] text-dim">
              {shortDateTime(latestCells.log.logged_at)} · {latestCells.log.battery_pct}%
            </span>
          )}
        </div>
        {latestCells ? (
          <>
            <div className="glass rounded-[22px] p-4">
              <CellBars cellsMv={latestCells.cells} balanceMask={latestCells.log.balance_mask} height={88} detailed />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <Mini label="Lowest" value={formatCellVolts(latestCells.stats.min)} sub={`cell ${latestCells.stats.minCell}`} tone="text-amber" />
                <Mini label="Average" value={formatCellVolts(latestCells.stats.avg)} sub="volts" />
                <Mini label="Highest" value={formatCellVolts(latestCells.stats.max)} sub={`cell ${latestCells.stats.maxCell}`} tone="text-hi" />
              </div>
              {runner && (
                <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-fg">
                  Cell {runner.cell} was the highest in {runner.count} of {runner.total} full-charge readings. It&apos;s the
                  one to watch.
                </p>
              )}
              <details className="group mt-3 border-t border-line pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
                  All {latestCells.stats.count} cell voltages
                  <IconChevronDown size={15} stroke={1.75} className="transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-3">
                  <CellGrid cellsMv={latestCells.cells} balanceMask={latestCells.log.balance_mask} />
                </div>
              </details>
            </div>
            <p className="text-xs text-dim">
              {ZONE_NOTE[balanceZone(latestCells.stats)]}
              {balancingNow && " Green dots mark cells the BMS was balancing."}
            </p>
          </>
        ) : (
          <Empty>Cell voltages appear after your next sync. Open the app near the scooter and it reads all of them automatically.</Empty>
        )}
      </section>

      {/* Balance trend */}
      {cellReadings.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="eyebrow">Balance over time</h2>
          <BalanceTrendChart points={balancePoints} />
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-acc" />
              near full
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-dim" />
              other readings
            </span>
          </div>
          <p className="text-xs text-dim">
            Spread is the highest cell minus the lowest. If the coloured line keeps climbing, the cells are drifting apart.
          </p>
        </section>
      )}

      {/* Alarms */}
      {alarmEvents.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="eyebrow">Alarms</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-red/[0.06] ring-1 ring-red/20">
            {alarmEvents.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-red">{protectionLabels(l.protection).join(" · ")}</span>
                <span className="shrink-0 text-xs text-dim">
                  {shortDateTime(l.logged_at)} · {l.battery_pct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-dim">
            The app only sees alarms that are active while it reads, so short ones between syncs won&apos;t show here.
          </p>
        </section>
      )}

      {/* Voltage trend */}
      <section className="space-y-2.5">
        <h2 className="eyebrow">Pack voltage</h2>
        <HealthVoltageChart points={voltagePoints} />
        <p className="text-xs text-dim">
          Healthy 24S LFP rests around 84–86 V right after a full charge and about 64 V near empty. A slow drop at the top
          end is the earliest sign of capacity loss.
        </p>
      </section>

      {/* Charge sessions */}
      <section className="space-y-2.5">
        <h2 className="eyebrow">Recent charges</h2>
        {charges.length === 0 ? (
          <Empty>No charge sessions detected yet. A charge shows up when the % rises 5 or more across readings.</Empty>
        ) : (
          <ul className="glass divide-y divide-line overflow-hidden rounded-[22px]">
            {charges.slice(0, 6).map((c, i) => (
              <li key={`${c.startAt}-${i}`} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="num flex items-center gap-1.5 text-lg font-semibold">
                    {c.startPct}%
                    <IconArrowRight size={14} stroke={1.75} className="text-dim" aria-hidden />
                    {c.endPct}%
                    <span className="ml-1 text-sm text-acc">+{c.endPct - c.startPct}</span>
                  </span>
                  <span className="text-xs text-muted">{formatChargeDuration(c.durationMin)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-dim">
                  <span>{shortDateTime(c.endAt)}</span>
                  <span className="num text-[12px]">{c.ratePctPerHour.toFixed(1)} %/h</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Readings */}
      <section className="space-y-2.5">
        <h2 className="eyebrow">Readings</h2>
        <ul className="glass divide-y divide-line overflow-hidden rounded-[22px]">
          {logs.slice(0, 12).map((l, i) => {
            const prev = logs[i + 1];
            const delta = prev ? l.battery_pct - prev.battery_pct : null;
            return (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 pl-4 pr-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="num w-12 text-xl font-semibold">{l.battery_pct}%</span>
                  {delta !== null && delta !== 0 && (
                    <span className={`num flex items-center text-sm font-semibold ${delta > 0 ? "text-acc" : "text-muted"}`}>
                      {delta > 0 ? <IconCaretUpFilled size={12} aria-hidden /> : <IconCaretDownFilled size={12} aria-hidden />}
                      {Math.abs(delta)}
                    </span>
                  )}
                  {l.trip_id && (
                    <span
                      className="flex items-center gap-1 rounded-full bg-sky/12 px-2 py-0.5 text-[10px] font-semibold text-sky"
                      title="From a logged trip — deleting it deletes the trip too"
                    >
                      <IconRoute size={11} stroke={2} aria-hidden />
                      trip
                    </span>
                  )}
                  {!l.trip_id && l.note && l.note !== "BMS" && <span className="min-w-0 truncate text-xs text-dim">{l.note}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[11px] text-dim">{shortDateTime(l.logged_at)}</span>
                  <RowActions kind="log" id={l.id} linkedTripId={l.trip_id} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Connection */}
      <section className="space-y-2.5">
        <h2 className="eyebrow">Connection</h2>
        <ConnectionCard />
        <LogoutButton />
      </section>
    </div>
  );
}

export function HealthEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Battery health</h1>
      <div className="rounded-[22px] border border-dashed border-line px-4 py-12 text-center">
        <div className="text-base font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted">{subtitle}</div>
      </div>
      <section className="space-y-2.5">
        <h2 className="eyebrow">Connection</h2>
        <ConnectionCard />
        <LogoutButton />
      </section>
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

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-[22px] px-3.5 py-3">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow text-[11px] text-dim">{children}</div>;
}
function Big({ children, className }: { children: React.ReactNode; className: string }) {
  return <div className={`num mt-1 text-[32px] font-semibold leading-none ${className}`}>{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-1.5 text-[11px] text-dim">{children}</div>;
}
function Mini({ label, value, sub, tone = "text-fg" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div>
      <div className="eyebrow text-[10px] text-dim">{label}</div>
      <div className={`num mt-0.5 text-xl font-semibold ${tone}`}>{value}</div>
      <div className="text-[11px] text-dim">{sub}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-dashed border-line px-4 py-6 text-center text-xs text-muted">{children}</div>
  );
}
