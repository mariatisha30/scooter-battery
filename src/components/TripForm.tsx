"use client";

import { IconUser, IconUsers } from "@tabler/icons-react";
import { useEffect, useState, useTransition } from "react";
import { logTrip } from "@/lib/actions";
import { localDateTimeToIso, nowLocalDateTime, relativeAgo } from "@/lib/datetime";
import { isRedirectError } from "@/lib/isRedirect";
import { Spinner } from "./Spinner";

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
    setTripAt(nowLocalDateTime());
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
    fd.set("trip_at", localDateTimeToIso(tripAt));
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
    <form onSubmit={handleSubmit} className="glass space-y-3 rounded-[22px] p-4">
      <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() => setWithPassenger(false)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            !withPassenger
              ? "bg-white/[0.08] text-fg"
              : "text-muted hover:text-fg"
          }`}
        >
          <IconUser size={16} stroke={1.75} aria-hidden />
          Solo
        </button>
        <button
          type="button"
          onClick={() => setWithPassenger(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            withPassenger
              ? "bg-white/[0.08] text-fg"
              : "text-muted hover:text-fg"
          }`}
        >
          <IconUsers size={16} stroke={1.75} aria-hidden />
          +1 rider
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

      {showAutofillHint && latest && (
        <div className="rounded-xl bg-acc/10 px-3 py-2 text-[11px] text-acc">
          Start % from your last reading · {relativeAgo(latest.logged_at)}
        </div>
      )}

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
        <span className="eyebrow text-[11px] text-dim">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. office round trip"
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
        />
      </label>

      {error && (
        <div className="rounded-xl bg-red/12 px-3 py-2 text-xs text-red">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 bg-acc text-sm font-semibold text-acc-ink hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-dim"
      >
        {pending && <Spinner className="h-4 w-4" />}
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
      <span className="eyebrow text-[11px] text-dim">{label}</span>
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
        className="num mt-1 w-full px-3 py-2.5 text-center text-lg rounded-xl bg-white/[0.04] ring-1 ring-line focus:outline-none focus:ring-acc/60"
      />
    </label>
  );
}
