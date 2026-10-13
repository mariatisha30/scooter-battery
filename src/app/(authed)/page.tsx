import { Dashboard, type StoredReading } from "@/components/dash/Dashboard";
import { HealthAlert } from "@/components/HealthAlert";
import { SetupBanner } from "@/components/SetupBanner";
import { calibrationFromTrips, defaultKmPerPct, defaultPassengerFactor } from "@/lib/calibration";
import { balanceLevel, balanceZone, cellStats } from "@/lib/cells";
import { detectChargeSessions } from "@/lib/charging";
import { supabase, supabaseConfigured, type BatteryLog, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!supabaseConfigured || !supabase) {
    const solo = defaultKmPerPct();
    return (
      <>
        <SetupBanner />
        <div className="mt-4">
          <Dashboard
            rates={{ solo, pax: solo * defaultPassengerFactor() }}
            stored={null}
            lastPeak={null}
            lastCharge={null}
            health={{ cycles: null, alarms: null, peakTemp: null, balance: null }}
            points={[]}
          />
        </div>
      </>
    );
  }

  const [{ data: logs }, { data: trips }] = await Promise.all([
    // 500 rows covers months of readings so the History "All" filter has
    // enough to plot without pagination.
    supabase.from("battery_logs").select("*").order("logged_at", { ascending: false }).limit(500),
    supabase.from("trips").select("*").order("trip_at", { ascending: false }).limit(50),
  ]);

  const allLogs = (logs as BatteryLog[]) ?? [];
  const cal = calibrationFromTrips((trips as Trip[]) ?? []);
  const latest = allLogs[0] ?? null;

  // Walk back through the current discharge run to where the last charge
  // ended — "ridden since last charge" needs no logging from the rider.
  let peak = latest;
  for (const l of allLogs.slice(1)) {
    if (peak && l.battery_pct >= peak.battery_pct) peak = l;
    else break;
  }

  const stored: StoredReading | null = latest
    ? { pct: latest.battery_pct, at: latest.logged_at, cycles: latest.cycles }
    : null;
  // The last charge ended at the top of the current run. Readings can be
  // hours apart overnight, so look for its session with a wide gap.
  const charge = detectChargeSessions(allLogs, { gapHoursThreshold: 24 })[0] ?? null;
  const prevBeforePeak = peak ? allLogs[allLogs.indexOf(peak) + 1] : undefined;
  const chargedAtPeak = peak && prevBeforePeak && prevBeforePeak.battery_pct < peak.battery_pct;
  const lastCharge = chargedAtPeak
    ? charge && charge.endAt === peak.logged_at
      ? { endAt: charge.endAt, endPct: charge.endPct, startPct: charge.startPct, durationMin: charge.durationMin }
      : { endAt: peak.logged_at, endPct: peak.battery_pct, startPct: null, durationMin: null }
    : charge
    ? { endAt: charge.endAt, endPct: charge.endPct, startPct: charge.startPct, durationMin: charge.durationMin }
    : null;

  // Battery status mirrors the Battery tab: latest near-full cell reading
  // first (where LFP differences show), else the latest one with cells.
  const cellReadings = allLogs.map((l) => cellStats(l.cell_mv)).filter((s) => s !== null);
  const balanceRef = cellReadings.find((s) => balanceZone(s) === "top") ?? cellReadings[0] ?? null;
  const withProtection = allLogs.filter((l) => l.protection != null);
  const temps = allLogs.filter((l) => l.max_temp_c != null).map((l) => Number(l.max_temp_c));

  return (
    <Dashboard
      rates={{ solo: cal.solo.value, pax: cal.passenger.value }}
      stored={stored}
      lastPeak={peak ? { pct: peak.battery_pct, at: peak.logged_at } : null}
      lastCharge={lastCharge}
      health={{
        cycles: allLogs.find((l) => l.cycles != null)?.cycles ?? null,
        alarms: withProtection.length ? withProtection.filter((l) => l.protection !== 0).length : null,
        peakTemp: temps.length ? Math.max(...temps) : null,
        balance: balanceRef ? balanceLevel(balanceRef) : null,
      }}
      points={allLogs
        .slice()
        .reverse()
        .map((l) => ({ t: new Date(l.logged_at).getTime(), pct: l.battery_pct }))}
      alert={<HealthAlert logs={allLogs} />}
    />
  );
}
