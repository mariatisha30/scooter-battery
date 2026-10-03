import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripEditForm } from "@/components/TripEditForm";
import { supabase, supabaseConfigured, type Trip } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured || !supabase) notFound();

  const { data } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
  const trip = data as Trip | null;
  if (!trip) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><IconArrowLeft size={16} stroke={1.75} aria-hidden />Back</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit trip</h1>
        <p className="mt-1 text-sm text-muted">
          Changes here also sync the linked battery reading.
        </p>
      </div>
      <TripEditForm
        id={trip.id}
        initial={{
          start_pct: trip.start_pct,
          end_pct: trip.end_pct,
          distance_km: Number(trip.distance_km),
          trip_at: trip.trip_at,
          with_passenger: trip.with_passenger,
          km_estimated: trip.km_estimated,
          note: trip.note,
        }}
      />
    </div>
  );
}
