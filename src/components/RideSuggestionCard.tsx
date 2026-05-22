"use client";

import { useEffect, useState, useTransition } from "react";
import { logTrip } from "@/lib/actions";
import { formatDuration, formatLocalDateTime } from "@/lib/datetime";
import { isRedirectError } from "@/lib/isRedirect";
import { Spinner } from "./Spinner";

const DISMISS_KEY = "scooter-dismissed-rides";

type Ride = {
  id: string;
  startAt: string;
  endAt: string;
  startPct: number;
  endPct: number;
  drop: number;
  durationMin: number;
};

export function RideSuggestionCard({ ride }: { ride: Ride }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [km, setKm] = useState("");
  const [withPassenger, setWithPassenger] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Read dismissals on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setDismissed(ids.includes(ride.id));
    } catch {
      setDismissed(false);
    }
  }, [ride.id]);

  function handleDismiss() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(ride.id)) ids.push(ride.id);
      // cap list to most recent 50 dismissals
      localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.slice(-50)));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const kmNum = Number(km);
    if (!Number.isFinite(kmNum) || kmNum <= 0) {
      setError("Distance must be greater than 0");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("start_pct", String(ride.startPct));
    fd.set("end_pct", String(ride.endPct));
    fd.set("distance_km", km);
    fd.set("trip_at", ride.endAt);
    fd.set("note", "");
    fd.set("with_passenger", withPassenger ? "true" : "false");
    fd.set("from", "ride");
    startTransition(async () => {
      try {
        await logTrip(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (dismissed !== false) return null; // hide on null (pre-mount) + true (dismissed)

  const kmPerPct = Number(km) > 0 ? (Number(km) / ride.drop).toFixed(2) : null;
  const durationLabel = formatDuration(ride.durationMin);

  return (
    <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300">
          <span>🛵 Unlogged ride</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="grid h-6 w-6 place-items-center rounded-full text-neutral-600 hover:bg-neutral-800 hover:text-neutral-300"
          title="Hide this suggestion"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex items-baseline justify-between text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-medium tabular-nums text-neutral-100">
            {ride.startPct}% → {ride.endPct}%
          </span>
          <span className="text-[10px] uppercase tracking-wider text-amber-300">
            −{ride.drop}%
          </span>
        </div>
        <span className="text-xs tabular-nums text-neutral-300">{durationLabel}</span>
      </div>

      <div className="mt-1 text-[11px] text-neutral-500">
        {formatLocalDateTime(ride.endAt, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <form onSubmit={handleSave} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            min="0.1"
            inputMode="decimal"
            placeholder="km"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center text-base tabular-nums focus:border-emerald-500 focus:outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setWithPassenger(false)}
            className={`rounded-lg px-3 py-2 text-xs ${
              !withPassenger
                ? "bg-neutral-800 text-neutral-100"
                : "border border-neutral-800 text-neutral-500"
            }`}
            aria-pressed={!withPassenger}
          >
            🛵
          </button>
          <button
            type="button"
            onClick={() => setWithPassenger(true)}
            className={`rounded-lg px-3 py-2 text-xs ${
              withPassenger
                ? "bg-neutral-800 text-neutral-100"
                : "border border-neutral-800 text-neutral-500"
            }`}
            aria-pressed={withPassenger}
            title="With passenger"
          >
            👥
          </button>
        </div>

        {kmPerPct && (
          <div className="text-center text-[10px] text-emerald-300">
            This trip: <span className="font-semibold tabular-nums">{kmPerPct} km/%</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !km}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Saving…" : "Log this ride"}
        </button>
      </form>
    </section>
  );
}

