import Link from "next/link";
import { HealthVoltageChart } from "@/components/HealthVoltageChart";
import { detectChargeSessions, formatChargeDuration } from "@/lib/charging";
import { formatLocalDateTime } from "@/lib/datetime";
import { supabase, supabaseConfigured, type BatteryLog } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Lithium iron phosphate (LFP / LiFePO4) packs — used in most e-scooter BMSes
// like JBD — are typically rated for ~2000–3000 full cycles to 80% capacity.
// 2500 is a defensible midpoint.
const EXPECTED_CYCLES = 2500;

export default async function HealthPage() {
  if (!supabaseConfigured || !supabase) {
    return <Empty title="Supabase not connected" subtitle="Connect Supabase to see battery health." />;
  }

  const { data } = await supabase
    .from("battery_logs")
    .select("*")
    .order("logged_at", { ascending: false })
    .limit(500);

  const logs = (data as BatteryLog[]) ?? [];
  const withVoltage = logs.filter((l) => l.voltage_v != null);
  const withCycles = logs.filter((l) => l.cycles != null);
  const withTemp = logs.filter((l) => l.max_temp_c != null);

  const latestCycles = withCycles[0]?.cycles ?? null;
  const earliestCycles = withCycles[withCycles.length - 1]?.cycles ?? null;
  const cyclesSinceFirstReading =
    latestCycles != null && earliestCycles != null ? latestCycles - earliestCycles : null;

  const healthPct =
    latestCycles != null ? Math.max(0, 100 - (latestCycles / EXPECTED_CYCLES) * 20) : null;

  const maxTempEver = withTemp.length ? Math.max(...withTemp.map((l) => l.max_temp_c as number)) : null;
  const avgTemp = withTemp.length
    ? withTemp.reduce((s, l) => s + (l.max_temp_c as number), 0) / withTemp.length
    : null;

  // Pack voltage trend: one point per reading, oldest → newest
  const voltagePoints = withVoltage
    .slice()
    .reverse()
    .map((l) => ({ t: new Date(l.logged_at).getTime(), v: Number(l.voltage_v) }));

  const charges = detectChargeSessions(logs);

  if (logs.length === 0) {
    return (
      <Empty
        title="No readings yet"
        subtitle="Once your BMS has synced a few times, this page comes alive."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">← Back</Link>
        <h1 className="mt-2 text-2xl font-semibold">Battery health</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Long-term signals from your BMS — watch the trend over weeks, not minutes.
        </p>
      </div>

      {/* Headline cards */}
      <section className="grid grid-cols-2 gap-3">
        <Card>
          <Stat label="Cycles">
            <span className="text-2xl font-semibold tabular-nums text-emerald-300">
              {latestCycles ?? "—"}
            </span>
            {EXPECTED_CYCLES > 0 && latestCycles != null && (
              <span className="ml-1 text-xs text-neutral-500">/ ~{EXPECTED_CYCLES}</span>
            )}
          </Stat>
          {cyclesSinceFirstReading != null && cyclesSinceFirstReading > 0 && (
            <Sub>+{cyclesSinceFirstReading} since you started tracking</Sub>
          )}
        </Card>

        <Card>
          <Stat label="Health estimate">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                healthPct == null
                  ? "text-neutral-500"
                  : healthPct > 95
                  ? "text-emerald-300"
                  : healthPct > 85
                  ? "text-amber-300"
                  : "text-red-300"
              }`}
            >
              {healthPct == null ? "—" : `${healthPct.toFixed(1)}%`}
            </span>
          </Stat>
          <Sub>
            {latestCycles != null
              ? `Rough estimate: 20% capacity loss at ${EXPECTED_CYCLES} cycles`
              : "Sync to see"}
          </Sub>
        </Card>

        <Card>
          <Stat label="Hottest ever">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                maxTempEver == null
                  ? "text-neutral-500"
                  : maxTempEver > 55
                  ? "text-red-300"
                  : maxTempEver > 45
                  ? "text-amber-300"
                  : "text-emerald-300"
              }`}
            >
              {maxTempEver != null ? `${maxTempEver.toFixed(1)}°` : "—"}
            </span>
          </Stat>
          {avgTemp != null && <Sub>avg {avgTemp.toFixed(1)}° across {withTemp.length} reads</Sub>}
        </Card>

        <Card>
          <Stat label="Total charges">
            <span className="text-2xl font-semibold tabular-nums text-sky-300">
              {charges.length}
            </span>
          </Stat>
          <Sub>detected from history</Sub>
        </Card>
      </section>

      {/* Voltage trend */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Pack voltage over time
        </h2>
        <HealthVoltageChart points={voltagePoints} />
        <p className="text-[11px] text-neutral-500">
          Healthy LFP packs hold ~84 V at 100% and ~64 V at 0%. A gradual drop in the high-end is
          the earliest signal of capacity loss.
        </p>
      </section>

      {/* Charge sessions */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Recent charges
        </h2>
        {charges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
            No charge sessions detected yet. A charge is auto-recorded when SOC rises ≥5% across
            consecutive readings.
          </div>
        ) : (
          <ul className="space-y-2">
            {charges.slice(0, 8).map((c, i) => {
              const gained = c.endPct - c.startPct;
              return (
                <li
                  key={`${c.startAt}-${i}`}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-medium tabular-nums">
                        {c.startPct}% → {c.endPct}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300">
                        +{gained}%
                      </span>
                    </div>
                    <div className="text-xs tabular-nums text-neutral-300">
                      {formatChargeDuration(c.durationMin)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>
                      {formatLocalDateTime(c.endAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="tabular-nums">
                      {c.ratePctPerHour.toFixed(1)} %/h
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-3 py-2.5">
      {children}
    </div>
  );
}
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-0.5">{children}</div>
    </>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-[10px] text-neutral-500">{children}</div>;
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100">← Back</Link>
        <h1 className="mt-2 text-2xl font-semibold">Battery health</h1>
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-12 text-center">
        <div className="text-base font-medium text-neutral-100">{title}</div>
        <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>
      </div>
    </div>
  );
}
