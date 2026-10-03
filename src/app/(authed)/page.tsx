import { Dashboard, type StoredReading } from "@/components/dash/Dashboard";
import { HealthAlert } from "@/components/HealthAlert";
import { SetupBanner } from "@/components/SetupBanner";
import { batteryFloor, calibrationFromTrips, defaultKmPerPct, defaultPassengerFactor } from "@/lib/calibration";
import { supabase, supabaseConfigured, type BatteryLog, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const num = (v: number | string | null | undefined) => (v == null ? null : Number(v));

export default async function DashboardPage() {
  const floor = batteryFloor();

  if (!supabaseConfigured || !supabase) {
    const solo = defaultKmPerPct();
    return (
      <>
        <SetupBanner />
        <div className="mt-4">
          <Dashboard
            floor={floor}
            rates={{ solo, pax: solo * defaultPassengerFactor() }}
            stored={null}
            storedCells={null}
            lastPeak={null}
            health={{ cycles: null, alarms: null, peakTemp: null }}
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
  // ended — "since last charge" needs no logging from the rider.
  let peak = latest;
  for (const l of allLogs.slice(1)) {
    if (peak && l.battery_pct >= peak.battery_pct) peak = l;
    else break;
  }

  const stored: StoredReading | null = latest
    ? {
        pct: latest.battery_pct,
        at: latest.logged_at,
        voltage: num(latest.voltage_v),
        remainingAh: num(latest.remaining_ah),
        tempC: num(latest.max_temp_c),
        cycles: latest.cycles,
      }
    : null;
  const withCells = allLogs.find((l) => l.cell_mv && l.cell_mv.length > 0) ?? null;
  const withProtection = allLogs.filter((l) => l.protection != null);
  const temps = allLogs.filter((l) => l.max_temp_c != null).map((l) => Number(l.max_temp_c));

  return (
    <Dashboard
      floor={floor}
      rates={{ solo: cal.solo.value, pax: cal.passenger.value }}
      stored={stored}
      storedCells={withCells?.cell_mv ? { cells: withCells.cell_mv, balanceMask: withCells.balance_mask } : null}
      lastPeak={peak ? { pct: peak.battery_pct, at: peak.logged_at } : null}
      health={{
        cycles: allLogs.find((l) => l.cycles != null)?.cycles ?? null,
        alarms: withProtection.length ? withProtection.filter((l) => l.protection !== 0).length : null,
        peakTemp: temps.length ? Math.max(...temps) : null,
      }}
      points={allLogs
        .slice()
        .reverse()
        .map((l) => ({ t: new Date(l.logged_at).getTime(), pct: l.battery_pct }))}
      alert={<HealthAlert logs={allLogs} />}
    />
  );
}
