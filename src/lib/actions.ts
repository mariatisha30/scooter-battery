"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { calibrationFromTrips } from "./calibration";
import { supabase, supabaseConfigured, type Trip } from "./supabase";

const AUTH_COOKIE = "scooter_unlock";

export async function login(formData: FormData) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error("APP_PASSWORD is not configured on the server");
  }
  const provided = String(formData.get("password") ?? "");
  if (provided !== expected) {
    redirect("/login?error=1");
  }
  const next = String(formData.get("next") ?? "/") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const store = await cookies();
  store.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeNext);
}

export async function logout() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  redirect("/login");
}

export async function logBattery(formData: FormData) {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase not configured. Set env vars in .env.local");
  }
  const pct = Number(formData.get("battery_pct"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const loggedAtRaw = String(formData.get("logged_at") ?? "").trim();

  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw new Error("Battery percentage must be 0–100");
  }

  const loggedAtIso = loggedAtRaw ? new Date(loggedAtRaw).toISOString() : new Date().toISOString();

  // Look up the immediately preceding reading. If the new pct is lower, the user
  // rode the scooter between then and now — create an *estimated* trip so the
  // history reflects the ride. Estimated trips do NOT feed calibration.
  const { data: prev } = await supabase
    .from("battery_logs")
    .select("battery_pct, logged_at")
    .lt("logged_at", loggedAtIso)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let createdTripId: string | null = null;
  if (prev && prev.battery_pct > pct) {
    // Use the running calibration to estimate distance.
    const { data: realTrips } = await supabase
      .from("trips")
      .select("*")
      .eq("km_estimated", false)
      .order("trip_at", { ascending: false })
      .limit(20);
    const cal = calibrationFromTrips((realTrips as Trip[]) ?? []);
    const drop = prev.battery_pct - pct;
    const distance = Number((drop * cal.solo.value).toFixed(2));

    const { data: tripRow, error: tripError } = await supabase
      .from("trips")
      .insert({
        start_pct: prev.battery_pct,
        end_pct: pct,
        distance_km: distance,
        trip_at: loggedAtIso,
        with_passenger: false,
        km_estimated: true,
        note: note ?? null,
      })
      .select("id")
      .single();
    if (tripError) throw new Error(tripError.message);
    createdTripId = tripRow?.id ?? null;
  }

  const { error } = await supabase.from("battery_logs").insert({
    battery_pct: pct,
    logged_at: loggedAtIso,
    note,
    trip_id: createdTripId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/trips");
  redirect("/");
}

export async function logTrip(formData: FormData) {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase not configured. Set env vars in .env.local");
  }
  const startPct = Number(formData.get("start_pct"));
  const endPct = Number(formData.get("end_pct"));
  const distance = Number(formData.get("distance_km"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const tripAtRaw = String(formData.get("trip_at") ?? "").trim();
  const withPassenger = formData.get("with_passenger") === "true";

  if (!Number.isInteger(startPct) || startPct <= 0 || startPct > 100) {
    throw new Error("Start % must be 1–100");
  }
  if (!Number.isInteger(endPct) || endPct < 0 || endPct >= startPct) {
    throw new Error("End % must be lower than start %");
  }
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error("Distance must be greater than 0 km");
  }

  const tripAtIso = tripAtRaw ? new Date(tripAtRaw).toISOString() : new Date().toISOString();

  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .insert({
      start_pct: startPct,
      end_pct: endPct,
      distance_km: distance,
      with_passenger: withPassenger,
      note,
      trip_at: tripAtIso,
    })
    .select("id")
    .single();
  if (tripError || !tripRow) throw new Error(tripError?.message ?? "Failed to save trip");

  // Also insert a battery log at trip end, linked to the trip so deletes cascade.
  const logNoteParts = [`After ${distance} km`];
  if (withPassenger) logNoteParts.push("+1");
  if (note) logNoteParts.push(note);
  const { error: logError } = await supabase.from("battery_logs").insert({
    battery_pct: endPct,
    logged_at: tripAtIso,
    trip_id: tripRow.id,
    note: logNoteParts.join(" · "),
  });
  if (logError) throw new Error(logError.message);

  revalidatePath("/trips");
  revalidatePath("/");
  redirect("/trips");
}

/**
 * Insert a battery_log sourced from the JBD BMS over BLE.
 *
 * - Skips when the latest existing reading has the same SOC AND was logged
 *   within the last 30 minutes (no point spamming identical rows when the
 *   scooter sits idle).
 * - Does NOT auto-create an estimated trip on a drop — at 5-minute polling
 *   that would generate dozens of micro-trips per ride. Real trip km still
 *   come from manual trip entries.
 */
export async function logBatteryFromBms(
  pct: number,
  voltage: number | null,
  current: number | null
): Promise<{ saved: boolean; reason?: string }> {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw new Error("Battery percentage must be 0–100");
  }

  const { data: latest } = await supabase
    .from("battery_logs")
    .select("battery_pct, logged_at")
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const ageMs = Date.now() - new Date(latest.logged_at).getTime();
    const thirtyMin = 30 * 60 * 1000;
    if (latest.battery_pct === pct && ageMs < thirtyMin) {
      return { saved: false, reason: "unchanged" };
    }
  }

  const { error } = await supabase.from("battery_logs").insert({
    battery_pct: pct,
    voltage_v: voltage,
    current_a: current,
    logged_at: new Date().toISOString(),
    note: "BMS",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  return { saved: true };
}

export async function updateBatteryLog(id: string, formData: FormData) {
  if (!supabase) throw new Error("Supabase not configured");
  const pct = Number(formData.get("battery_pct"));
  const loggedAtRaw = String(formData.get("logged_at") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw new Error("Battery percentage must be 0–100");
  }
  const loggedAtIso = loggedAtRaw ? new Date(loggedAtRaw).toISOString() : new Date().toISOString();

  const { error } = await supabase
    .from("battery_logs")
    .update({ battery_pct: pct, logged_at: loggedAtIso, note })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/trips");
  redirect("/");
}

export async function updateTrip(id: string, formData: FormData) {
  if (!supabase) throw new Error("Supabase not configured");
  const startPct = Number(formData.get("start_pct"));
  const endPct = Number(formData.get("end_pct"));
  const distance = Number(formData.get("distance_km"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const tripAtRaw = String(formData.get("trip_at") ?? "").trim();
  const withPassenger = formData.get("with_passenger") === "true";

  if (!Number.isInteger(startPct) || startPct <= 0 || startPct > 100) {
    throw new Error("Start % must be 1–100");
  }
  if (!Number.isInteger(endPct) || endPct < 0 || endPct >= startPct) {
    throw new Error("End % must be lower than start %");
  }
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error("Distance must be greater than 0 km");
  }
  const tripAtIso = tripAtRaw ? new Date(tripAtRaw).toISOString() : new Date().toISOString();

  const { error: tripError } = await supabase
    .from("trips")
    .update({
      start_pct: startPct,
      end_pct: endPct,
      distance_km: distance,
      trip_at: tripAtIso,
      with_passenger: withPassenger,
      // If the user is editing an estimated trip and providing real values,
      // promote it to a measured trip so it can feed calibration.
      km_estimated: false,
      note,
    })
    .eq("id", id);
  if (tripError) throw new Error(tripError.message);

  // Sync the paired battery log if one exists.
  const logNoteParts = [`After ${distance} km`];
  if (withPassenger) logNoteParts.push("+1");
  if (note) logNoteParts.push(note);
  await supabase
    .from("battery_logs")
    .update({
      battery_pct: endPct,
      logged_at: tripAtIso,
      note: logNoteParts.join(" · "),
    })
    .eq("trip_id", id);

  revalidatePath("/trips");
  revalidatePath("/");
  redirect("/trips");
}

export async function deleteBatteryLog(id: string) {
  if (!supabase) return;
  // If this log was created by a trip, deleting the trip will cascade-delete the log.
  // Otherwise just delete the log row directly.
  const { data: log } = await supabase
    .from("battery_logs")
    .select("trip_id")
    .eq("id", id)
    .maybeSingle();
  if (log?.trip_id) {
    await supabase.from("trips").delete().eq("id", log.trip_id);
  } else {
    await supabase.from("battery_logs").delete().eq("id", id);
  }
  revalidatePath("/");
  revalidatePath("/trips");
}

export async function deleteTrip(id: string) {
  if (!supabase) return;
  // The FK from battery_logs.trip_id is ON DELETE CASCADE,
  // so deleting the trip auto-removes the linked battery log.
  await supabase.from("trips").delete().eq("id", id);
  revalidatePath("/trips");
  revalidatePath("/");
}
