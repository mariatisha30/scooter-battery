"use client";

import { useEffect, useState, useTransition } from "react";
import { logBattery } from "@/lib/actions";
import { isRedirectError } from "@/lib/isRedirect";

const QUICK_PCTS = [100, 80, 60, 40, 25, 10];

function nowLocalForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

type Props = {
  soloKmPerPct: number;
  passengerKmPerPct: number;
  floor: number;
  calibrationSource: "calibrated" | "default" | "estimated";
};

export function LogForm({ soloKmPerPct, passengerKmPerPct, floor, calibrationSource }: Props) {
  const [pct, setPct] = useState<number | "">("");
  const [when, setWhen] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWhen(nowLocalForInput());
  }, []);

  const valid = typeof pct === "number" && pct >= 0 && pct <= 100;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    const fd = new FormData();
    fd.set("battery_pct", String(pct));
    fd.set("logged_at", when);
    fd.set("note", note);
    startTransition(async () => {
      try {
        await logBattery(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function adjust(delta: number) {
    setPct((prev) => {
      const base = typeof prev === "number" ? prev : 0;
      return Math.max(0, Math.min(100, base + delta));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="text-xs uppercase tracking-wider text-neutral-500">Battery %</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-800 bg-neutral-950 text-xl text-neutral-300 active:scale-95 active:bg-neutral-800"
            aria-label="Decrease"
          >
            −
          </button>
          <input
            name="battery_pct_display"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            required
            autoFocus
            value={pct}
            onChange={(e) => {
              const v = e.target.value;
              setPct(v === "" ? "" : Math.max(0, Math.min(100, Number(v))));
            }}
            placeholder="0"
            className="w-full bg-transparent text-center text-6xl font-semibold tabular-nums text-emerald-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => adjust(1)}
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-800 bg-neutral-950 text-xl text-neutral-300 active:scale-95 active:bg-neutral-800"
            aria-label="Increase"
          >
            +
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PCTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPct(p)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm tabular-nums transition-colors ${
                pct === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>

        {(() => {
          if (typeof pct !== "number") {
            return (
              <div className="mt-4 border-t border-neutral-800 pt-3 text-center text-xs text-neutral-500">
                Pick a value to see remaining range
              </div>
            );
          }
          const usable = Math.max(0, pct - floor);
          const soloKm = usable * soloKmPerPct;
          const passengerKm = usable * passengerKmPerPct;
          const status =
            pct <= floor
              ? { label: "Below safe floor", color: "text-red-400" }
              : pct <= floor + 15
              ? { label: "Charge soon", color: "text-amber-400" }
              : { label: "Good to ride", color: "text-emerald-400" };
          return (
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Range left · down to {floor}%
                </div>
                <div className={`text-[10px] uppercase tracking-wider ${status.color}`}>
                  {status.label}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">🛵 Solo</div>
                  <div className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-100">
                    ≈ {soloKm.toFixed(0)}
                    <span className="ml-1 text-xs font-normal text-neutral-500">km</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">👥 + Passenger</div>
                  <div className="mt-0.5 text-2xl font-semibold tabular-nums text-sky-300">
                    ≈ {passengerKm.toFixed(0)}
                    <span className="ml-1 text-xs font-normal text-neutral-500">km</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-500">
                {soloKmPerPct.toFixed(2)} km/% solo ·{" "}
                {calibrationSource === "calibrated"
                  ? "calibrated"
                  : calibrationSource === "estimated"
                  ? "passenger estimated"
                  : "default rate"}
              </div>
            </div>
          );
        })()}
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-neutral-500">When</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. after work commute"
          className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 focus:border-emerald-500 focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!valid || pending}
        className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {pending ? "Saving…" : "Save reading"}
      </button>
    </form>
  );
}
