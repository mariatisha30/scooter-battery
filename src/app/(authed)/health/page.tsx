import { HealthEmpty, HealthView } from "@/components/HealthView";
import { supabase, supabaseConfigured, type BatteryLog } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  if (!supabaseConfigured || !supabase) {
    return <HealthEmpty title="Supabase not connected" subtitle="Connect Supabase to see battery health." />;
  }

  const { data } = await supabase
    .from("battery_logs")
    .select("*")
    .order("logged_at", { ascending: false })
    .limit(500);

  const logs = (data as BatteryLog[]) ?? [];
  if (logs.length === 0) {
    return (
      <HealthEmpty
        title="No readings yet"
        subtitle="Once your BMS has synced a few times, this page comes alive."
      />
    );
  }

  return <HealthView logs={logs} />;
}
