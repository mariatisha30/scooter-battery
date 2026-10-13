# Scooter Battery

A personal PWA to track your e-scooter battery: read it straight from a **JBD / Xiaoxiang smart BMS** over Bluetooth, log trips, predict remaining range (solo *and* with a passenger), and watch long-term battery health.

- **Stack:** Next.js 15 (App Router, React 19) · Supabase (Postgres) · Tailwind v4 · Recharts (lazy) · Web Bluetooth
- **Hosting:** Vercel (free) + Supabase (free)
- **Access:** single shared password → `/login`, year-long httpOnly cookie
- **Offline:** installable PWA, app-shell cached by a service worker, BMS readings queued in IndexedDB and flushed when you're back online

> [!IMPORTANT]
> The BMS sync uses **Web Bluetooth**, which only works on **Chrome / Edge / Opera on Android (or desktop)**. **iOS Safari and Firefox are not supported** and there is no manual battery-entry fallback in the UI — you must use a supported browser to record readings. Everything else (history, trips, health) is viewable anywhere.

---

## Prerequisites

- **Node 20+** (Next 15 needs ≥18.18; 20 LTS recommended)
- A free **Supabase** account
- A free **Vercel** account (for deploy) — optional if you only run locally
- An Android phone with Chrome for the Bluetooth features
- A JBD / Xiaoxiang-protocol BMS (the kind the *Xiaoxiang BMS* / *Smart BMS* apps talk to)

---

## Quick start

```bash
git clone https://github.com/<you>/scooter-battery.git
cd scooter-battery
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run dev                     # http://localhost:3001
```

You'll be redirected to `/login` — enter the `APP_PASSWORD` you set in `.env.local`.

---

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and **Run**.
   - It creates the `battery_logs` and `trips` tables and is **idempotent** — safe to re-run any time the schema evolves.
   - If Supabase warns about Row Level Security, that's expected: this app talks to the DB only through the server-side `service_role` key, so RLS is intentionally disabled. Choose "run anyway".
3. Open **Project Settings → API** and copy two values:
   | Supabase field | Env var |
   |---|---|
   | **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
   | **`service_role` secret** (NOT `anon`) | `SUPABASE_SERVICE_ROLE_KEY` |

   > The `service_role` key bypasses all row security. Keep it secret — it lives only in env vars and never reaches the browser.

## 2. Configure environment

Copy `.env.example` → `.env.local` and fill in:

| Variable | Required | Default | What it is |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase `service_role` secret (server-only) |
| `APP_PASSWORD` | ✅ | — | The password you type at `/login`. **Use ≥16 random chars** — there's no rate limiting and the login mechanism is in the public source. |
| `APP_TIMEZONE` | recommended | `Asia/Dhaka` | Your IANA timezone (e.g. `Europe/Berlin`, `America/New_York`). Used for server-rendered dates so timestamps match your local time. |
| `DEFAULT_KM_PER_PCT` | optional | `1.5` | Baseline range: km per 1% of battery, used until trips calibrate it. (Mine: 135 km over 10–100% = 1.5.) |
| `BATTERY_FLOOR_PCT` | optional | `10` | "Range left" is calculated down to this floor — never to 0. |
| `DEFAULT_PASSENGER_FACTOR` | optional | `0.7` | Range multiplier with a passenger until you log real passenger trips (~30% loss). |

## 3. Run locally

```bash
npm run dev      # dev server on port 3001
npm run build    # production build
npm run start    # serve the production build
```

> The service worker (offline support) only registers in **production** builds, so don't expect offline behavior under `npm run dev`.

## 4. Deploy to Vercel

1. Push the repo to GitHub (private recommended — the password gate is your only auth).
2. Go to <https://vercel.com/new> → import the repo. Framework preset auto-detects as Next.js; leave the defaults.
3. Add the same environment variables from step 2 under **Settings → Environment Variables**.
4. Deploy. Visit the URL → `/login` → enter your password.
5. On Android Chrome: open the menu → **Add to Home screen** to install it as an app. The icon and dark theme are generated automatically.

---

## Connecting your BMS

The BMS link lives in the header pill and stays connected while you move between pages:

- **First time:** tap **Connect BMS** in the header → Android shows the device chooser → pick your BMS (named something like `DB24SA08L24S80ABU`).
- **After that:** the app reconnects on its own whenever Chrome still remembers the BMS. If Chrome has forgotten it (some Android Chrome versions drop the permission when Chrome restarts), the pill turns back into **Connect BMS** — one tap. If that happens every time, enable `chrome://flags/#enable-web-bluetooth-new-permissions-backend` on the phone.
- **Auto-sync:** every 5 min when parked, every 15 s while charging (toggle on the Battery page). Readings are saved when the % moves, an alarm appears, or 5 min pass.
- **Pull-to-refresh** on the dashboard (or tap the pill) for an immediate read.
- **What each sync reads:** basic info (SOC, voltage, current, Ah, cycles, temps, alarm + balancing flags), then every cell's voltage. If the cell read misses, the reading is still saved without cells.

Requirements (same as the Xiaoxiang app): **Bluetooth on** and **Location permission granted** (Android requires Location for any BLE scan). Also **close the Xiaoxiang / maker's app first** — a JBD BMS allows only one BLE connection at a time.

### Live states

Two states, read from the BMS current:

| State | When | Look |
|---|---|---|
| Parked | anything but charging, or no live reading | Lime. Gauge shows range (whole battery, 100% → 0) with a mini battery for charge left |
| Charging | more than 0.3 A going in | Teal. The dial fills with liquid; "full in" countdown |

> [!NOTE]
> The protocol is hard-coded to the JBD / Xiaoxiang BLE service in [`src/lib/bms.ts`](src/lib/bms.ts) (`JBD_SERVICE_UUID` + notify/write characteristics). A different BMS brand (Daly, etc.) would need its own UUIDs and frame parser there.

---

## How it works

### Data model

- A **battery log** is a single SOC reading at a moment in time (plus voltage, current, cycles, max temp, every cell's voltage, BMS alarm + balancing bits, and remaining/full Ah when it comes from the BMS).
- A **trip** has start %, end %, distance, time, and a passenger flag.
- They're linked by `battery_logs.trip_id`:
  - Logging a **trip** auto-inserts a paired battery log at the end %.
  - Deleting a trip cascades to its log (DB-level `ON DELETE CASCADE`); deleting a trip-linked log deletes the trip too.

### Calibration

- **Solo km/%** = average of your last 10 *measured* solo trips.
- **Passenger km/%** = same for passenger trips; falls back to `solo × DEFAULT_PASSENGER_FACTOR` until you've logged real ones.
- **"Charge by" hint** uses total km over the last 30 days ÷ day span (needs ≥3 trips).

### Smart helpers

- **Since last charge:** the dashboard walks back through your readings to where the last charge ended and shows how much you've used since — no logging needed.
- **Ride suggestions:** on the Trips page, SOC drops that no trip covers become "log this ride — just add km" cards. They wait until you add the km or dismiss them.
- **Charge detection:** consecutive rising-SOC readings are auto-grouped into charge sessions shown on `/health`. No manual logging.
- **Cell balance (LiFePO4):** spread = highest cell minus lowest. LFP voltage is nearly flat mid-charge, so a reading near full (any cell ≥ 3.45 V) is the real test: ≤ 50 mV balanced, ≤ 120 mV slightly uneven, above that uneven. Mid-charge limits are 20 / 50 mV. The dashboard shows a banner only for a BMS alarm or uneven cells at full charge.
- **Idle dedupe:** when the scooter sits unused (current ≈ 0), readings dedupe over a 3-hour window instead of 30 min, so a parked weekend doesn't bloat the table.

---

## Pages

| Route | What |
|---|---|
| `/` | Dashboard — gauge with range + charge left (liquid dial while charging), solo / +1 toggle, history, stats list (ridden since charge, last charged, lifetime, battery status) |
| `/trips` | Log + browse trips, unlogged-ride suggestions, km/% calibration |
| `/health` (Battery tab) | Live volt / Ah / temp, cell balance (all cells, spread, the cell to watch), BMS alarms, cycles, temperatures, balance + voltage trends, charges, readings (edit/delete), BMS connection + auto-sync, log out |
| `/login` | Password gate |
| `/log/[id]/edit` · `/trips/[id]/edit` | Edit an existing battery reading or trip (entered via the pencil icon on each row) |

## Security notes

If you're deploying your own instance from this code:

- `SUPABASE_SERVICE_ROLE_KEY` bypasses all row-level security. **Keep it in Vercel/host env vars only** — never in client code, never in screenshots or issues. It must never reach the browser. The repo verifies this by isolating Supabase usage to server-only files.
- `APP_PASSWORD` is your only auth. The login mechanism is in the public source, so use a long random password (≥16 chars). There is no rate limiting on `/login`.
- The auth cookie is `httpOnly` + `secure` + `sameSite=lax`, set only over HTTPS in production. Sessions last one year by default and can be invalidated server-side by rotating `APP_PASSWORD` (every existing cookie becomes invalid instantly).
- RLS on `battery_logs` and `trips` is intentionally **disabled** — the app reaches the DB only through the server-side `service_role` key. If you ever expose the `anon` key publicly, you must also enable RLS and write policies.

## Files worth knowing

- [`src/middleware.ts`](src/middleware.ts) — password-cookie gate, redirects to `/login`
- [`src/lib/actions.ts`](src/lib/actions.ts) — all server actions (login/out, BMS log, trip CRUD)
- [`src/lib/bms.ts`](src/lib/bms.ts) — JBD/Xiaoxiang protocol: command bytes (basic info + cell voltages), frame assembler, request/response, parser, ETA helpers
- [`src/lib/cells.ts`](src/lib/cells.ts) — cell spread, LFP balance limits, BMS alarm labels
- [`src/lib/calibration.ts`](src/lib/calibration.ts) — range / km-per-% / daily-km math
- [`src/lib/charging.ts`](src/lib/charging.ts) · [`src/lib/rides.ts`](src/lib/rides.ts) — charge-session + unlogged-ride detection
- [`src/components/bms/BmsProvider.tsx`](src/components/bms/BmsProvider.tsx) — Web Bluetooth connect, auto-reconnect, polling, live state (parked / charging) that themes the app
- [`src/components/dash/`](src/components/dash) — dashboard: gauge, liquid dial, live numbers, cells card
- [`src/components/OfflineSync.tsx`](src/components/OfflineSync.tsx) · [`src/lib/queue.ts`](src/lib/queue.ts) — offline queue + drain
- [`public/sw.js`](public/sw.js) — service worker (app-shell cache)
- [`supabase/schema.sql`](supabase/schema.sql) — tables + idempotent migrations
