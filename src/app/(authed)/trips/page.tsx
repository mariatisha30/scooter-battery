import { IconArrowRight, IconUser, IconUsers } from "@tabler/icons-react";
import { RideSuggestionCard } from "@/components/RideSuggestionCard";
import { RowActions } from "@/components/RowActions";
import { TripFormDrawer } from "@/components/TripFormDrawer";
import { calibrationFromTrips, defaultKmPerPct, type CalibrationValue } from "@/lib/calibration";
import { formatLocalDateTime } from "@/lib/datetime";
import { detectUnloggedRides } from "@/lib/rides";
import { supabase, supabaseConfigured, type BatteryLog, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function sourceLabel(c: CalibrationValue) {
  if (c.source === "calibrated") return `${c.sampleSize} trip${c.sampleSize === 1 ? "" : "s"}`;
  return c.source === "estimated" ? "estimated" : "default";
}

export default async function TripsPage() {
  let trips: Trip[] = [];
  let logs: BatteryLog[] = [];
  if (supabaseConfigured && supabase) {
    const [t, l] = await Promise.all([
      supabase.from("trips").select("*").order("trip_at", { ascending: false }).limit(50),
      supabase.from("battery_logs").select("*").order("logged_at", { ascending: false }).limit(500),
    ]);
    trips = (t.data as Trip[]) ?? [];
    logs = (l.data as BatteryLog[]) ?? [];
  }

  const latestLog = logs[0] ? { battery_pct: logs[0].battery_pct, logged_at: logs[0].logged_at } : null;
  const cal = calibrationFromTrips(trips);
  const rides = detectUnloggedRides(logs, trips).slice(0, 3);
  const baseline = defaultKmPerPct();

  return (
    <div className="space-y-7 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
        <p className="mt-1.5 text-sm text-muted">Log a ride&apos;s km and the app learns your real range per %.</p>
      </div>

      <section className="glass grid grid-cols-2 rounded-[22px] py-3.5">
        <div className="text-center">
          <b className="num block text-[30px] font-semibold leading-none text-acc">{cal.solo.value.toFixed(2)}</b>
          <span className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-dim">
            <IconUser size={12} stroke={2} aria-hidden />
            solo km/% · {sourceLabel(cal.solo)}
          </span>
        </div>
        <div className="text-center shadow-[-1px_0_0_var(--color-line)]">
          <b className="num block text-[30px] font-semibold leading-none text-sky">{cal.passenger.value.toFixed(2)}</b>
          <span className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-dim">
            <IconUsers size={12} stroke={2} aria-hidden />
            +1 km/% · {sourceLabel(cal.passenger)}
          </span>
        </div>
      </section>

      <TripFormDrawer latest={latestLog} />

      {rides.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="eyebrow">Unlogged rides</h2>
          {rides.map((r) => (
            <RideSuggestionCard key={r.id} ride={r} />
          ))}
        </section>
      )}

      <section className="space-y-2.5">
        <h2 className="eyebrow">Recent trips</h2>
        {trips.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            <p>No trips logged yet.</p>
            <p className="mt-2 text-xs text-dim">
              Log one and the app learns your real km/% — right now it uses{" "}
              <span className="num text-[13px] text-muted">{baseline.toFixed(2)}</span>.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => {
              const used = t.start_pct - t.end_pct;
              const ratio = Number(t.distance_km) / used;
              return (
                <li key={t.id} className="glass rounded-[22px] py-3 pl-4 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="num text-xl font-semibold">{Number(t.distance_km).toFixed(1)} km</span>
                      {t.with_passenger && (
                        <span className="flex items-center gap-1 rounded-full bg-sky/12 px-2 py-0.5 text-[10px] font-semibold text-sky">
                          <IconUsers size={11} stroke={2} aria-hidden />
                          +1
                        </span>
                      )}
                      {t.km_estimated && (
                        <span
                          className="rounded-full bg-amber/12 px-2 py-0.5 text-[10px] font-semibold text-amber"
                          title="km estimated from the battery drop — edit to enter the real distance"
                        >
                          est
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`num text-[15px] font-semibold ${ratio >= baseline ? "text-acc" : "text-amber"}`}>
                        {ratio.toFixed(2)} km/%
                      </span>
                      <RowActions kind="trip" id={t.id} />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 pr-2 text-xs text-dim">
                    <span className="num rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[13px] text-fg">{t.start_pct}%</span>
                    <IconArrowRight size={13} stroke={1.75} aria-hidden />
                    <span className="num rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[13px] text-fg">{t.end_pct}%</span>
                    <span className="ml-auto">
                      {formatLocalDateTime(t.trip_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {t.note && <div className="mt-1 text-xs text-muted">{t.note}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
