"use client";

import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { TripForm } from "./TripForm";

type Props = {
  latest: { battery_pct: number; logged_at: string } | null;
};

export function TripFormDrawer({ latest }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass flex w-full items-center justify-between rounded-[22px] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-acc text-acc-ink">
            <IconPlus size={16} stroke={2.25} aria-hidden />
          </span>
          <span className="text-sm font-medium">Log a trip</span>
        </span>
        <span className="text-xs text-dim">{latest ? `starts at ${latest.battery_pct}%` : "teaches the range"}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="eyebrow">New trip</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2.5 py-1 text-xs text-muted hover:bg-white/[0.06] hover:text-fg"
        >
          Cancel
        </button>
      </div>
      <TripForm latest={latest} />
    </div>
  );
}
