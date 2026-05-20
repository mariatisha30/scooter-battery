# Scooter Battery

A tiny personal app to log your e-scooter battery, see history, and predict remaining range with solo / +passenger calibration.

- **Stack:** Next.js 15 (App Router) + Supabase + Tailwind v4 + Recharts (lazy-loaded)
- **Hosting:** Vercel (free) + Supabase (free)
- **Access:** Single-password login — `/login` page, httpOnly cookie for a year
- **Range math:** baseline 1.5 km per % (135 km from 10–100%), auto-calibrates from logged trips
- **Floor:** range "left" is calculated down to 10% — never below

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

## How calibration works

- **Solo km/%** = avg of last 10 *measured* solo trips (`with_passenger=false`, `km_estimated=false`).
- **Passenger km/%** = same, for `with_passenger=true` trips. Until you log 1+ measured passenger trips it falls back to `solo × DEFAULT_PASSENGER_FACTOR` (default 0.7, ~30% range loss).
- **Daily km** for the "Charge by" hint = total km of last-30-day trips ÷ calendar-day span. Needs ≥3 trips to show.

## Files worth knowing

- [`src/middleware.ts`](src/middleware.ts) — password-cookie gate; redirects to `/login` if missing
- [`src/lib/actions.ts`](src/lib/actions.ts) — all server actions (login, logout, log battery, log trip, edit, delete)
- [`src/lib/calibration.ts`](src/lib/calibration.ts) — range / km-per-% / daily-avg math
- [`supabase/schema.sql`](supabase/schema.sql) — DB tables + idempotent migration block
- [`src/components/DashboardHero.tsx`](src/components/DashboardHero.tsx) — ring + Solo/Passenger toggle
- [`src/components/HistoryChartLazy.tsx`](src/components/HistoryChartLazy.tsx) — code-splits Recharts so the dashboard's first paint stays fast

## Ideas to add later

- Charge cycle counter (every time `%` rises significantly between logs = a charge)
- Battery health chart (max range over time as the pack ages)
- CSV export of trips + readings
- Web Push notification when current % drops below 25
