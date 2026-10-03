import Link from "next/link";
import { IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";
import { balanceLevel, balanceZone, cellStats, protectionLabels } from "@/lib/cells";
import type { BatteryLog } from "@/lib/supabase";

/** Dashboard banner, shown only when the pack needs attention. `logs` are newest first. */
export function HealthAlert({ logs }: { logs: BatteryLog[] }) {
  const alarms = protectionLabels(logs.find((l) => l.protection != null)?.protection);
  let message: string | null = null;
  if (alarms.length > 0) {
    message = `BMS alarm: ${alarms.join(" · ")}`;
  } else {
    const lastFull = logs
      .map((l) => cellStats(l.cell_mv))
      .find((s) => s !== null && balanceZone(s) === "top");
    if (lastFull && balanceLevel(lastFull) === "uneven") {
      message = `Cells uneven at full charge: ${lastFull.delta} mV spread`;
    }
  }
  if (!message) return null;

  return (
    <Link
      href="/health"
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs ${
        alarms.length > 0 ? "bg-red/12 text-red" : "bg-amber/12 text-amber"
      }`}
    >
      <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      <IconChevronRight size={14} stroke={1.75} className="shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}
