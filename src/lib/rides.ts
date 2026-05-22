import type { BatteryLog, Trip } from "./supabase";

/** A contiguous SOC drop that no logged trip covers — i.e. likely a ride
 * you haven't recorded km for yet. */
export type RideSuggestion = {
  /** Stable composite ID, used for localStorage dismissal. */
  id: string;
  startAt: string;
  endAt: string;
  startPct: number;
  endPct: number;
  /** Total percent dropped over the ride */
  drop: number;
  durationMin: number;
};

const MIN_DROP_PCT = 3;
const RIDE_GAP_HOURS = 4;

/** Group consecutive descending readings (with gaps under RIDE_GAP_HOURS)
 * into rides, then drop any whose time window already contains a trip. */
export function detectUnloggedRides(logs: BatteryLog[], trips: Trip[]): RideSuggestion[] {
  const sorted = logs.slice().sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const gapMs = RIDE_GAP_HOURS * 60 * 60 * 1000;
  const rides: RideSuggestion[] = [];
  let cur: { startLog: BatteryLog; endLog: BatteryLog } | null = null;

  const flush = () => {
    if (!cur) return;
    const drop = cur.startLog.battery_pct - cur.endLog.battery_pct;
    if (drop >= MIN_DROP_PCT) {
      const startMs = new Date(cur.startLog.logged_at).getTime();
      const endMs = new Date(cur.endLog.logged_at).getTime();
      const covered = trips.some((t) => {
        const tMs = new Date(t.trip_at).getTime();
        return tMs >= startMs && tMs <= endMs;
      });
      if (!covered) {
        rides.push({
          id: `${cur.startLog.id}__${cur.endLog.id}`,
          startAt: cur.startLog.logged_at,
          endAt: cur.endLog.logged_at,
          startPct: cur.startLog.battery_pct,
          endPct: cur.endLog.battery_pct,
          drop,
          durationMin: Math.max(1, Math.round((endMs - startMs) / 60000)),
        });
      }
    }
    cur = null;
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const log = sorted[i];
    const gap = new Date(log.logged_at).getTime() - new Date(prev.logged_at).getTime();
    const dropped = log.battery_pct < prev.battery_pct;

    if (dropped && gap < gapMs) {
      if (!cur) cur = { startLog: prev, endLog: log };
      else cur.endLog = log;
    } else {
      flush();
    }
  }
  flush();

  return rides.reverse(); // newest first
}
