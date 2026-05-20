"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBatteryLog } from "@/lib/actions";
import { isoToLocalDateTime } from "@/lib/datetime";
import { isRedirectError } from "@/lib/isRedirect";
import { Spinner } from "./Spinner";

type Props = {
  id: string;
  initial: {
    battery_pct: number;
    logged_at: string;
    note: string | null;
  };
};

export function LogEditForm({ id, initial }: Props) {
  const router = useRouter();
  const [pct, setPct] = useState<number>(initial.battery_pct);
  const [when, setWhen] = useState<string>(isoToLocalDateTime(initial.logged_at));
  const [note, setNote] = useState<string>(initial.note ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("battery_pct", String(pct));
    fd.set("logged_at", when);
    fd.set("note", note);
    startTransition(async () => {
      try {
        await updateBatteryLog(id, fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="text-xs uppercase tracking-wider text-neutral-500">Battery %</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPct((p) => Math.max(0, p - 1))}
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-800 bg-neutral-950 text-xl text-neutral-300 active:scale-95 active:bg-neutral-800"
            aria-label="Decrease"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            required
            value={pct}
            onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-full bg-transparent text-center text-6xl font-semibold tabular-nums text-emerald-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setPct((p) => Math.min(100, p + 1))}
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-800 bg-neutral-950 text-xl text-neutral-300 active:scale-95 active:bg-neutral-800"
            aria-label="Increase"
          >
            +
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-neutral-500">When</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 focus:border-emerald-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 focus:border-emerald-500 focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
