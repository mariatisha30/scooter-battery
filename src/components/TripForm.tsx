"use client";

import { useEffect, useState, useTransition } from "react";
import { logTrip } from "@/lib/actions";
import { isRedirectError } from "@/lib/isRedirect";

function nowLocalForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function relativeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "in the future";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

type Props = {
  latest: { battery_pct: number; logged_at: string } | null;
};

export function TripForm({ latest }: Props) {
  const [startPct, setStartPct] = useState<number | "">(latest?.battery_pct ?? "");
  const [startOverridden, setStartOverridden] = useState(false);
  const [endPct, setEndPct] = useState<number | "">("");
  const [km, setKm] = useState<string>("");
  const [tripAt, setTripAt] = useState<string>("");
  const [note, setNote] = useState("");
  const [withPassenger, setWithPassenger] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTripAt(nowLocalForInput());
  }, []);

  const usedPct =
    typeof startPct === "number" && typeof endPct === "number" && startPct > endPct
      ? startPct - endPct
      : null;
  const kmNum = Number(km);
  const liveKmPerPct = usedPct && Number.isFinite(kmNum) && kmNum > 0 ? kmNum / usedPct : null;
  const showAutofillHint = !startOverridden && latest && startPct === latest.battery_pct;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (typeof startPct !== "number" || typeof endPct !== "number" || startPct <= endPct) {
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
        await logTrip(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex gap-2 rounded-xl bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => setWithPassenger(false)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            !withPassenger
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          🛵 Solo
        </button>
        <button
          type="button"
          onClick={() => setWithPassenger(true)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            withPassenger
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          👥 With passenger
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <NumField
          label="Start %"
          value={startPct}
          onChange={(v) => {
            setStartPct(v);
            setStartOverridden(true);
          }}
          min={1}
          max={100}
        />
        <NumField label="End %" value={endPct} onChange={setEndPct} min={0} max={99} autoFocus={!!latest} />
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

      {showAutofillHint && latest && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-300">
          Start % from your last reading · {relativeAgo(latest.logged_at)}
        </div>
      )}

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
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. office round trip"
          className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 focus:border-emerald-500 focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {pending ? "Saving…" : "Save trip"}
      </button>
    </form>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  autoFocus,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min: number;
  max: number;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? "" : Math.max(min, Math.min(max, Number(v))));
        }}
        className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center tabular-nums focus:border-emerald-500 focus:outline-none"
      />
    </label>
  );
}
