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
import { relativeAgo } from "@/lib/datetime";
import { enqueueReading } from "@/lib/queue";
import { Spinner } from "./Spinner";

const AUTOSYNC_STORAGE_KEY = "scooter-bms-autosync";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// Each individual read attempt waits up to this long. Total wall-time worst
// case = READ_TIMEOUT_MS × READ_ATTEMPTS + small retry pause.
const READ_TIMEOUT_MS = 10_000;
const READ_ATTEMPTS = 2;
const READ_RETRY_PAUSE_MS = 500;
// After GATT connect, give Android a moment to fully activate the
// notification subscription before sending the first command — otherwise the
// BMS response can land before the OS has wired up our listener, which
// stalls the very first read for the full timeout.
const POST_CONNECT_SETTLE_MS = 800;
const RECONNECT_DELAY_MS = 5000;

type Status =
  | "unsupported"
  | "idle"        // never paired in this browser
  | "searching"   // previously paired, looking for the device
  | "connecting"  // GATT connect in progress
  | "connected"
  | "syncing"
  | "error";

export function BmsCard() {
  const [status, setStatus] = useState<Status>("idle");
  const [reading, setReading] = useState<BmsReading | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    // Lazy initializer: read once on mount. Guarded for SSR where window
    // doesn't exist. Default to true (on) for first-time users.
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUTOSYNC_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  // Persist autoSync changes so the toggle survives reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTOSYNC_STORAGE_KEY, String(autoSync));
  }, [autoSync]);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const writeCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const notifyCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const assemblerRef = useRef(new BmsFrameAssembler());
  const pendingResolveRef = useRef<((r: BmsReading) => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const disconnectListenerSetRef = useRef<WeakSet<BluetoothDevice>>(new WeakSet());

  const handleNotify = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    const chunk = new Uint8Array(value.buffer);
    const parsed = assemblerRef.current.push(chunk);
    if (parsed && pendingResolveRef.current) {
      pendingResolveRef.current(parsed);
      pendingResolveRef.current = null;
    }
  }, []);

  // Send one read command, wait for the BMS response.
  const readOnce = useCallback((): Promise<BmsReading> => {
    const write = writeCharRef.current;
    if (!write) return Promise.reject(new Error("Not connected"));
    return new Promise<BmsReading>((resolve, reject) => {
      assemblerRef.current.reset();
      const timeoutId = setTimeout(() => {
        if (pendingResolveRef.current) {
          pendingResolveRef.current = null;
          reject(new Error("Timed out waiting for BMS response"));
        }
      }, READ_TIMEOUT_MS);
      pendingResolveRef.current = (r) => {
        clearTimeout(timeoutId);
        resolve(r);
      };
      write.writeValueWithoutResponse(CMD_READ_BASIC_INFO).catch((e) => {
        clearTimeout(timeoutId);
        pendingResolveRef.current = null;
        reject(e);
      });
    });
  }, []);

  // Read + persist (with offline queue fallback). Used by auto-sync, manual
  // Sync button, pull-to-refresh, and as the first action after connecting.
  const readAndSave = useCallback(async () => {
    if (!writeCharRef.current) return;
    setStatus("syncing");
    // Try a few times before surfacing failure — BLE notifications can be
    // briefly missed (especially the very first read after a fresh GATT
    // subscription). Re-issuing the command almost always wakes things up.
    let r: BmsReading | null = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt < READ_ATTEMPTS; attempt++) {
      try {
        r = await readOnce();
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < READ_ATTEMPTS - 1) {
          await new Promise((res) => setTimeout(res, READ_RETRY_PAUSE_MS));
        }
      }
    }
    if (!r) {
      setError(lastErr instanceof Error ? lastErr.message : "Couldn't reach BMS");
      setStatus("connected");
      return;
    }
    try {
      setReading(r);
      const now = new Date().toISOString();
      setLastSyncAt(Date.now());
      setError(null);
      const maxTempC = r.temperatures.length > 0 ? Math.max(...r.temperatures) : null;
      try {
        await logBatteryFromBms({
          pct: r.soc,
          voltage: r.voltage,
          current: r.current,
          cycles: r.cycles,
          maxTempC,
          loggedAtIso: now,
        });
      } catch (uploadErr) {
        const looksNetworky =
          !navigator.onLine ||
          uploadErr instanceof TypeError ||
          (uploadErr instanceof Error && /fetch|network/i.test(uploadErr.message));
        if (!looksNetworky) throw uploadErr;
        await enqueueReading({
          soc: r.soc,
          voltage: r.voltage,
          current: r.current,
          cycles: r.cycles,
          maxTempC,
          loggedAtIso: now,
        });
        window.dispatchEvent(new Event("scooter-queue-changed"));
      }
      setStatus("connected");
    } catch (err) {
      // Don't surface read failures as a prominent error — the link is still
      // open, the next auto-sync (or a manual tap) usually succeeds. Keep the
      // last good reading visible and stash a soft hint for the footer.
      setError(err instanceof Error ? err.message : "Couldn't reach BMS");
      setStatus("connected");
    }
  }, [readOnce]);

  // Connect to a known device. On failure schedules a retry; on success kicks
  // off an initial read. Also wires up the disconnect listener so the next
  // drop triggers another retry loop automatically.
  const connectToDevice = useCallback(
    async (device: BluetoothDevice) => {
      if (cancelledRef.current) return;
      setError(null);
      setStatus("connecting");

      // Only register the disconnect listener once per device — re-adding on
      // every connect would stack handlers.
      if (!disconnectListenerSetRef.current.has(device)) {
        device.addEventListener("gattserverdisconnected", () => {
          if (cancelledRef.current) return;
          notifyCharRef.current?.removeEventListener("characteristicvaluechanged", handleNotify);
          writeCharRef.current = null;
          notifyCharRef.current = null;
          setStatus("searching");
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            if (cancelledRef.current) return;
            connectToDevice(device).catch(() => {});
          }, RECONNECT_DELAY_MS);
        });
        disconnectListenerSetRef.current.add(device);
      }

      try {
        const server = await device.gatt!.connect();
        const service = await server.getPrimaryService(JBD_SERVICE_UUID);
        const notifyChar = await service.getCharacteristic(JBD_NOTIFY_CHAR_UUID);
        const writeChar = await service.getCharacteristic(JBD_WRITE_CHAR_UUID);
        await notifyChar.startNotifications();
        notifyChar.removeEventListener("characteristicvaluechanged", handleNotify);
        notifyChar.addEventListener("characteristicvaluechanged", handleNotify);

        deviceRef.current = device;
        writeCharRef.current = writeChar;
        notifyCharRef.current = notifyChar;
        setDeviceName(device.name ?? "BMS");
        setStatus("connected");
        // Settle window — see POST_CONNECT_SETTLE_MS comment.
        await new Promise((res) => setTimeout(res, POST_CONNECT_SETTLE_MS));
        await readAndSave();
      } catch (err) {
        // Connect failed — likely out of range or BMS busy with another app.
        // Stay in "searching" and try again in a few seconds.
        setStatus("searching");
        setError(err instanceof Error ? err.message : "Connecting…");
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (cancelledRef.current) return;
          connectToDevice(device).catch(() => {});
        }, RECONNECT_DELAY_MS);
      }
    },
    [handleNotify, readAndSave]
  );

  // Web Bluetooth availability + initial auto-reconnect.
  useEffect(() => {
    cancelledRef.current = false;
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      if (!navigator.bluetooth?.getDevices) return;
      try {
        const devices = await navigator.bluetooth.getDevices();
        const candidate = devices[0];
        if (!candidate || cancelledRef.current) return;
        deviceRef.current = candidate;
        setDeviceName(candidate.name ?? "BMS");
        setStatus("searching");
        await connectToDevice(candidate);
      } catch {
        /* getDevices may throw if user denied permission — stay idle */
      }
    })();
    return () => {
      cancelledRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try {
        deviceRef.current?.gatt?.disconnect();
      } catch {
        /* noop */
      }
    };
  }, [connectToDevice]);

  // Auto-sync timer.
  useEffect(() => {
    if (status !== "connected" || !autoSync) return;
    const id = setInterval(() => {
      void readAndSave();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, autoSync, readAndSave]);

  // Expose to pull-to-refresh.
  useEffect(() => {
    (window as Window & { __bmsSync?: () => Promise<void> }).__bmsSync = async () => {
      if (deviceRef.current && writeCharRef.current) {
        await readAndSave();
      } else if (deviceRef.current) {
        // Pulling while disconnected → try to reconnect immediately.
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        await connectToDevice(deviceRef.current).catch(() => {});
      }
    };
    return () => {
      delete (window as Window & { __bmsSync?: () => Promise<void> }).__bmsSync;
    };
  }, [readAndSave, connectToDevice]);

  async function handleFirstPairing() {
    setError(null);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [JBD_SERVICE_UUID] }],
      });
      deviceRef.current = device;
      setDeviceName(device.name ?? "BMS");
      await connectToDevice(device);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") return;
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }

  function handleManualRetry() {
    if (deviceRef.current) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      void connectToDevice(deviceRef.current);
    } else {
      void handleFirstPairing();
    }
  }

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

  // First-time setup: never paired — show the big Connect button.
  if (status === "idle") {
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
            onClick={handleFirstPairing}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Connect
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

  // Paired but currently searching for the device — auto-retrying in background.
  if (status === "searching" || status === "connecting") {
    return (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="truncate text-sm font-medium text-neutral-100">
              {deviceName ?? "BMS"}
            </span>
            <span className="text-xs text-neutral-500">
              {status === "connecting" ? "connecting…" : "looking for device…"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            className="flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800"
          >
            <Spinner className="h-3 w-3" />
            Retry
          </button>
        </div>
        {reading && (
          <div className="mt-2 text-[11px] text-neutral-500">
            Last seen{" "}
            <span className="tabular-nums text-neutral-300">{reading.soc}%</span> ·{" "}
            {lastSyncAt ? relativeAgo(lastSyncAt) : ""}
          </div>
        )}
      </Card>
    );
  }

  // connected / syncing / error — populated readings card
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
              accent={
                reading.current > 0.05
                  ? "text-emerald-300"
                  : reading.current < -0.05
                  ? "text-amber-300"
                  : "text-neutral-300"
              }
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
              {lastSyncAt ? `synced ${relativeAgo(lastSyncAt)}` : ""}
            </span>
          </div>
          {reading.temperatures.length > 0 && (
            <div className="mt-2 text-[11px] text-neutral-500">
              MOS {reading.temperatures.map((t) => `${t.toFixed(1)}°C`).join(" · ")}
              {" · "}
              cycles{" "}
              <span className="tabular-nums text-neutral-300">{reading.cycles}</span>
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

      {error && status === "connected" && (
        <div className="mt-2 text-[10px] text-amber-400/80">
          Last sync didn&apos;t complete — will retry automatically.
        </div>
      )}
      {error && status === "error" && (
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

