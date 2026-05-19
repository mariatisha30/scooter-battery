"use client";

import { useState } from "react";
import { BatteryRing } from "./BatteryRing";
import { ChargeHintLine } from "./ChargeHint";
import type { ChargeHint } from "@/lib/calibration";

type CalSource = "calibrated" | "default" | "estimated";

type Props = {
  pct: number | null;
  floor: number;
  solo: { value: number; kmLeft: number; source: CalSource; sampleSize: number; hint: ChargeHint | null };
  passenger: { value: number; kmLeft: number; source: CalSource; sampleSize: number; hint: ChargeHint | null };
  lastLoggedAt: string | null;
};

export function DashboardHero({ pct, floor, solo, passenger, lastLoggedAt }: Props) {
  const [mode, setMode] = useState<"solo" | "passenger">("solo");
  const active = mode === "solo" ? solo : passenger;

  function sourceLabel(s: CalSource, n: number) {
    if (s === "calibrated") return `calibrated · ${n} trip${n === 1 ? "" : "s"}`;
    if (s === "estimated") return "estimated 0.7× solo";
    return "default rate";
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950/40 px-6 pb-7 pt-6">
      <div className="mb-5 flex gap-1 rounded-full border border-neutral-800 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => setMode("solo")}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "solo" ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          🛵 Solo
        </button>
        <button
          type="button"
          onClick={() => setMode("passenger")}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "passenger" ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          👥 + Passenger
        </button>
      </div>

      <BatteryRing pct={pct} remainingKm={active.kmLeft} floor={floor} />

      <div className="mt-6 grid grid-cols-2 divide-x divide-neutral-800 border-t border-neutral-800 pt-5">
        <div className="px-3 text-center">
          <div className="text-base font-medium tabular-nums text-neutral-100">
            {active.value.toFixed(2)} <span className="text-xs text-neutral-500">km/%</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
            {sourceLabel(active.source, active.sampleSize)}
          </div>
        </div>
        <div className="px-3 text-center">
          <div className="text-base font-medium tabular-nums text-neutral-100">
            {lastLoggedAt
              ? new Date(lastLoggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
            last reading
          </div>
        </div>
      </div>

      {pct !== null && (
        <div className="mt-3 text-center text-[11px] text-neutral-500">
          {mode === "solo" ? (
            <>
              with passenger: <span className="tabular-nums text-neutral-300">{passenger.kmLeft.toFixed(0)} km</span>
            </>
          ) : (
            <>
              solo: <span className="tabular-nums text-neutral-300">{solo.kmLeft.toFixed(0)} km</span>
            </>
          )}
        </div>
      )}

      {active.hint && <ChargeHintLine hint={active.hint} />}
    </section>
  );
}
