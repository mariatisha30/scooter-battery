"use client";

import {
  IconAlertTriangle,
  IconBattery1,
  IconBatteryExclamation,
  IconBolt,
  IconClock,
  IconParking,
  IconScooterElectric,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formatMinutes, timeEstimateMinutes } from "@/lib/bms";
import { protectionLabels } from "@/lib/cells";
import { relativeAgo } from "@/lib/datetime";
import { useBms } from "../bms/BmsProvider";
import { HistoryCard } from "../HistoryCard";
import { PullToRefresh } from "../PullToRefresh";
import { BigNumber, Gauge, LiquidOrb } from "./Gauge";
import { CellsCard, Pill, RangeToggle, StatsRow, Telemetry, type Rider } from "./parts";

// BMS "DB24SA08L24S80A": 24 cells, 80 A continuous. The riding arc shows
// the current draw against that limit.
const MAX_CURRENT_A = 80;
const RIDER_KEY = "scooter-rider";

export type StoredReading = {
  pct: number;
  at: string;
  voltage: number | null;
  remainingAh: number | null;
  tempC: number | null;
  cycles: number | null;
};

type Props = {
  floor: number;
  rates: { solo: number; pax: number };
  stored: StoredReading | null;
  storedCells: { cells: number[]; balanceMask: number | null } | null;
  /** Top of the current discharge run (the last charge's end). */
  lastPeak: { pct: number; at: string } | null;
  health: { cycles: number | null; alarms: number | null; peakTemp: number | null };
  points: { t: number; pct: number }[];
  /** Server-rendered banner for stored alarms / uneven cells. */
  alert?: React.ReactNode;
};

const fmtTemp = (t: number | null) => (t == null ? "—" : `${t.toFixed(1)}°`);

export function Dashboard({ floor, rates, stored, storedCells, lastPeak, health, points, alert }: Props) {
  const { reading, cellsMv, mode, rideStart } = useBms();
  const [rider, setRider] = useState<Rider>("solo");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    try {
      if (localStorage.getItem(RIDER_KEY) === "pax") setRider("pax");
    } catch {
      /* storage blocked */
    }
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const chooseRider = (r: Rider) => {
    setRider(r);
    try {
      localStorage.setItem(RIDER_KEY, r);
    } catch {
      /* storage blocked */
    }
  };

  // A fresh live reading wins; otherwise show the last saved one.
  const live = mode !== null ? reading : null;
  const state = mode ?? "parked";
  const pct = live?.soc ?? stored?.pct ?? null;
  const kmLeft = (rate: number) => (pct === null ? null : Math.max(0, pct - floor) * rate);
  const fmtKm = (v: number | null) => (v === null ? "—" : String(Math.round(v)));
  const soloKm = kmLeft(rates.solo);
  const paxKm = kmLeft(rates.pax);
  const rangeKm = rider === "solo" ? soloKm : paxKm;
  const tempC = live
    ? live.temperatures.length
      ? Math.max(...live.temperatures)
      : null
    : stored?.tempC ?? null;

  let hero: React.ReactNode;
  let context: React.ReactNode = null;
  let tele: [string, string, boolean?][] | null = null;

  if (state === "charging" && live) {
    const est = timeEstimateMinutes(live);
    hero = (
      <>
        <Gauge soc={live.soc} floor={floor} ramp="teal">
          <LiquidOrb soc={live.soc} />
          <div className="pointer-events-none absolute inset-x-0 top-[100px] flex flex-col items-center">
            <BigNumber
              value={String(live.soc)}
              unit="%"
              size={88}
              unitSize={30}
              className="text-white [text-shadow:0_2px_20px_rgb(2_44_34/0.5)]"
              unitClassName="text-white/75"
            />
            {est.minutes != null && (
              <span className="mt-2.5 text-xs font-medium text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.4)]">
                Full in {formatMinutes(est.minutes)}
              </span>
            )}
          </div>
        </Gauge>
        <div className="flex justify-center">
          <Pill tone="acc" icon={IconBolt}>
            Charging · {live.current.toFixed(2)} A
          </Pill>
        </div>
      </>
    );
    tele = [
      ["Volt", live.voltage.toFixed(2)],
      ["Amp", `+${live.current.toFixed(2)}`, true],
      ["Watt", String(Math.round(live.voltage * live.current))],
      ["Temp", fmtTemp(tempC)],
    ];
  } else {
    let pill: React.ReactNode;
    let power: number | null = null;
    if (state === "riding" && live) {
      const kw = (Math.abs(live.current) * live.voltage) / 1000;
      power = Math.abs(live.current) / MAX_CURRENT_A;
      pill = (
        <Pill tone="acc" icon={IconScooterElectric}>
          Riding · {kw.toFixed(1)} kW
        </Pill>
      );
      if (rideStart) {
        const used = Math.max(0, rideStart.soc - live.soc);
        const mins = Math.max(1, Math.round((now - rideStart.at) / 60000));
        context = (
          <>
            This ride: <b className="font-semibold text-fg">{used}% used</b> · {mins} min
          </>
        );
      }
      tele = [
        ["Volt", live.voltage.toFixed(2)],
        ["Amp", `−${Math.abs(live.current).toFixed(1)}`, true],
        ["kW", kw.toFixed(2)],
        ["Temp", fmtTemp(tempC)],
      ];
    } else {
      if (pct === null) pill = <Pill tone="idle" icon={IconClock}>No reading yet</Pill>;
      else if (pct <= floor) pill = <Pill tone="red" icon={IconBatteryExclamation}>{pct}% · reserve</Pill>;
      else if (pct <= floor + 15) pill = <Pill tone="amber" icon={IconBattery1}>{pct}% · charge soon</Pill>;
      else if (live) pill = <Pill tone="idle" icon={IconParking}>{pct}% · parked</Pill>;
      else pill = <Pill tone="idle" icon={IconClock}>{pct}% · {stored ? relativeAgo(stored.at) : ""}</Pill>;

      if (lastPeak && pct !== null) {
        const used = lastPeak.pct - pct;
        if (used > 0) {
          context = (
            <>
              {lastPeak.pct >= 99 ? "Since full charge" : `Since last charge (${lastPeak.pct}%)`}:{" "}
              <b className="font-semibold text-fg">{used}% used</b> · about {Math.round(used * rates.solo)} km ridden
            </>
          );
        } else if (pct >= 99) {
          context = <>Fully charged</>;
        }
      }
      const volt = live?.voltage ?? stored?.voltage ?? null;
      const ah = live?.remainingAh ?? stored?.remainingAh ?? null;
      if (volt != null) {
        tele = [
          ["Volt", Number(volt).toFixed(2)],
          ...(ah != null ? ([["Ah left", Number(ah).toFixed(1)]] as [string, string][]) : []),
          ["Temp", fmtTemp(tempC)],
        ];
      }
    }

    hero = (
      <Gauge soc={pct} floor={floor} power={power}>
        <div className="absolute inset-x-0 top-[64px] flex flex-col items-center">
          <span className="eyebrow">Range · {rider === "solo" ? "solo" : "+1 rider"}</span>
          <BigNumber value={fmtKm(rangeKm)} unit="km" size={112} unitSize={26} className="mt-2 text-fg" />
          <div className="mt-3.5">{pill}</div>
        </div>
      </Gauge>
    );
  }

  const cells = live && cellsMv ? { cells: cellsMv, balanceMask: live.balanceMask } : storedCells;
  const liveAlarms = live ? protectionLabels(live.protection) : [];
  const switchedOff = live
    ? [!live.chargingEnabled && "charging", !live.dischargingEnabled && "output"].filter(Boolean)
    : [];

  return (
    <PullToRefresh>
      <div className="pt-1">{hero}</div>
      <div className="mt-1">
        <RangeToggle rider={rider} onChange={chooseRider} solo={fmtKm(soloKm)} pax={fmtKm(paxKm)} />
      </div>
      {context && <p className="mt-2.5 text-center text-xs text-muted">{context}</p>}

      {liveAlarms.length > 0 ? (
        <Banner tone="red">BMS alarm: {liveAlarms.join(" · ")}</Banner>
      ) : switchedOff.length > 0 ? (
        <Banner tone="amber">The BMS has switched {switchedOff.join(" and ")} off.</Banner>
      ) : (
        alert && <div className="mt-4">{alert}</div>
      )}

      {tele && (
        <div className="mt-4">
          <Telemetry items={tele} />
        </div>
      )}
      <div className="mt-2.5">
        <CellsCard cells={cells?.cells ?? null} balanceMask={cells?.balanceMask} underLoad={state === "riding"} />
      </div>
      <div className="mt-2.5">
        <StatsRow cycles={live?.cycles ?? health.cycles} alarms={health.alarms} peakTemp={health.peakTemp} />
      </div>
      <div className="mt-2.5">
        <HistoryCard points={points} floor={floor} />
      </div>
    </PullToRefresh>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs ${
        tone === "red" ? "bg-red/12 text-red" : "bg-amber/12 text-amber"
      }`}
    >
      <IconAlertTriangle size={16} stroke={1.75} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
