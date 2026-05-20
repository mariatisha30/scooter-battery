# Scooter Battery

A tiny personal app to log your e-scooter battery, see history, and predict remaining range with solo / +passenger calibration.

- **Stack:** Next.js 15 (App Router) + Supabase + Tailwind v4 + Recharts (lazy-loaded) + Web Bluetooth
- **Hosting:** Vercel (free) + Supabase (free)
- **Access:** Single-password login — `/login` page, httpOnly cookie for a year
- **Battery source:** JBD / Xiaoxiang BMS over BLE. The dashboard has a sync card that pairs once, auto-polls every 5 min, and supports pull-to-refresh.
- **Range math:** baseline 1.5 km per % (135 km from 10–100%), auto-calibrates from logged trips
- **Floor:** range "left" is calculated down to 10% — never below

> ⚠️ The BMS sync uses **Web Bluetooth**, which works only on **Android Chrome / Edge / Opera**. iOS Safari and Firefox are not supported — there's no manual log fallback in the UI, so you must use a supported browser.

---

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), run it. (Idempotent — safe to re-run when the schema evolves.)
3. Open **Project Settings → API**. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key (NOT `anon`) → `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to the client

## 2. Run locally

```bash
cp .env.example .env.local
# fill in the values
npm install
npm run dev
```

Open <http://localhost:3001> → redirected to `/login` → type your `APP_PASSWORD`. A year-long httpOnly cookie is set. Tap the `⎋` icon in the header to sign out.

## 3. Deploy to Vercel

1. Push the repo to GitHub (private recommended).
2. <https://vercel.com/new> → import the repo.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_PASSWORD` — the password you'll type at `/login`. Pick ≥12 chars.
   - Optional: `DEFAULT_KM_PER_PCT` (1.5), `BATTERY_FLOOR_PCT` (10), `DEFAULT_PASSENGER_FACTOR` (0.7)
4. Deploy. Visit the URL → `/login` → enter your password.
5. Android Chrome → **Menu → Add to Home screen** for a PWA shortcut.

---

## How the data model links

- A **battery log** is a single reading at a point in time.
- A **trip** has start %, end %, distance, time, and a passenger flag.
- The two are connected by `battery_logs.trip_id`:
  - Logging a **trip** auto-inserts a paired battery log at the end %.
  - Logging a **battery reading** that's lower than the previous one auto-inserts an **estimated** trip (`km_estimated=true`, distance computed from current calibration). Editing it later — entering the real km — promotes it to measured.
  - Deleting a trip cascades to its log (DB-level FK with `ON DELETE CASCADE`).
  - Deleting a log that has a trip_id deletes the trip first, which cascades back.

## BMS sync (Web Bluetooth)

The dashboard's "JBD BMS" card connects to your smart BMS over BLE.

- **First time:** tap *Connect* → Android shows the BT device chooser → pick `DB24SA08L24S80ABU` (or whatever your BMS is named).
- **Subsequent visits:** Chrome remembers the device — the card auto-reconnects silently.
- **Auto-sync:** every 5 min while the page is open. Toggle off in the card if you want manual only.
- **Pull-to-refresh:** swipe down from the top of the dashboard to trigger an immediate sync.
- **Dupe protection:** the server skips inserting a new battery_log if the SOC is unchanged from the last reading (within 30 min). No noise from idle readings.
- **No auto-trips from BMS:** unlike manual battery logs, BMS-sourced drops do not create estimated trips (polling every 5 min would spam tiny trips). Real trip km still need to be entered on `/trips`.

Required: Bluetooth on, Location permission granted (Android requirement for BLE scan). Both already on if your existing Xiaoxiang app works.

Schema columns used: `voltage_v`, `current_a` on `battery_logs`. The migration block in `schema.sql` adds them idempotently.

## How calibration works

- **Solo km/%** = avg of last 10 *measured* solo trips (`with_passenger=false`, `km_estimated=false`).
- **Passenger km/%** = same, for `with_passenger=true` trips. Until you log 1+ measured passenger trips it falls back to `solo × DEFAULT_PASSENGER_FACTOR` (default 0.7, ~30% range loss).
- **Daily km** for the "Charge by" hint = total km of last-30-day trips ÷ calendar-day span. Needs ≥3 trips to show.

## Files worth knowing

- [`src/middleware.ts`](src/middleware.ts) — password-cookie gate; redirects to `/login` if missing
- [`src/lib/actions.ts`](src/lib/actions.ts) — all server actions (login, logout, BMS log, trip log, edit, delete)
- [`src/lib/calibration.ts`](src/lib/calibration.ts) — range / km-per-% / daily-avg math
- [`src/lib/bms.ts`](src/lib/bms.ts) — JBD / Xiaoxiang protocol: command bytes, frame assembler, basic-info parser, charging-ETA helpers
- [`src/components/BmsCard.tsx`](src/components/BmsCard.tsx) — Web Bluetooth integration, auto-sync, live readings UI
- [`src/components/PullToRefresh.tsx`](src/components/PullToRefresh.tsx) — touch-driven swipe-down gesture for manual sync
- [`supabase/schema.sql`](supabase/schema.sql) — DB tables + idempotent migration block
- [`src/components/DashboardHero.tsx`](src/components/DashboardHero.tsx) — ring + Solo/Passenger toggle
- [`src/components/HistoryChartLazy.tsx`](src/components/HistoryChartLazy.tsx) — code-splits Recharts so the dashboard's first paint stays fast

## Ideas to add later

- Charge cycle counter (every time `%` rises significantly between logs = a charge)
- Battery health chart (max range over time as the pack ages)
- CSV export of trips + readings
- Web Push notification when current % drops below 25
