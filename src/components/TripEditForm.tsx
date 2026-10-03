"use client";

import { IconUser, IconUsers } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateTrip } from "@/lib/actions";
import { isoToLocalDateTime, localDateTimeToIso } from "@/lib/datetime";
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
    fd.set("trip_at", localDateTimeToIso(tripAt));
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
    <form onSubmit={handleSubmit} className="glass space-y-3 rounded-[22px] p-4">
      {initial.km_estimated && (
        <div className="rounded-xl bg-amber/10 px-3 py-2 text-[11px] text-amber">
          This was an auto-estimated trip. Saving will mark it as measured and feed your calibration.
        </div>
      )}

      <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() => setWithPassenger(false)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            !withPassenger ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"
          }`}
        >
          <IconUser size={16} stroke={1.75} aria-hidden />
          Solo
        </button>
        <button
          type="button"
          onClick={() => setWithPassenger(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            withPassenger ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"
          }`}
        >
          <IconUsers size={16} stroke={1.75} aria-hidden />
          +1 rider
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Num label="Start %" value={startPct} onChange={setStartPct} min={1} max={100} />
        <Num label="End %" value={endPct} onChange={setEndPct} min={0} max={99} />
        <label className="block">
          <span className="eyebrow text-[11px] text-dim">km</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            required
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className="num mt-1 w-full px-3 py-2.5 text-center text-lg rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
          />
        </label>
      </div>

      {liveKmPerPct !== null && (
        <div className="rounded-xl bg-acc/10 px-3 py-2 text-center text-xs text-acc">
          This trip: <span className="font-semibold tabular-nums">{liveKmPerPct.toFixed(2)} km/%</span>
        </div>
      )}

      <label className="block">
        <span className="eyebrow text-[11px] text-dim">When</span>
        <input
          type="datetime-local"
          value={tripAt}
          onChange={(e) => setTripAt(e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
        />
      </label>
      <label className="block">
        <span className="eyebrow text-[11px] text-dim">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
        />
      </label>

      {error && (
        <div className="rounded-xl bg-red/12 px-3 py-2 text-xs text-red">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="glass flex-1 rounded-2xl py-3 text-sm font-medium text-muted hover:text-fg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3 bg-acc text-sm font-semibold text-acc-ink hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-dim"
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
      <span className="eyebrow text-[11px] text-dim">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        required
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="num mt-1 w-full px-3 py-2.5 text-center text-lg rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
      />
    </label>
  );
}
