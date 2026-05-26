import Link from "next/link";
import { BatteryRing } from "@/components/BatteryRing";
import { BmsCard } from "@/components/BmsCard";
import { DashboardHero } from "@/components/DashboardHero";
import { HistoryChart } from "@/components/HistoryChartLazy";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RideSuggestionCard } from "@/components/RideSuggestionCard";
import { RowActions } from "@/components/RowActions";
import { SetupBanner } from "@/components/SetupBanner";
import {
  batteryFloor,
  calibrationFromTrips,
  chargeHint,
  dailyAvgKm,
  remainingKm,
} from "@/lib/calibration";
import { detectChargeSessions, formatChargeDuration } from "@/lib/charging";
import { formatLocalDateTime } from "@/lib/datetime";
import { detectUnloggedRides } from "@/lib/rides";
import { supabase, supabaseConfigured, type BatteryLog, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const floor = batteryFloor();

  if (!supabaseConfigured || !supabase) {
    return (
      <div className="space-y-6">
        <SetupBanner />
        <div className="rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950/40 p-6">
          <BatteryRing pct={null} remainingKm={0} floor={floor} />
        </div>
      </div>
    );
  }

  // We must inline this content in the PullToRefresh wrapper below.

  const [{ data: logs }, { data: trips }] = await Promise.all([
    supabase.from("battery_logs").select("*").order("logged_at", { ascending: false }).limit(60),
    supabase.from("trips").select("*").order("trip_at", { ascending: false }).limit(50),
  ]);

  const allLogs = (logs as BatteryLog[]) ?? [];
  const allTrips = (trips as Trip[]) ?? [];
  const latest = allLogs[0] ?? null;
  const previous = allLogs[1] ?? null;
  const cal = calibrationFromTrips(allTrips);
  const pct = latest?.battery_pct ?? null;
  const soloKmLeft = pct === null ? 0 : remainingKm(pct, cal.solo.value, floor);
  const passengerKmLeft = pct === null ? 0 : remainingKm(pct, cal.passenger.value, floor);
  const daily = dailyAvgKm(allTrips);
  const soloHint = latest ? chargeHint(soloKmLeft, daily) : null;
  const passengerHint = latest ? chargeHint(passengerKmLeft, daily) : null;
  const lastCharge = detectChargeSessions(allLogs)[0] ?? null;
  const rideSuggestions = detectUnloggedRides(allLogs, allTrips).slice(0, 3);

  const chartData = allLogs
    .slice()
    .reverse()
    .map((l) => ({ t: new Date(l.logged_at).getTime(), pct: l.battery_pct }));

  return (
    <PullToRefresh>
    <div className="space-y-6">
      <DashboardHero
        pct={pct}
        floor={floor}
        solo={{ ...cal.solo, kmLeft: soloKmLeft, hint: soloHint }}
        passenger={{ ...cal.passenger, kmLeft: passengerKmLeft, hint: passengerHint }}
        lastLoggedAt={latest?.logged_at ?? null}
      />

      <BmsCard />

      {rideSuggestions.length > 0 && (
        <section className="space-y-2">
          {rideSuggestions.map((r) => (
            <RideSuggestionCard key={r.id} ride={r} />
          ))}
        </section>
      )}

      {lastCharge && (
        <Link
          href="/health"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                Last charge
              </span>
              <span className="text-sm font-medium text-neutral-100 tabular-nums">
                {lastCharge.startPct}% → {lastCharge.endPct}%
              </span>
            </div>
            <span className="text-xs tabular-nums text-neutral-300">
              {formatChargeDuration(lastCharge.durationMin)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
            <span>
              {formatLocalDateTime(lastCharge.endAt, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="tabular-nums">{lastCharge.ratePctPerHour.toFixed(1)} %/h</span>
          </div>
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">History</h2>
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            {allLogs.length} reading{allLogs.length === 1 ? "" : "s"}
          </span>
        </div>
        <HistoryChart data={chartData} floor={floor} />
      </section>

      {latest && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Recent</h2>
            {previous && (
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">vs previous</span>
            )}
          </div>
          <ul className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
            {allLogs.slice(0, 6).map((l, i) => {
              const prev = allLogs[i + 1];
              const delta = prev ? l.battery_pct - prev.battery_pct : null;
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="text-base font-medium tabular-nums">{l.battery_pct}%</span>
                    {l.trip_id && (
                      <span
                        className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300"
                        title="From a logged trip — deleting this also deletes the trip"
                      >
                        ↳ trip
                      </span>
                    )}
                    {delta !== null && delta !== 0 && (
                      <span className={`tabular-nums text-xs ${delta > 0 ? "text-emerald-400" : "text-neutral-400"}`}>
                        {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                      </span>
                    )}
                    {l.note && <span className="truncate text-xs text-neutral-500">· {l.note}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {formatLocalDateTime(l.logged_at, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <RowActions kind="log" id={l.id} linkedTripId={l.trip_id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
    </PullToRefresh>
  );
}
