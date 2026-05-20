// JBD / Xiaoxiang Smart BMS protocol over BLE.
// Reverse-engineered protocol used by xiaoxiangtech, JBD, Daly clones, etc.
// References: github.com/syssi/esphome-jbd-bms, github.com/Mikeller9/JBD-BMS-Protocol

// Default service / characteristic UUIDs used by virtually every clone.
// First request shows a chooser; in subsequent sessions Chrome can re-use
// the device via navigator.bluetooth.getDevices().
export const JBD_SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb";
export const JBD_NOTIFY_CHAR_UUID = "0000ff01-0000-1000-8000-00805f9b34fb";
export const JBD_WRITE_CHAR_UUID = "0000ff02-0000-1000-8000-00805f9b34fb";

// Request: DD A5 03 00 FF FD 77 — read basic info (SOC, voltage, current, temps)
export const CMD_READ_BASIC_INFO = new Uint8Array([
  0xdd, 0xa5, 0x03, 0x00, 0xff, 0xfd, 0x77,
]);

const FRAME_START = 0xdd;
const FRAME_END = 0x77;
const CMD_BASIC_INFO_RESPONSE = 0x03;

export type BmsReading = {
  /** State of charge, 0-100% */
  soc: number;
  /** Pack voltage, V */
  voltage: number;
  /** Current, A. Positive = charging, negative = discharging. */
  current: number;
  /** Remaining capacity, Ah (estimated by BMS) */
  remainingAh: number;
  /** Nominal full capacity, Ah */
  nominalAh: number;
  /** Charge cycles */
  cycles: number;
  /** Temperatures in °C (one per NTC sensor) */
  temperatures: number[];
  /** Charge MOSFET on */
  chargingEnabled: boolean;
  /** Discharge MOSFET on */
  dischargingEnabled: boolean;
};

/**
 * Accumulates BLE notify chunks into full frames and parses them.
 * BMS responses are larger than the BLE MTU (~20 bytes), so they arrive
 * as multiple notifications that must be concatenated.
 */
export class BmsFrameAssembler {
  private buffer: number[] = [];

  push(chunk: Uint8Array): BmsReading | null {
    for (const byte of chunk) this.buffer.push(byte);

    // Discard any leading garbage until we see a start byte.
    while (this.buffer.length > 0 && this.buffer[0] !== FRAME_START) {
      this.buffer.shift();
    }

    // Need at least the 4-byte header to know the data length.
    if (this.buffer.length < 4) return null;

    // [START][CMD][STATUS][LEN] ... [CHK_HI][CHK_LO][END]
    const dataLen = this.buffer[3];
    const expectedTotal = 4 + dataLen + 3;
    if (this.buffer.length < expectedTotal) return null;

    const frame = this.buffer.slice(0, expectedTotal);
    this.buffer = this.buffer.slice(expectedTotal);

    if (frame[frame.length - 1] !== FRAME_END) return null;
    if (frame[1] !== CMD_BASIC_INFO_RESPONSE) return null;
    if (frame[2] !== 0x00) return null; // status: 0 = OK

    return parseBasicInfo(frame, dataLen);
  }

  reset() {
    this.buffer = [];
  }
}

function parseBasicInfo(frame: number[], dataLen: number): BmsReading | null {
  // Payload starts at byte 4 and is `dataLen` bytes long.
  const p = (i: number) => frame[4 + i];
  const u16 = (i: number) => (p(i) << 8) | p(i + 1);
  const s16 = (i: number) => {
    const v = u16(i);
    return v >= 0x8000 ? v - 0x10000 : v;
  };

  if (dataLen < 23) return null;

  const voltage = u16(0) / 100; // 10 mV units
  const current = s16(2) / 100; // 10 mA units, signed
  const remainingAh = u16(4) / 100; // 10 mAh
  const nominalAh = u16(6) / 100;
  const cycles = u16(8);
  // bytes 10-11: production date
  // bytes 12-15: balance status (32 bits across 4 bytes)
  // bytes 16-17: protection status
  // byte 18: software version
  const soc = p(19);
  const fetStatus = p(20);
  const chargingEnabled = (fetStatus & 0x01) !== 0;
  const dischargingEnabled = (fetStatus & 0x02) !== 0;
  // byte 21: cell count
  const ntcCount = p(22);

  const temperatures: number[] = [];
  for (let i = 0; i < ntcCount && 23 + i * 2 + 1 < dataLen; i++) {
    // 0.1 K, subtract 2731 then divide by 10 → °C
    const raw = u16(23 + i * 2);
    temperatures.push(Math.round((raw - 2731) * 10) / 100);
  }

  return {
    soc,
    voltage,
    current,
    remainingAh,
    nominalAh,
    cycles,
    temperatures,
    chargingEnabled,
    dischargingEnabled,
  };
}

/** Time-to-full or time-to-empty estimate in minutes, derived from current draw. */
export function timeEstimateMinutes(r: BmsReading): {
  state: "idle" | "charging" | "discharging";
  minutes: number | null;
} {
  const ampsAbs = Math.abs(r.current);
  if (ampsAbs < 0.05) return { state: "idle", minutes: null };

  if (r.current > 0) {
    // charging: how long to reach nominal capacity
    const needed = Math.max(0, r.nominalAh - r.remainingAh);
    return { state: "charging", minutes: Math.round((needed / ampsAbs) * 60) };
  }
  // discharging: how long to empty (down to 0%)
  return { state: "discharging", minutes: Math.round((r.remainingAh / ampsAbs) * 60) };
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
