import Link from "next/link";
import { LogForm } from "@/components/LogForm";
import { batteryFloor, calibrationFromTrips } from "@/lib/calibration";
import { supabase, supabaseConfigured, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const trips: Trip[] = supabaseConfigured && supabase
    ? ((await supabase.from("trips").select("*").order("trip_at", { ascending: false }).limit(20)).data ?? [])
    : [];
  const cal = calibrationFromTrips(trips);
  const floor = batteryFloor();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Log battery</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tap a quick value or type your reading.
        </p>
      </div>
      <LogForm
        soloKmPerPct={cal.solo.value}
        passengerKmPerPct={cal.passenger.value}
        floor={floor}
        calibrationSource={cal.solo.source}
      />
    </div>
  );
}
