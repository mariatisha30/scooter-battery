"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateTrip } from "@/lib/actions";
import { isoToLocalDateTime } from "@/lib/datetime";
import { isRedirectError } from "@/lib/isRedirect";
import { Spinner } from "./Spinner";

type Props = {
  id: string;
  initial: {
    start_pct: number;
    end_pct: number;
    distance_km: number;
    trip_at: string;
    with_passenger: boolean;
    km_estimated: boolean;
    note: string | null;
  };
};

export function TripEditForm({ id, initial }: Props) {
  const router = useRouter();
  const [startPct, setStartPct] = useState<number>(initial.start_pct);
  const [endPct, setEndPct] = useState<number>(initial.end_pct);
  const [km, setKm] = useState<string>(String(initial.distance_km));
  const [tripAt, setTripAt] = useState<string>(isoToLocalDateTime(initial.trip_at));
  const [withPassenger, setWithPassenger] = useState<boolean>(initial.with_passenger);
  const [note, setNote] = useState<string>(initial.note ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const kmNum = Number(km);
  const used = startPct > endPct ? startPct - endPct : null;
  const liveKmPerPct = used && Number.isFinite(kmNum) && kmNum > 0 ? kmNum / used : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (startPct <= endPct) {
      setError("Start % must be greater than end %");
      return;
    }
    if (!Number.isFinite(kmNum) || kmNum <= 0) {
      setError("Distance must be greater than 0");
      return;
    }
    const fd = new FormData();
    fd.set("start_pct", String(startPct));
    fd.set("end_pct", String(endPct));
    fd.set("distance_km", km);
    fd.set("trip_at", tripAt);
    fd.set("note", note);
    fd.set("with_passenger", withPassenger ? "true" : "false");
    startTransition(async () => {
      try {
        await updateTrip(id, fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      {initial.km_estimated && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
          This was an auto-estimated trip. Saving will mark it as measured and feed your calibration.
        </div>
      )}

      <div className="flex gap-2 rounded-xl bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => setWithPassenger(false)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            !withPassenger ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          🛵 Solo
        </button>
        <button
          type="button"
          onClick={() => setWithPassenger(true)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            withPassenger ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          👥 With passenger
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Num label="Start %" value={startPct} onChange={setStartPct} min={1} max={100} />
        <Num label="End %" value={endPct} onChange={setEndPct} min={0} max={99} />
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">km</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            required
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center tabular-nums focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {liveKmPerPct !== null && (
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-300">
          This trip: <span className="font-semibold tabular-nums">{liveKmPerPct.toFixed(2)} km/%</span>
        </div>
      )}

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">When</span>
        <input
          type="datetime-local"
          value={tripAt}
          onChange={(e) => setTripAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 focus:border-emerald-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 focus:border-emerald-500 focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Num({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        required
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center tabular-nums focus:border-emerald-500 focus:outline-none"
      />
    </label>
  );
}
