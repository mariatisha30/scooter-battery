import type { BatteryLog } from "./supabase";

export type ChargeSession = {
  startAt: string;
  endAt: string;
  startPct: number;
  endPct: number;
  /** Total minutes from first rising sample to last */
  durationMin: number;
  /** % gained per hour (smoothed average over the session) */
  ratePctPerHour: number;
};

/** Battery_logs whose battery_pct went UP between consecutive samples are
 * grouped into charge sessions. A session ends when the SOC stops rising for
 * more than the gap threshold, or when SOC drops.
 *
 * Minimum threshold to count as a charge session: +5% gained.
 * Gap threshold (treat as end of session): 6 hours.
 */
export function detectChargeSessions(
  logs: BatteryLog[],
  options: { minGainPct?: number; gapHoursThreshold?: number } = {}
): ChargeSession[] {
  const minGain = options.minGainPct ?? 5;
  const gapMs = (options.gapHoursThreshold ?? 6) * 60 * 60 * 1000;

  // Sort ascending by time.
  const sorted = logs
    .slice()
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  const sessions: ChargeSession[] = [];
  let cur: { startAt: string; startPct: number; endAt: string; endPct: number } | null = null;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const log = sorted[i];
    const gap = new Date(log.logged_at).getTime() - new Date(prev.logged_at).getTime();
    const rose = log.battery_pct > prev.battery_pct;

    if (rose && gap <= gapMs) {
      if (!cur) {
        cur = {
          startAt: prev.logged_at,
          startPct: prev.battery_pct,
          endAt: log.logged_at,
          endPct: log.battery_pct,
        };
      } else {
        cur.endAt = log.logged_at;
        cur.endPct = log.battery_pct;
      }
    } else if (cur) {
      finalize(cur, sessions, minGain);
      cur = null;
    }
  }
  if (cur) finalize(cur, sessions, minGain);

  return sessions.reverse(); // newest first
}

function finalize(
  s: { startAt: string; startPct: number; endAt: string; endPct: number },
  out: ChargeSession[],
  minGain: number
) {
  const gain = s.endPct - s.startPct;
  if (gain < minGain) return;
  const durationMs = new Date(s.endAt).getTime() - new Date(s.startAt).getTime();
  const durationMin = Math.max(1, Math.round(durationMs / 60000));
  const ratePctPerHour = gain / (durationMin / 60);
  out.push({ ...s, durationMin, ratePctPerHour });
}

// Charge-session duration uses the shared formatDuration helper —
// re-exported from datetime.ts to keep call sites short.
export { formatDuration as formatChargeDuration } from "./datetime";
