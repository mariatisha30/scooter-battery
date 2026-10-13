"use client";

import { IconAlertTriangle, IconBattery3, IconBolt, IconPlugConnected, IconRoad, IconScooterElectric } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formatMinutes, timeEstimateMinutes } from "@/lib/bms";
import { protectionLabels, type BalanceLevel } from "@/lib/cells";
import { formatDuration } from "@/lib/datetime";
import { useBms } from "../bms/BmsProvider";
import { HistoryCard } from "../HistoryCard";
import { PullToRefresh } from "../PullToRefresh";
import { BigNumber, Gauge, LiquidOrb } from "./Gauge";
import { MiniBattery, RangeToggle, StatsList, type Rider, type StatRow } from "./parts";

const RIDER_KEY = "scooter-rider";

export type StoredReading = {
  pct: number;
  at: string;
  cycles: number | null;
};

type Props = {
  rates: { solo: number; pax: number };
  stored: StoredReading | null;
  /** Top of the current discharge run (the last charge's end). */
  lastPeak: { pct: number; at: string } | null;
  /** When the last charge ended, plus its start→end if a session was seen. */
  lastCharge: { endAt: string; endPct: number; startPct: number | null; durationMin: number | null } | null;
  health: { cycles: number | null; alarms: number | null; peakTemp: number | null; balance: BalanceLevel | null };
  points: { t: number; pct: number }[];
  /** Server-rendered banner for stored alarms / uneven cells. */
  alert?: React.ReactNode;
};

// Big numbers step down at three digits so they stay inside the ticks.
const orbSize = (soc: number) => (soc >= 100 ? 70 : 84);
const rangeSize = (text: string) => (text.length >= 3 ? 84 : 96);

function ago(iso: string, now: number): [string, string] {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 60) return [String(min), "min ago"];
  const h = Math.round(min / 60);
  if (h < 24) return [String(h), h === 1 ? "hour ago" : "hours ago"];
  const d = Math.round(h / 24);
  return [String(d), d === 1 ? "day ago" : "days ago"];
}

const BATTERY_STATUS: Record<BalanceLevel, [string, string, string]> = {
  good: ["Healthy", "Cells balanced", "text-acc"],
  watch: ["Check", "Cells drifting apart", "text-amber"],
  uneven: ["Uneven", "Cells uneven", "text-red"],
};

export function Dashboard({ rates, stored, lastPeak, lastCharge, health, points, alert }: Props) {
  const { reading, mode } = useBms();
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
  const charging = mode === "charging" && live !== null;
  const pct = live?.soc ?? stored?.pct ?? null;
  // Range uses the whole battery, 100% down to 0.
  const kmLeft = (rate: number) => (pct === null ? null : pct * rate);
  const fmtKm = (v: number | null) => (v === null ? "—" : String(Math.round(v)));
  const soloKm = kmLeft(rates.solo);
  const paxKm = kmLeft(rates.pax);
  const rangeText = fmtKm(rider === "solo" ? soloKm : paxKm);

  let hero: React.ReactNode;
  if (charging && live) {
    const est = timeEstimateMinutes(live);
    hero = (
      <Gauge soc={live.soc} ramp="teal">
        <LiquidOrb soc={live.soc} />
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ top: 100 + (72 - 0.82 * orbSize(live.soc)) / 2 }}
        >
          <BigNumber
            value={String(live.soc)}
            unit="%"
            size={orbSize(live.soc)}
            unitSize={26}
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
    );
  } else {
    const size = rangeSize(rangeText);
    // Eyebrow + number + battery, centred just below the dial's middle.
    const groupH = 15 + 8 + 0.82 * size + 16 + 22;
    hero = (
      <Gauge soc={pct}>
        <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 140 - groupH / 2 }}>
          <span className="eyebrow">Range · {rider === "solo" ? "solo" : "+1 rider"}</span>
          {pct === null ? (
            <span className="num mb-2 mt-4 text-5xl font-semibold leading-none text-dim">–</span>
          ) : (
            <BigNumber value={rangeText} unit="km" size={size} unitSize={22} inlineUnit className="mt-2 text-fg" />
          )}
          <div className="mt-4">
            <MiniBattery pct={pct} />
          </div>
        </div>
      </Gauge>
    );
  }

  // Stats list
  const rows: StatRow[] = [];
  if (charging && live) {
    const est = timeEstimateMinutes(live);
    rows.push({
      icon: IconBolt,
      title: "Charging at",
      sub: `${live.current.toFixed(2)} A${est.minutes != null ? ` · full in ${formatMinutes(est.minutes)}` : ""}`,
      value: String(Math.round(live.voltage * live.current)),
      unit: "W",
    });
  } else {
    const used = lastPeak && pct !== null ? Math.max(0, lastPeak.pct - pct) : null;
    rows.push({
      icon: IconScooterElectric,
      title: "Ridden since last charge",
      sub: used === null ? "Shows after your next reading" : used === 0 ? "Not ridden yet" : `${used}% used`,
      value: used === null ? "—" : `~${Math.round(used * rates.solo)}`,
      unit: used === null ? "" : "km",
    });
  }
  if (lastCharge) {
    const [n, unit] = ago(lastCharge.endAt, now);
    rows.push({
      icon: IconPlugConnected,
      title: "Last charged",
      sub:
        lastCharge.startPct != null && lastCharge.durationMin != null
          ? `${lastCharge.startPct}% → ${lastCharge.endPct}% · ${formatDuration(lastCharge.durationMin)}`
          : `Charged to ${lastCharge.endPct}%`,
      value: n,
      unit,
    });
  } else {
    rows.push({ icon: IconPlugConnected, title: "Last charged", sub: "No charge seen yet", value: "—", unit: "" });
  }
  const cycles = live?.cycles ?? health.cycles;
  const fullKm = Math.round(100 * rates.solo);
  rows.push({
    icon: IconRoad,
    title: "Lifetime",
    sub: cycles != null ? `${cycles} cycles × ${fullKm} km` : "Shows after your next reading",
    value: cycles != null ? `~${(cycles * fullKm).toLocaleString("en-US")}` : "—",
    unit: cycles != null ? "km" : "",
  });
  const [bLabel, bSub, bTone] =
    health.alarms
      ? (["Alarm", "BMS alarm recorded", "text-red"] as const)
      : health.balance
      ? BATTERY_STATUS[health.balance]
      : (["—", "Cells on your next sync", "text-muted"] as const);
  rows.push({
    icon: IconBattery3,
    title: "Battery",
    sub: `${bSub}${health.peakTemp != null ? ` · ${health.peakTemp.toFixed(1)}° peak` : ""}`,
    value: bLabel,
    unit: "",
    tone: bTone,
    href: "/health",
    iconTone: "text-acc",
  });

  const liveAlarms = live ? protectionLabels(live.protection) : [];
  const switchedOff = live
    ? [!live.chargingEnabled && "charging", !live.dischargingEnabled && "output"].filter(Boolean)
    : [];

  return (
    <PullToRefresh>
      <div className="pt-2">{hero}</div>
      <div className="mt-1">
        <RangeToggle rider={rider} onChange={chooseRider} solo={fmtKm(soloKm)} pax={fmtKm(paxKm)} />
      </div>

      {liveAlarms.length > 0 ? (
        <Banner tone="red">BMS alarm: {liveAlarms.join(" · ")}</Banner>
      ) : switchedOff.length > 0 ? (
        <Banner tone="amber">The BMS has switched {switchedOff.join(" and ")} off.</Banner>
      ) : (
        alert && <div className="mt-2.5">{alert}</div>
      )}

      <div className="mt-2.5">
        <HistoryCard points={points} />
      </div>
      <div className="mt-2.5">
        <StatsList rows={rows} />
      </div>
    </PullToRefresh>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`mt-2.5 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs ${
        tone === "red" ? "bg-red/12 text-red" : "bg-amber/12 text-amber"
      }`}
    >
      <IconAlertTriangle size={16} stroke={1.75} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
