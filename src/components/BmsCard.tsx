"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logBatteryFromBms } from "@/lib/actions";
import {
  BmsFrameAssembler,
  CMD_READ_BASIC_INFO,
  JBD_NOTIFY_CHAR_UUID,
  JBD_SERVICE_UUID,
  JBD_WRITE_CHAR_UUID,
  formatMinutes,
  timeEstimateMinutes,
  type BmsReading,
} from "@/lib/bms";
import { enqueueReading } from "@/lib/queue";
import { Spinner } from "./Spinner";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const READ_TIMEOUT_MS = 8000;

type Status = "unsupported" | "idle" | "connecting" | "connected" | "syncing" | "error";

export function BmsCard() {
  const [status, setStatus] = useState<Status>("idle");
  const [reading, setReading] = useState<BmsReading | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const writeCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const notifyCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const assemblerRef = useRef(new BmsFrameAssembler());
  const pendingResolveRef = useRef<((r: BmsReading) => void) | null>(null);
  const pendingRejectRef = useRef<((e: Error) => void) | null>(null);

  // Check Web Bluetooth availability once on mount.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      setStatus("unsupported");
    }
  }, []);

  // Try silent reconnect to a previously paired device on mount.
  useEffect(() => {
    if (status !== "idle") return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.bluetooth?.getDevices) return;
        const devices = await navigator.bluetooth.getDevices();
        const candidate = devices[0];
        if (cancelled || !candidate) return;
        await connectToDevice(candidate);
      } catch {
        // silent — user just hasn't paired yet
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync timer.
  useEffect(() => {
    if (status !== "connected" || !autoSync) return;
    const id = setInterval(() => {
      void readAndSave();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, autoSync]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      try {
        deviceRef.current?.gatt?.disconnect();
      } catch {
        /* noop */
      }
    };
  }, []);

  const handleNotify = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    const chunk = new Uint8Array(value.buffer);
    const parsed = assemblerRef.current.push(chunk);
    if (parsed && pendingResolveRef.current) {
      pendingResolveRef.current(parsed);
      pendingResolveRef.current = null;
      pendingRejectRef.current = null;
    }
  }, []);

  async function connectToDevice(device: BluetoothDevice) {
    setStatus("connecting");
    setError(null);
    try {
      device.addEventListener("gattserverdisconnected", () => {
        setStatus("idle");
      });
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(JBD_SERVICE_UUID);
      const notifyChar = await service.getCharacteristic(JBD_NOTIFY_CHAR_UUID);
      const writeChar = await service.getCharacteristic(JBD_WRITE_CHAR_UUID);
      await notifyChar.startNotifications();
      notifyChar.addEventListener("characteristicvaluechanged", handleNotify);

      deviceRef.current = device;
      writeCharRef.current = writeChar;
      notifyCharRef.current = notifyChar;
      setDeviceName(device.name ?? "BMS");
      setStatus("connected");
      // First read immediately
      await readAndSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }

  async function handleConnectClick() {
    setError(null);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [JBD_SERVICE_UUID] }],
      });
      await connectToDevice(device);
    } catch (err) {
      // User cancelled the chooser
      if (err instanceof DOMException && err.name === "NotFoundError") return;
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }

  function readOnce(): Promise<BmsReading> {
    const write = writeCharRef.current;
    if (!write) return Promise.reject(new Error("Not connected"));
    return new Promise<BmsReading>((resolve, reject) => {
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;
      assemblerRef.current.reset();
      const timeoutId = setTimeout(() => {
        if (pendingResolveRef.current === resolve) {
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
          reject(new Error("Timed out waiting for BMS response"));
        }
      }, READ_TIMEOUT_MS);

      write
        .writeValueWithoutResponse(CMD_READ_BASIC_INFO)
        .catch((e) => {
          clearTimeout(timeoutId);
          pendingResolveRef.current = null;
          reject(e);
        });

      // Resolve wrapper to also clear the timeout
      const origResolve = resolve;
      pendingResolveRef.current = (r) => {
        clearTimeout(timeoutId);
        origResolve(r);
      };
    });
  }

  const readAndSave = useCallback(async () => {
    if (!writeCharRef.current) return;
    setStatus("syncing");
    try {
      const r = await readOnce();
      setReading(r);
      const now = new Date().toISOString();
      setLastSyncAt(Date.now());
      try {
        await logBatteryFromBms(r.soc, r.voltage, r.current, now);
      } catch (uploadErr) {
        // Offline or server unreachable — stash to IndexedDB so OfflineSync
        // can drain it when connectivity returns. Don't surface as an error.
        const looksNetworky =
          !navigator.onLine ||
          uploadErr instanceof TypeError ||
          (uploadErr instanceof Error && /fetch|network/i.test(uploadErr.message));
        if (!looksNetworky) throw uploadErr;
        await enqueueReading({
          soc: r.soc,
          voltage: r.voltage,
          current: r.current,
          loggedAtIso: now,
        });
        window.dispatchEvent(new Event("scooter-queue-changed"));
      }
      setStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Read failed");
      setStatus("error");
    }
  }, []);

  // Expose so the page-level pull-to-refresh can trigger a sync.
  useEffect(() => {
    (window as Window & { __bmsSync?: () => Promise<void> }).__bmsSync = async () => {
      if (deviceRef.current && writeCharRef.current) await readAndSave();
    };
    return () => {
      delete (window as Window & { __bmsSync?: () => Promise<void> }).__bmsSync;
    };
  }, [readAndSave]);

  // --- Render branches --------------------------------------------------------

  if (status === "unsupported") {
    return (
      <Card>
        <div className="text-sm font-medium text-amber-300">Bluetooth not supported</div>
        <div className="mt-1 text-xs text-neutral-400">
          Open this page in Chrome on Android (or Edge) to connect to your BMS.
          iOS Safari and Firefox don&apos;t support Web Bluetooth.
        </div>
      </Card>
    );
  }

  if (status === "idle" || status === "connecting") {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-neutral-100">JBD BMS</div>
            <div className="mt-0.5 text-xs text-neutral-500">
              Bluetooth + Location must be on.
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={status === "connecting"}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {status === "connecting" && <Spinner className="h-4 w-4" />}
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </Card>
    );
  }

  // connected / syncing / error states all have reading data available
  const est = reading ? timeEstimateMinutes(reading) : null;
  const stateLabel =
    est?.state === "charging"
      ? "Charging"
      : est?.state === "discharging"
      ? "Discharging"
      : "Idle";
  const stateColor =
    est?.state === "charging"
      ? "text-emerald-300"
      : est?.state === "discharging"
      ? "text-amber-300"
      : "text-neutral-400";

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${
                status === "error" ? "bg-red-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                status === "error" ? "bg-red-400" : "bg-emerald-400"
              }`}
            />
          </span>
          <span className="truncate text-sm font-medium text-neutral-100">
            {deviceName ?? "BMS"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void readAndSave()}
          disabled={status === "syncing"}
          className="flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          {status === "syncing" && <Spinner className="h-3 w-3" />}
          {status === "syncing" ? "Syncing…" : "Sync"}
        </button>
      </div>

      {reading && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="SOC" value={`${reading.soc}%`} accent="text-emerald-300" />
            <Stat label="Voltage" value={`${reading.voltage.toFixed(2)} V`} />
            <Stat
              label="Current"
              value={`${reading.current >= 0 ? "+" : ""}${reading.current.toFixed(2)} A`}
              accent={reading.current > 0.05 ? "text-emerald-300" : reading.current < -0.05 ? "text-amber-300" : "text-neutral-300"}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between text-xs">
            <span className={`uppercase tracking-wider ${stateColor}`}>
              {stateLabel}
              {est?.minutes != null && est.state !== "idle" && (
                <>
                  {" "}· {est.state === "charging" ? "full in" : "empty in"}{" "}
                  <span className="tabular-nums text-neutral-200">
                    {formatMinutes(est.minutes)}
                  </span>
                </>
              )}
            </span>
            <span className="text-neutral-500">
              {lastSyncAt ? `synced ${relativeMin(lastSyncAt)}` : ""}
            </span>
          </div>
          {reading.temperatures.length > 0 && (
            <div className="mt-2 text-[11px] text-neutral-500">
              MOS {reading.temperatures.map((t) => `${t.toFixed(1)}°C`).join(" · ")}
              {" · "}
              cycles <span className="tabular-nums text-neutral-300">{reading.cycles}</span>
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-2 text-[11px]">
        <label className="flex items-center gap-2 text-neutral-400">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="accent-emerald-500"
          />
          Auto-sync every 5 min
        </label>
        <span className="text-neutral-600">pull down to sync</span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  accent = "text-neutral-200",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-950/60 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

function relativeMin(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  return `${min} min ago`;
}
