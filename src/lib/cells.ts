// Cell-level analysis for the LiFePO4 pack, from JBD cell voltages (mV).

export type CellStats = {
  count: number;
  /** mV */
  min: number;
  max: number;
  avg: number;
  delta: number;
  /** 1-based cell numbers */
  minCell: number;
  maxCell: number;
};

export function cellStats(cellsMv: number[] | null | undefined): CellStats | null {
  if (!cellsMv || cellsMv.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let minCell = 1;
  let maxCell = 1;
  cellsMv.forEach((mv, i) => {
    sum += mv;
    if (mv < min) {
      min = mv;
      minCell = i + 1;
    }
    if (mv > max) {
      max = mv;
      maxCell = i + 1;
    }
  });
  return { count: cellsMv.length, min, max, avg: sum / cellsMv.length, delta: max - min, minCell, maxCell };
}

// LFP voltage is nearly flat between ~3.25 and ~3.35 V, so cells look alike
// there even when their charge differs. Differences only show near full (the
// charging knee) or near empty — so the limits are looser there, and a reading
// right after a full charge is the most telling one.
const TOP_ZONE_MV = 3450;
const BOTTOM_ZONE_MV = 3100;

export type BalanceZone = "top" | "mid" | "bottom";
export type BalanceLevel = "good" | "watch" | "uneven";

const LIMITS: Record<BalanceZone, { good: number; watch: number }> = {
  top: { good: 50, watch: 120 },
  bottom: { good: 50, watch: 120 },
  // Mid-charge spread under charge current runs ~15 mV on a healthy pack
  // (this one: 15 mV at 61%, 7 A), and real imbalance hides there anyway.
  mid: { good: 20, watch: 50 },
};

export function balanceZone(s: CellStats): BalanceZone {
  if (s.max >= TOP_ZONE_MV) return "top";
  if (s.min <= BOTTOM_ZONE_MV) return "bottom";
  return "mid";
}

export function balanceLevel(s: CellStats): BalanceLevel {
  const { good, watch } = LIMITS[balanceZone(s)];
  if (s.delta <= good) return "good";
  if (s.delta <= watch) return "watch";
  return "uneven";
}

export const BALANCE_LABEL: Record<BalanceLevel, string> = {
  good: "Balanced",
  watch: "Slightly uneven",
  uneven: "Uneven",
};

export const BALANCE_TEXT_CLASS: Record<BalanceLevel, string> = {
  good: "text-emerald-300",
  watch: "text-amber-300",
  uneven: "text-red-300",
};

export const ZONE_LABEL: Record<BalanceZone, string> = {
  top: "near full",
  mid: "mid charge",
  bottom: "near empty",
};

export function isBalancing(mask: number | null | undefined, cellIndex: number): boolean {
  if (!mask) return false;
  return ((mask >>> cellIndex) & 1) === 1;
}

export function formatCellVolts(mv: number): string {
  return (mv / 1000).toFixed(3);
}

// JBD protection status word, bit 0 first.
const PROTECTION_BITS = [
  "Cell over-voltage",
  "Cell under-voltage",
  "Pack over-voltage",
  "Pack under-voltage",
  "Too hot to charge",
  "Too cold to charge",
  "Too hot to discharge",
  "Too cold to discharge",
  "Charge over-current",
  "Discharge over-current",
  "Short circuit",
  "BMS chip fault",
  "Switches locked by BMS",
];

export function protectionLabels(mask: number | null | undefined): string[] {
  if (!mask) return [];
  const labels: string[] = [];
  for (let bit = 0; bit < 16; bit++) {
    if ((mask >> bit) & 1) labels.push(PROTECTION_BITS[bit] ?? `Alarm bit ${bit}`);
  }
  return labels;
}
