"use client";

import Link from "next/link";
import { IconPencil, IconTrash } from "@tabler/icons-react";
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

  // A trip-linked log always opens the trip editor — one ride, one editor.
  const editHref =
    kind === "trip" || linkedTripId ? `/trips/${linkedTripId ?? id}/edit` : `/log/${id}/edit`;

  if (armed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          confirm();
        }}
        disabled={pending}
        className="rounded-full bg-red/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red transition-colors hover:bg-red/25 disabled:opacity-50"
      >
        {pending ? "Deleting" : "Delete?"}
      </button>
    );
  }

  return (
    <div className="flex items-center">
      <Link
        href={editHref}
        aria-label="Edit"
        className="grid h-8 w-8 place-items-center rounded-full text-dim transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        <IconPencil size={15} stroke={1.75} aria-hidden />
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(true);
        }}
        aria-label="Delete"
        className="grid h-8 w-8 place-items-center rounded-full text-dim transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        <IconTrash size={15} stroke={1.75} aria-hidden />
      </button>
    </div>
  );
}
