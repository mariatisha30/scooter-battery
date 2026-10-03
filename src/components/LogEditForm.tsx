"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBatteryLog } from "@/lib/actions";
import { isoToLocalDateTime, localDateTimeToIso } from "@/lib/datetime";
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
    fd.set("logged_at", localDateTimeToIso(when));
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
      <div className="glass rounded-[22px] p-5">
        <div className="eyebrow text-[11px] text-dim">Battery %</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPct((p) => Math.max(0, p - 1))}
            className="glass grid h-12 w-12 place-items-center rounded-full text-muted active:scale-95"
            aria-label="Decrease"
          >
            <IconMinus size={20} stroke={1.75} aria-hidden />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            required
            value={pct}
            onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="num w-full bg-transparent text-center text-7xl font-bold text-acc focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setPct((p) => Math.min(100, p + 1))}
            className="glass grid h-12 w-12 place-items-center rounded-full text-muted active:scale-95"
            aria-label="Increase"
          >
            <IconPlus size={20} stroke={1.75} aria-hidden />
          </button>
        </div>
      </div>

      <label className="block">
        <span className="eyebrow text-[11px] text-dim">When</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="glass mt-1 w-full rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-acc/60"
        />
      </label>

      <label className="block">
        <span className="eyebrow text-[11px] text-dim">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="glass mt-1 w-full rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-acc/60"
        />
      </label>

      {error && (
        <div className="rounded-2xl bg-red/12 px-4 py-3 text-sm text-red">
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
