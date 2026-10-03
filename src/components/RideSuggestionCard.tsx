"use client";

import { IconArrowRight, IconScooterElectric, IconUser, IconUsers, IconX } from "@tabler/icons-react";
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
    <section className="glass rounded-[22px] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow flex items-center gap-1.5 text-[11px] text-sky">
          <IconScooterElectric size={14} stroke={1.75} aria-hidden />
          <span>Unlogged ride</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 place-items-center rounded-full text-dim hover:bg-white/[0.06] hover:text-fg"
          title="Hide this suggestion"
        >
          <IconX size={15} stroke={1.75} aria-hidden />
        </button>
      </div>

      <div className="mt-2 flex items-baseline justify-between text-sm">
        <div className="flex items-baseline gap-2">
          <span className="num flex items-center gap-1 text-lg font-semibold text-fg">
            {ride.startPct}%
            <IconArrowRight size={14} stroke={1.75} className="text-dim" aria-hidden />
            {ride.endPct}%
          </span>
          <span className="num text-sm font-semibold text-amber">
            −{ride.drop}%
          </span>
        </div>
        <span className="text-xs text-muted">{durationLabel}</span>
      </div>

      <div className="mt-1 text-[11px] text-dim">
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
            className="num flex-1 px-3 py-2 text-center text-lg rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
            required
          />
          <button
            type="button"
            onClick={() => setWithPassenger(false)}
            className={`grid place-items-center rounded-xl px-3 py-2 text-xs ${
              !withPassenger
                ? "bg-white/[0.08] text-fg"
                : "text-muted ring-1 ring-line"
            }`}
            aria-pressed={!withPassenger}
          >
            <IconUser size={16} stroke={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWithPassenger(true)}
            className={`grid place-items-center rounded-xl px-3 py-2 text-xs ${
              withPassenger
                ? "bg-white/[0.08] text-fg"
                : "text-muted ring-1 ring-line"
            }`}
            aria-pressed={withPassenger}
            title="With passenger"
          >
            <IconUsers size={16} stroke={1.75} aria-hidden />
          </button>
        </div>

        {kmPerPct && (
          <div className="text-center text-[11px] text-acc">
            This trip: <span className="font-semibold tabular-nums">{kmPerPct} km/%</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red/12 px-3 py-1.5 text-xs text-red">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !km}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 bg-acc text-sm font-semibold text-acc-ink hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-dim"
        >
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Saving…" : "Log this ride"}
        </button>
      </form>
    </section>
  );
}

