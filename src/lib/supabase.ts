import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(
  url && serviceKey && !url.includes("example.supabase.co") && serviceKey !== "replace-me"
);

export const supabase = supabaseConfigured
  ? createClient(url!, serviceKey!, { auth: { persistSession: false } })
  : null;

export type BatteryLog = {
  id: string;
  battery_pct: number;
  logged_at: string;
  note: string | null;
  created_at: string;
};

export type Trip = {
  id: string;
  start_pct: number;
  end_pct: number;
  distance_km: number;
  trip_at: string;
  with_passenger: boolean;
  note: string | null;
  created_at: string;
};
