"use client";

import { IconBluetooth, IconBluetoothOff, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { relativeAgo } from "@/lib/datetime";
import { useBms } from "./BmsProvider";

const BASE = "flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors";

/** Header status for the BMS link. Turns into a Connect button when Chrome
 * has no remembered BMS (first time, or after Chrome forgot the permission). */
export function BmsPill() {
  const { status, lastSyncAt, connect, retry, sync } = useBms();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (status === "unsupported") {
    return (
      <span className={`${BASE} glass text-dim`} title="Open in Chrome on Android to read the BMS">
        <IconBluetoothOff size={15} stroke={1.75} aria-hidden />
        No Bluetooth
      </span>
    );
  }
  if (status === "idle" || status === "error") {
    return (
      <button
        type="button"
        onClick={() => (status === "idle" ? void connect() : retry())}
        className={`${BASE} bg-acc font-semibold text-acc-ink hover:brightness-110`}
      >
        <IconBluetooth size={15} stroke={2} aria-hidden />
        {status === "idle" ? "Connect BMS" : "Retry"}
      </button>
    );
  }
  if (status === "searching" || status === "connecting") {
    return (
      <button type="button" onClick={retry} className={`${BASE} glass text-muted hover:text-fg`}>
        <IconLoader2 size={15} stroke={1.75} className="animate-spin" aria-hidden />
        {status === "connecting" ? "Connecting" : "Finding BMS"}
      </button>
    );
  }
  const syncing = status === "syncing";
  return (
    <button
      type="button"
      onClick={() => void sync()}
      disabled={syncing}
      aria-label="Sync with BMS now"
      className={`${BASE} glass text-muted hover:text-fg`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-acc ring-3 ring-acc/20" />
      {syncing ? "Syncing" : lastSyncAt ? relativeAgo(lastSyncAt) : "Live"}
      <IconRefresh size={15} stroke={1.75} className={syncing ? "animate-spin" : ""} aria-hidden />
    </button>
  );
}
