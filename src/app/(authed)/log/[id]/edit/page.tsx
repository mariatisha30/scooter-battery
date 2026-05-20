import Link from "next/link";
import { notFound } from "next/navigation";
import { LogEditForm } from "@/components/LogEditForm";
import { supabase, supabaseConfigured, type BatteryLog } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured || !supabase) notFound();

  const { data } = await supabase
    .from("battery_logs")
    .select("id, battery_pct, logged_at, note, trip_id")
    .eq("id", id)
    .maybeSingle();

  const log = data as (BatteryLog & { trip_id: string | null }) | null;
  if (!log) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">← Back</Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit reading</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {log.trip_id
            ? "Heads up — this reading came from a trip. To edit the ride distance, edit the trip instead."
            : "Adjust the value, time, or note."}
        </p>
      </div>
      <LogEditForm
        id={log.id}
        initial={{ battery_pct: log.battery_pct, logged_at: log.logged_at, note: log.note }}
      />
    </div>
  );
}
