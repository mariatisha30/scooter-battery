"use client";

import { IconBluetooth, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { relativeAgo } from "@/lib/datetime";
import { useBms } from "./BmsProvider";

export function ConnectionCard() {
  const { status, deviceName, lastSyncAt, autoSync, setAutoSync, connect, retry, sync, error } = useBms();

  const statusText: Record<typeof status, string> = {
    unsupported: "Bluetooth isn't available here — use Chrome on Android",
    idle: "Not connected",
    searching: "Looking for the BMS…",
    connecting: "Connecting…",
    connected: lastSyncAt ? `Synced ${relativeAgo(lastSyncAt)}` : "Connected",
    syncing: "Syncing…",
    error: error ?? "Connection failed",
  };

  let action: React.ReactNode = null;
  if (status === "idle" || status === "error") {
    action = (
      <button
        type="button"
        onClick={() => (status === "idle" ? void connect() : retry())}
        className="rounded-full bg-acc px-4 py-2 text-xs font-semibold text-acc-ink hover:brightness-110"
      >
        {status === "idle" ? "Connect" : "Retry"}
      </button>
    );
  } else if (status === "searching" || status === "connecting") {
    action = (
      <button type="button" onClick={retry} className="glass flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-muted">
        <IconLoader2 size={14} stroke={1.75} className="animate-spin" aria-hidden />
        Retry
      </button>
    );
  } else if (status === "connected" || status === "syncing") {
    action = (
      <button
        type="button"
        onClick={() => void sync()}
        disabled={status === "syncing"}
        className="glass flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-muted hover:text-fg"
      >
        <IconRefresh size={14} stroke={1.75} className={status === "syncing" ? "animate-spin" : ""} aria-hidden />
        Sync now
      </button>
    );
  }

  return (
    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-acc">
          <IconBluetooth size={20} stroke={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{deviceName ?? "JBD BMS"}</div>
          <div className="truncate text-xs text-muted">{statusText[status]}</div>
        </div>
        {action}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3.5">
        <div>
          <div className="text-sm">Auto-sync</div>
          <div className="text-xs text-muted">Every 5 min parked, every 15 s charging or riding</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoSync}
          aria-label="Auto-sync"
          onClick={() => setAutoSync(!autoSync)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${autoSync ? "bg-acc" : "bg-white/[0.12]"}`}
        >
          <span
            className={`absolute left-0 top-1 h-5 w-5 rounded-full shadow transition-transform ${
              autoSync ? "translate-x-6 bg-acc-ink" : "translate-x-1 bg-fg"
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-xs text-dim">
        Close the BMS maker&apos;s app first — the BMS only takes one Bluetooth connection at a time.
      </p>
    </section>
  );
}
