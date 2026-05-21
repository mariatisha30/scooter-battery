"use client";

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
          await logBatteryFromBms(item.soc, item.voltage, item.current, item.loggedAtIso);
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

  const tone =
    !online
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : stage === "syncing"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
      : "border-neutral-700 bg-neutral-900 text-neutral-300";

  return (
    <div
      role="status"
      className={`flex items-center justify-between rounded-full border px-3 py-1.5 text-[11px] font-medium ${tone}`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            online ? "bg-sky-400 animate-pulse" : "bg-amber-400"
          }`}
        />
        {!online
          ? "Offline — readings will queue locally"
          : stage === "syncing"
          ? `Syncing ${pending} queued reading${pending === 1 ? "" : "s"}…`
          : `${pending} reading${pending === 1 ? "" : "s"} queued`}
      </span>
    </div>
  );
}
