import { IconAlertTriangle } from "@tabler/icons-react";
import { formatMinutes, timeEstimateMinutes, type BmsReading } from "@/lib/bms";
import {
  BALANCE_TEXT_CLASS,
  balanceLevel,
  cellStats,
  formatCellVolts,
  protectionLabels,
} from "@/lib/cells";
import { relativeAgo } from "@/lib/datetime";
import { CellBars } from "./CellBars";

type Props = {
  reading: BmsReading;
  cellsMv: number[] | null;
  lastSyncAt: number | null;
};

/** Live numbers inside the BMS card: alarms, SOC/V/A, cells, state, extras. */
export function BmsReadingView({ reading, cellsMv, lastSyncAt }: Props) {
  const est = timeEstimateMinutes(reading);
  const alarms = protectionLabels(reading.protection);
  const switchedOff = [
    !reading.chargingEnabled && "charging",
    !reading.dischargingEnabled && "output",
  ].filter(Boolean);
  const stats = cellStats(cellsMv);
  const level = stats ? balanceLevel(stats) : null;

  const stateLabel =
    est.state === "charging" ? "Charging" : est.state === "discharging" ? "Discharging" : "Idle";
  const stateColor =
    est.state === "charging"
      ? "text-emerald-300"
      : est.state === "discharging"
      ? "text-amber-300"
      : "text-neutral-400";

  return (
    <>
      {alarms.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <IconAlertTriangle size={14} stroke={2} className="mt-px shrink-0 text-red-300" aria-hidden />
          <span>
            <span className="font-medium">BMS alarm:</span> {alarms.join(" · ")}
          </span>
        </div>
      )}
      {alarms.length === 0 && switchedOff.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <IconAlertTriangle size={14} stroke={2} className="mt-px shrink-0 text-amber-300" aria-hidden />
          <span>The BMS has switched {switchedOff.join(" and ")} off.</span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="SOC" value={`${reading.soc}%`} accent="text-emerald-300" />
        <Stat label="Voltage" value={`${reading.voltage.toFixed(2)} V`} />
        <Stat
          label="Current"
          value={`${reading.current >= 0 ? "+" : ""}${reading.current.toFixed(2)} A`}
          accent={
            reading.current > 0.05
              ? "text-emerald-300"
              : reading.current < -0.05
              ? "text-amber-300"
              : "text-neutral-300"
          }
        />
      </div>

      {cellsMv && stats && level && (
        <div className="mt-3 rounded-lg bg-neutral-950/60 px-2.5 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">
              {stats.count} cells
            </span>
            <span className="text-[11px] tabular-nums text-neutral-400">
              {formatCellVolts(stats.min)}–{formatCellVolts(stats.max)} V
              <span className="text-neutral-600"> · </span>
              <span className={BALANCE_TEXT_CLASS[level]}>Δ {stats.delta} mV</span>
            </span>
          </div>
          <div className="mt-2">
            <CellBars cellsMv={cellsMv} balanceMask={reading.balanceMask} height={28} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between text-xs">
        <span className={`uppercase tracking-wider ${stateColor}`}>
          {stateLabel}
          {est.minutes != null && est.state !== "idle" && (
            <>
              {" "}· {est.state === "charging" ? "full in" : "empty in"}{" "}
              <span className="tabular-nums text-neutral-200">{formatMinutes(est.minutes)}</span>
            </>
          )}
        </span>
        <span className="text-neutral-500">{lastSyncAt ? `synced ${relativeAgo(lastSyncAt)}` : ""}</span>
      </div>
      <div className="mt-2 text-[11px] text-neutral-500">
        {reading.temperatures.length > 0 && (
          <>
            Temp{" "}
            <span className="tabular-nums text-neutral-300">
              {reading.temperatures.map((t) => `${t.toFixed(1)}°`).join(" · ")}
            </span>
            {" · "}
          </>
        )}
        <span className="tabular-nums text-neutral-300">
          {reading.remainingAh.toFixed(1)} / {reading.nominalAh.toFixed(0)} Ah
        </span>
        {" · "}
        <span className="tabular-nums text-neutral-300">{reading.cycles}</span> cycles
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent = "text-neutral-200",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-950/60 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}
