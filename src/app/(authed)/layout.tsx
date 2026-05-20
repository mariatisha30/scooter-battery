import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { HeaderBattery } from "@/components/HeaderBattery";
import { batteryFloor } from "@/lib/calibration";
import { supabase, supabaseConfigured, type BatteryLog } from "@/lib/supabase";

async function getLatestPct(): Promise<number | null> {
  if (!supabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from("battery_logs")
    .select("battery_pct")
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Pick<BatteryLog, "battery_pct"> | null)?.battery_pct ?? null;
}

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const pct = await getLatestPct();
  const floor = batteryFloor();

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            ⚡ Scooter
          </Link>
          <HeaderBattery pct={pct} floor={floor} />
        </div>
        <nav className="flex items-center gap-4 text-sm text-neutral-400">
          <Link href="/trips" className="hover:text-neutral-100">Trips</Link>
          <LogoutButton />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
