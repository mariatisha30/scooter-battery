"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase, supabaseConfigured } from "./supabase";

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

  const row = {
    battery_pct: pct,
    note,
    ...(loggedAtRaw ? { logged_at: new Date(loggedAtRaw).toISOString() } : {}),
  };

  const { error } = await supabase.from("battery_logs").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/?saved=${pct}`);
}

export async function logTrip(formData: FormData) {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase not configured. Set env vars in .env.local");
  }
  const startPct = Number(formData.get("start_pct"));
  const endPct = Number(formData.get("end_pct"));
  const distance = Number(formData.get("distance_km"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const tripDate = String(formData.get("trip_date") ?? "").trim() || undefined;
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

  const { error } = await supabase.from("trips").insert({
    start_pct: startPct,
    end_pct: endPct,
    distance_km: distance,
    with_passenger: withPassenger,
    note,
    ...(tripDate ? { trip_date: tripDate } : {}),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/trips");
  revalidatePath("/");
  redirect(`/trips?saved=${distance}`);
}

export async function deleteBatteryLog(id: string) {
  if (!supabase) return;
  await supabase.from("battery_logs").delete().eq("id", id);
  revalidatePath("/");
}

export async function deleteTrip(id: string) {
  if (!supabase) return;
  await supabase.from("trips").delete().eq("id", id);
  revalidatePath("/trips");
  revalidatePath("/");
}
