"use client";

import { useState } from "react";
import { TripForm } from "./TripForm";

export function TripFormDrawer() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3.5 text-left transition-colors hover:border-neutral-700 hover:bg-neutral-900"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-emerald-950">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-sm font-medium text-neutral-100">Log a new trip</span>
        </span>
        <span className="text-xs text-neutral-500">teach the calibration</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          New trip
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        >
          Cancel
        </button>
      </div>
      <TripForm />
    </div>
  );
}
