# Scooter Battery

A tiny personal app to log your e-scooter battery, see history, and predict remaining range.

- **Stack:** Next.js 15 (App Router) + Supabase + Tailwind v4 + Recharts
- **Hosting:** Vercel (free) + Supabase (free)
- **Access:** Single-password login. Set `APP_PASSWORD` env var; `/login` page validates it and sets an httpOnly cookie.
- **Range math:** Defaults to your baseline of **1.5 km per %** (135 km from 10–100%). Once you log a few trips it auto-calibrates from real data.
- **Floor:** Range "left" is calculated down to **10%** (you said you don't want to go below).

---

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), run it.
3. Open **Settings → API**. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-only)

## 2. Run locally

```bash
cp .env.example .env.local
# fill in the values
npm install
npm run dev
```

Then open <http://localhost:3001>, you'll be redirected to `/login`. Enter the value of `APP_PASSWORD` from `.env.local` — a year-long httpOnly cookie is set, and you won't need to log in again on this device until you clear cookies or hit the ⎋ button in the header.

## 3. Deploy to Vercel

1. Push this folder to a (private) GitHub repo.
2. <https://vercel.com/new> → import the repo.
3. In **Environment Variables**, paste the same four values from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_PASSWORD` (the password you'll type at `/login` — pick something memorable but ≥12 chars)
   - Optionally `DEFAULT_KM_PER_PCT` and `BATTERY_FLOOR_PCT`
4. Deploy. Visit the URL → you'll see `/login` → enter your password.
5. On Android Chrome → **Menu → Add to Home screen** to install as a PWA.

---

## How calibration works

- Every time you complete a trip, log `start %`, `end %`, and `km ridden`.
- The dashboard averages the last **10 trips** to compute your real km-per-%.
- Until you have at least one trip, it uses the default (1.5 km/%).

## Files worth knowing

- [`src/middleware.ts`](src/middleware.ts) — secret-URL gate
- [`src/lib/calibration.ts`](src/lib/calibration.ts) — range math
- [`src/lib/actions.ts`](src/lib/actions.ts) — server actions for inserts
- [`supabase/schema.sql`](supabase/schema.sql) — DB tables

## Ideas to add later

- Charge cycle counter (you can derive it: every time `%` rises significantly between logs = a charge)
- Battery health chart (max range over time)
- CSV export
- Web Push notification when you drop below 25%
