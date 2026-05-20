"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteBatteryLog, deleteTrip } from "@/lib/actions";

type Props = {
  kind: "log" | "trip";
  id: string;
  /** If a log row is linked to a trip, editing should target the trip instead. */
  linkedTripId?: string | null;
};

export function RowActions({ kind, id, linkedTripId }: Props) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) return;
    disarmTimer.current = setTimeout(() => setArmed(false), 2500);
    return () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    };
  }, [armed]);

  function confirm() {
    startTransition(async () => {
      try {
        if (kind === "log") await deleteBatteryLog(id);
        else await deleteTrip(id);
      } finally {
        setArmed(false);
      }
    });
  }

  // Where editing should go. A trip-linked log always opens the trip editor —
  // since they're a single conceptual ride, you edit one and the other syncs.
  const editHref =
    kind === "trip" || linkedTripId
      ? `/trips/${linkedTripId ?? id}/edit`
      : `/log/${id}/edit`;

  if (armed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          confirm();
        }}
        disabled={pending}
        className="rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
      >
        {pending ? "…" : "Delete?"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={editHref}
        aria-label="Edit"
        className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 12h2.5L11 5.5l-2.5-2.5L2 9.5V12z M8.5 3l2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(true);
        }}
        aria-label="Delete"
        className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 4h8M5.5 4V2.5h3V4M5.5 6.5v4M8.5 6.5v4M4 4l.5 7.5h5L10 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
