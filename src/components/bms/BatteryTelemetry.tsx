"use client";

import { Telemetry } from "../dash/parts";
import { useBms } from "./BmsProvider";

type Stored = { voltage: number | null; remainingAh: number | null; tempC: number | null } | null;

const temp = (t: number | null) => (t == null ? "—" : `${t.toFixed(1)}°`);

/** Volt / Ah / Temp strip for the Battery tab — live while connected, else the last saved reading. */
export function BatteryTelemetry({ stored }: { stored: Stored }) {
  const { reading, mode } = useBms();
  const live = mode !== null ? reading : null;

  if (live && mode === "charging") {
    return (
      <Telemetry
        items={[
          ["Volt", live.voltage.toFixed(2)],
          ["Amp", `+${live.current.toFixed(2)}`, true],
          ["Watt", String(Math.round(live.voltage * live.current))],
          ["Temp", temp(live.temperatures.length ? Math.max(...live.temperatures) : null)],
        ]}
      />
    );
  }
  const volt = live?.voltage ?? stored?.voltage ?? null;
  if (volt == null) return null;
  const ah = live?.remainingAh ?? stored?.remainingAh ?? null;
  const t = live ? (live.temperatures.length ? Math.max(...live.temperatures) : null) : stored?.tempC ?? null;
  return (
    <Telemetry
      items={[
        ["Volt", Number(volt).toFixed(2)],
        ...(ah != null ? ([["Ah left", Number(ah).toFixed(1)]] as [string, string][]) : []),
        ["Temp", temp(t)],
      ]}
    />
  );
}
