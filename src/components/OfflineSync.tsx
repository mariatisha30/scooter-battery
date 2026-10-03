"use client";

import { IconCloudOff, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logBatteryFromBms } from "@/lib/actions";
import { countQueued, getAllQueued, removeQueued } from "@/lib/queue";

type Stage = "idle" | "syncing";

/**
 * Top-of-page status pill + queue drainer.
 * - Watches navigator.onLine + the global "queue-changed" event.
 * - When online, drains queued BMS readings oldest-first via logBatteryFromBms,
 *   preserving each row's original timestamp.
 * - Shown only when offline or there are pending rows.
 */
export function OfflineSync() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    setOnline(navigator.onLine);

    let cancelled = false;

    async function refreshCount() {
      try {
        const n = await countQueued();
        if (!cancelled) setPending(n);
      } catch {
        /* IndexedDB unavailable — ignore */
      }
    }

    async function drain() {
      if (!navigator.onLine || stage === "syncing") return;
      let items: Awaited<ReturnType<typeof getAllQueued>>;
      try {
        items = await getAllQueued();
      } catch {
        return;
      }
      if (items.length === 0) {
        await refreshCount();
        return;
      }

      setStage("syncing");
      setPending(items.length);
      let drained = 0;
      for (const item of items) {
        try {
          await logBatteryFromBms({
            pct: item.soc,
            voltage: item.voltage,
            current: item.current,
            cycles: item.cycles,
            maxTempC: item.maxTempC,
            loggedAtIso: item.loggedAtIso,
            cellsMv: item.cellsMv,
            protection: item.protection,
            balanceMask: item.balanceMask,
            remainingAh: item.remainingAh,
            nominalAh: item.nominalAh,
          });
          if (item.id !== undefined) await removeQueued(item.id);
          drained++;
        } catch {
          // Stop on any error — likely lost connection mid-drain.
          break;
        }
      }
      setStage("idle");
      await refreshCount();
      if (drained > 0) router.refresh();
    }

    function handleOnline() {
      setOnline(true);
      void drain();
    }
    function handleOffline() {
      setOnline(false);
    }
    function handleQueueChanged() {
      void refreshCount().then(() => drain());
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("scooter-queue-changed", handleQueueChanged);

    void refreshCount().then(() => drain());

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("scooter-queue-changed", handleQueueChanged);
    };
    // We re-create handlers each render but the listeners are cleaned up;
    // intentionally exclude `stage` so drain() captures the current value
    // through the local variable above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (online && pending === 0) return null;

  const tone = !online
    ? "bg-amber/12 text-amber"
    : stage === "syncing"
    ? "bg-acc/12 text-acc"
    : "glass text-muted";
  const Icon = !online ? IconCloudOff : IconRefresh;

  return (
    <div role="status" className={`mt-2 flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-medium ${tone}`}>
      <Icon size={14} stroke={1.75} className={online && stage === "syncing" ? "animate-spin" : ""} aria-hidden />
      {!online
        ? "Offline — readings will queue on this phone"
        : stage === "syncing"
        ? `Syncing ${pending} queued reading${pending === 1 ? "" : "s"}…`
        : `${pending} reading${pending === 1 ? "" : "s"} queued`}
    </div>
  );
}
