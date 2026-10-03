import type { Trip } from "./supabase";

export function defaultKmPerPct(): number {
  const v = Number(process.env.DEFAULT_KM_PER_PCT);
  return Number.isFinite(v) && v > 0 ? v : 135 / 90;
}

export function batteryFloor(): number {
  const v = Number(process.env.BATTERY_FLOOR_PCT);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 10;
}

export function defaultPassengerFactor(): number {
  const v = Number(process.env.DEFAULT_PASSENGER_FACTOR);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.7;
}

export type CalibrationValue = {
  value: number;
  source: "calibrated" | "default" | "estimated";
  sampleSize: number;
};

export function kmPerPctFromTrips(trips: Trip[]): CalibrationValue {
  // Only trips with REAL measured km should feed the calibration — estimated
  // ones are computed from this calibration in the first place (would cause feedback).
  const usable = trips
    .filter((t) => !t.km_estimated && t.start_pct > t.end_pct && t.distance_km > 0)
    .slice(0, 10);
  if (usable.length === 0) {
    return { value: defaultKmPerPct(), source: "default", sampleSize: 0 };
  }
  const totalKm = usable.reduce((s, t) => s + Number(t.distance_km), 0);
  const totalPct = usable.reduce((s, t) => s + (t.start_pct - t.end_pct), 0);
  if (totalPct <= 0) {
    return { value: defaultKmPerPct(), source: "default", sampleSize: 0 };
  }
  return { value: totalKm / totalPct, source: "calibrated", sampleSize: usable.length };
}

export type Calibration = {
  solo: CalibrationValue;
  passenger: CalibrationValue;
};

export function calibrationFromTrips(trips: Trip[]): Calibration {
  const soloTrips = trips.filter((t) => !t.with_passenger);
  const passengerTrips = trips.filter((t) => t.with_passenger);
  const solo = kmPerPctFromTrips(soloTrips);
  const passenger = kmPerPctFromTrips(passengerTrips);
  if (passenger.source === "default") {
    return {
      solo,
      passenger: {
        value: solo.value * defaultPassengerFactor(),
        source: "estimated",
        sampleSize: 0,
      },
    };
  }
  return { solo, passenger };
}
