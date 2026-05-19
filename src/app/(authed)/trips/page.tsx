import Link from "next/link";
import { RowDelete } from "@/components/RowDelete";
import { Toast } from "@/components/Toast";
import { TripFormDrawer } from "@/components/TripFormDrawer";
import { calibrationFromTrips } from "@/lib/calibration";
import { supabase, supabaseConfigured, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const trips: Trip[] = supabaseConfigured && supabase
    ? ((await supabase.from("trips").select("*").order("trip_date", { ascending: false }).limit(50)).data ?? [])
    : [];

  const cal = calibrationFromTrips(trips);

  return (
    <div className="space-y-6">
      {saved && <Toast message={`Saved ${saved} km trip`} />}
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Trips</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each trip teaches the app your real km per %.
        </p>
      </div>

      <section className="grid grid-cols-2 divide-x divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900/50">
        <div className="px-3 py-3 text-center">
          <div className="text-xl font-semibold tabular-nums text-emerald-400">
            {cal.solo.value.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
            🛵 solo km/% {cal.solo.source === "calibrated" ? `· ${cal.solo.sampleSize} trips` : "· default"}
          </div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="text-xl font-semibold tabular-nums text-sky-400">
            {cal.passenger.value.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
            👥 +1 km/%{" "}
            {cal.passenger.source === "calibrated"
              ? `· ${cal.passenger.sampleSize} trips`
              : cal.passenger.source === "estimated"
              ? "· estimated"
              : "· default"}
          </div>
        </div>
      </section>

      <TripFormDrawer />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Recent trips
        </h2>
        {trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
            <p>No trips logged yet.</p>
            <p className="mt-2 text-xs text-neutral-600">
              Log one and the app learns your real km/% — right now it's using the default{" "}
              <span className="tabular-nums text-neutral-400">1.50</span>.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => {
              const used = t.start_pct - t.end_pct;
              const ratio = Number(t.distance_km) / used;
              const vsDefault = ratio / 1.5;
              const efficiency = vsDefault >= 1 ? "text-emerald-400" : "text-amber-400";
              return (
                <li
                  key={t.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-medium tabular-nums">
                        {Number(t.distance_km).toFixed(1)} km
                      </div>
                      {t.with_passenger && (
                        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-sky-300">
                          👥 +1
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs tabular-nums ${efficiency}`}>
                        {ratio.toFixed(2)} km/%
                      </div>
                      <RowDelete kind="trip" id={t.id} />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 tabular-nums text-neutral-300">
                      {t.start_pct}%
                    </span>
                    <span>→</span>
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 tabular-nums text-neutral-300">
                      {t.end_pct}%
                    </span>
                    <span className="ml-auto">
                      {new Date(t.trip_date).toLocaleDateString([], { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {t.note && <div className="mt-1 text-xs text-neutral-400">{t.note}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
