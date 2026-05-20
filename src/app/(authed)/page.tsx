import Link from "next/link";
import { BatteryRing } from "@/components/BatteryRing";
import { DashboardHero } from "@/components/DashboardHero";
import { HistoryChart } from "@/components/HistoryChartLazy";
import { RowActions } from "@/components/RowActions";
import { SetupBanner } from "@/components/SetupBanner";
import { StatsStrip } from "@/components/StatsStrip";
import {
  batteryFloor,
  calibrationFromTrips,
  chargeHint,
  dailyAvgKm,
  remainingKm,
} from "@/lib/calibration";
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
  const totalKm = allTrips.reduce((s, t) => s + Number(t.distance_km), 0);
  const lastTripDate = allTrips[0]?.trip_at ?? null;

  const chartData = allLogs
    .slice()
    .reverse()
    .map((l) => ({ t: new Date(l.logged_at).getTime(), pct: l.battery_pct }));

  return (
    <div className="space-y-6">
      <DashboardHero
        pct={pct}
        floor={floor}
        solo={{ ...cal.solo, kmLeft: soloKmLeft, hint: soloHint }}
        passenger={{ ...cal.passenger, kmLeft: passengerKmLeft, hint: passengerHint }}
        lastLoggedAt={latest?.logged_at ?? null}
      />

      <Link
        href="/log"
        className="block rounded-2xl bg-emerald-500 py-4 text-center text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
      >
        + Log battery now
      </Link>

      <StatsStrip tripCount={allTrips.length} totalKm={totalKm} lastTripDate={lastTripDate} />

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
                      {new Date(l.logged_at).toLocaleString([], {
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
  );
}
