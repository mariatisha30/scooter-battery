"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { logBatteryFromBms } from "@/lib/actions";
import {
  BmsRequester,
  JBD_NOTIFY_CHAR_UUID,
  JBD_SERVICE_UUID,
  JBD_WRITE_CHAR_UUID,
  type BmsReading,
} from "@/lib/bms";
import { enqueueReading } from "@/lib/queue";

export type BmsStatus =
  | "unsupported"
  | "idle" // never paired in this browser (or Chrome forgot the device)
  | "searching" // paired, looking for the device
  | "connecting" // GATT connect in progress
  | "connected"
  | "syncing"
  | "error";

export type LiveMode = "charging" | "parked";

type BmsContext = {
  status: BmsStatus;
  reading: BmsReading | null;
  /** Last good cell voltages — kept when a later cell read misses. */
  cellsMv: number[] | null;
  lastSyncAt: number | null;
  error: string | null;
  deviceName: string | null;
  autoSync: boolean;
  setAutoSync: (on: boolean) => void;
  /** What the scooter is doing right now; null without a fresh live reading. */
  mode: LiveMode | null;
  connect: () => Promise<void>;
  retry: () => void;
  sync: () => Promise<void>;
};

const Ctx = createContext<BmsContext | null>(null);

export function useBms(): BmsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBms must be used inside <BmsProvider>");
  return ctx;
}

const AUTOSYNC_STORAGE_KEY = "scooter-bms-autosync";
// Parked, the pack barely changes: read every 5 min. While charging, read
// every 15 s so the dial and the numbers feel live.
const IDLE_POLL_MS = 5 * 60 * 1000;
const LIVE_POLL_MS = 15 * 1000;
// Each read attempt waits up to this long. Worst case per sync =
// READ_TIMEOUT_MS × READ_ATTEMPTS + small retry pause.
const READ_TIMEOUT_MS = 10_000;
const READ_ATTEMPTS = 2;
const READ_RETRY_PAUSE_MS = 500;
// Cell voltages are read right after basic info: one short attempt, and a
// miss never blocks saving the reading itself.
const CELL_READ_TIMEOUT_MS = 5_000;
const COMMAND_GAP_MS = 150;
// After GATT connect, give Android a moment to activate the notification
// subscription before the first command — otherwise the first response can
// land before our listener is wired up and the read stalls.
const POST_CONNECT_SETTLE_MS = 800;
const RECONNECT_DELAY_MS = 5000;
// Live polling would write a row every 15 s; only save when the % moves,
// an alarm shows up, or this long has passed. The server dedupes again.
const SAVE_EVERY_MS = 5 * 60 * 1000;
// A reading older than this no longer counts as "live".
const LIVE_MAX_AGE_MS = 10 * 60 * 1000;
// Current thresholds for the live mode (A). Positive = into the pack.
const CHARGING_MIN_A = 0.3;

function modeOf(r: BmsReading): LiveMode {
  if (r.current > CHARGING_MIN_A) return "charging";
  return "parked";
}

export function BmsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<BmsStatus>("idle");
  const [reading, setReading] = useState<BmsReading | null>(null);
  const [cellsMv, setCellsMv] = useState<number[] | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [autoSync, setAutoSyncState] = useState(true);
  // Read the saved toggle after mount so server and client render the same.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(AUTOSYNC_STORAGE_KEY) === "false") setAutoSyncState(false);
    } catch {
      /* storage blocked — default on */
    }
  }, []);

  const setAutoSync = useCallback((on: boolean) => {
    setAutoSyncState(on);
    try {
      window.localStorage.setItem(AUTOSYNC_STORAGE_KEY, String(on));
    } catch {
      /* private mode — keep it in memory only */
    }
  }, []);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const writeCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const notifyCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const busyRef = useRef(false);
  const lastSavedRef = useRef<{ soc: number; at: number } | null>(null);
  const disconnectListenerSetRef = useRef<WeakSet<BluetoothDevice>>(new WeakSet());
  const requesterRef = useRef<BmsRequester | null>(null);
  if (requesterRef.current === null) {
    requesterRef.current = new BmsRequester((bytes) => {
      const write = writeCharRef.current;
      if (!write) return Promise.reject(new Error("Not connected"));
      return write.writeValueWithoutResponse(bytes);
    });
  }

  const handleNotify = useCallback((event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    requesterRef.current?.handleChunk(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }, []);

  // Read + persist (with offline queue fallback). `force` = user asked for it
  // (button / pull-to-refresh), so always save.
  const readAndSave = useCallback(
    async (force = false) => {
      const requester = requesterRef.current;
      if (!writeCharRef.current || !requester || busyRef.current) return;
      busyRef.current = true;
      setStatus("syncing");
      try {
        // BLE notifications can be briefly missed (especially the first read
        // after a fresh subscription) — re-issuing the command wakes it up.
        let r: BmsReading | null = null;
        let lastErr: unknown;
        for (let attempt = 0; attempt < READ_ATTEMPTS; attempt++) {
          try {
            r = await requester.readBasicInfo(READ_TIMEOUT_MS);
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
          return;
        }
        let cells: number[] | null = null;
        try {
          await new Promise((res) => setTimeout(res, COMMAND_GAP_MS));
          cells = await requester.readCellVoltages(CELL_READ_TIMEOUT_MS);
        } catch {
          /* cells are a bonus — save the reading without them */
        }

        const at = Date.now();
        setReading(r);
        if (cells) setCellsMv(cells);
        setLastSyncAt(at);
        setNow(at);
        setError(null);

        const last = lastSavedRef.current;
        const due =
          force ||
          !last ||
          last.soc !== r.soc ||
          at - last.at >= SAVE_EVERY_MS ||
          r.protection !== 0;
        if (!due) return;

        const maxTempC = r.temperatures.length > 0 ? Math.max(...r.temperatures) : null;
        const payload = {
          pct: r.soc,
          voltage: r.voltage,
          current: r.current,
          cycles: r.cycles,
          maxTempC,
          loggedAtIso: new Date(at).toISOString(),
          cellsMv: cells,
          protection: r.protection,
          balanceMask: r.balanceMask,
          remainingAh: r.remainingAh,
          nominalAh: r.nominalAh,
        };
        try {
          const res = await logBatteryFromBms(payload);
          lastSavedRef.current = { soc: r.soc, at };
          if (res.saved) router.refresh();
        } catch (uploadErr) {
          const looksNetworky =
            !navigator.onLine ||
            uploadErr instanceof TypeError ||
            (uploadErr instanceof Error && /fetch|network/i.test(uploadErr.message));
          if (!looksNetworky) throw uploadErr;
          const { pct, voltage, current, cycles, ...rest } = payload;
          await enqueueReading({ soc: pct, voltage, current, cycles, ...rest });
          lastSavedRef.current = { soc: r.soc, at };
          window.dispatchEvent(new Event("scooter-queue-changed"));
        }
      } catch (err) {
        // The link is still open; the next sync usually succeeds. Keep the
        // last good reading visible and leave a soft hint.
        setError(err instanceof Error ? err.message : "Couldn't reach BMS");
      } finally {
        busyRef.current = false;
        if (writeCharRef.current) setStatus("connected");
      }
    },
    [router]
  );

  // Connect to a known device. On failure schedules a retry; on success kicks
  // off an initial read. Also wires the disconnect listener once per device.
  const connectToDevice = useCallback(
    async (device: BluetoothDevice) => {
      if (cancelledRef.current) return;
      setError(null);
      setStatus("connecting");

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
        await new Promise((res) => setTimeout(res, POST_CONNECT_SETTLE_MS));
        await readAndSave(true);
      } catch (err) {
        // Out of range, or the BMS is busy with another app — keep looking.
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

  // Web Bluetooth availability + auto-reconnect to the remembered device.
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
        /* getDevices can throw if permission was revoked — stay idle */
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

  const liveFresh =
    reading !== null &&
    lastSyncAt !== null &&
    now - lastSyncAt < LIVE_MAX_AGE_MS &&
    (status === "connected" || status === "syncing");
  const mode: LiveMode | null = liveFresh && reading ? modeOf(reading) : null;

  // Auto-sync: fast while charging, slow when parked.
  useEffect(() => {
    if (!autoSync || !(status === "connected" || status === "syncing")) return;
    const interval = mode === "charging" ? LIVE_POLL_MS : IDLE_POLL_MS;
    const id = setInterval(() => void readAndSave(), interval);
    return () => clearInterval(id);
  }, [status, autoSync, mode, readAndSave]);

  // Re-evaluate freshness once a minute so a stale reading drops out of "live".
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Theme the whole app by the live state (accent, glow).
  useEffect(() => {
    document.documentElement.dataset.state = mode ?? "parked";
  }, [mode]);
  useEffect(() => () => void delete document.documentElement.dataset.state, []);

  const sync = useCallback(async () => {
    if (deviceRef.current && writeCharRef.current) {
      await readAndSave(true);
    } else if (deviceRef.current) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      await connectToDevice(deviceRef.current).catch(() => {});
    }
  }, [readAndSave, connectToDevice]);

  // Pull-to-refresh hook.
  useEffect(() => {
    const w = window as Window & { __bmsSync?: () => Promise<void> };
    w.__bmsSync = sync;
    return () => {
      delete w.__bmsSync;
    };
  }, [sync]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [JBD_SERVICE_UUID] }],
      });
      deviceRef.current = device;
      setDeviceName(device.name ?? "BMS");
      await connectToDevice(device);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") return; // chooser cancelled
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }, [connectToDevice]);

  const retry = useCallback(() => {
    if (deviceRef.current) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      void connectToDevice(deviceRef.current);
    } else {
      void connect();
    }
  }, [connect, connectToDevice]);

  const value = useMemo<BmsContext>(
    () => ({
      status,
      reading,
      cellsMv,
      lastSyncAt,
      error,
      deviceName,
      autoSync,
      setAutoSync,
      mode,
      connect,
      retry,
      sync,
    }),
    [status, reading, cellsMv, lastSyncAt, error, deviceName, autoSync, setAutoSync, mode, connect, retry, sync]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
