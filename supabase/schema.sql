-- Run this in Supabase → SQL Editor → New query.

create extension if not exists "pgcrypto";

create table if not exists battery_logs (
  id uuid primary key default gen_random_uuid(),
  battery_pct int not null check (battery_pct >= 0 and battery_pct <= 100),
  logged_at timestamptz not null default now(),
  trip_id uuid references trips(id) on delete cascade,
  voltage_v numeric(6,2),
  current_a numeric(6,2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists battery_logs_logged_at_idx
  on battery_logs (logged_at desc);

create index if not exists battery_logs_trip_id_idx
  on battery_logs (trip_id);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  start_pct int not null check (start_pct >= 0 and start_pct <= 100),
  end_pct int not null check (end_pct >= 0 and end_pct <= 100),
  distance_km numeric(6,2) not null check (distance_km > 0),
  trip_at timestamptz not null default now(),
  with_passenger boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  constraint start_higher check (start_pct > end_pct)
);

-- Migration: idempotent — safe to re-run when upgrading from an earlier schema.
alter table trips add column if not exists with_passenger boolean not null default false;
alter table trips add column if not exists trip_at timestamptz;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'trip_date'
  ) then
    execute 'update trips set trip_at = (trip_date::timestamptz + interval ''12 hours'') where trip_at is null';
  end if;
end $$;
update trips set trip_at = now() where trip_at is null;
alter table trips alter column trip_at set not null;
alter table trips alter column trip_at set default now();
alter table trips drop column if exists trip_date;
alter table battery_logs add column if not exists trip_id uuid references trips(id) on delete cascade;
alter table battery_logs add column if not exists voltage_v numeric(6,2);
alter table battery_logs add column if not exists current_a numeric(6,2);
alter table trips add column if not exists km_estimated boolean not null default false;

create index if not exists trips_trip_at_idx
  on trips (trip_at desc);

-- Drop the old date-based index if it exists.
drop index if exists trips_trip_date_idx;

-- Row Level Security: we go through the service role from the server,
-- and the middleware gate handles access. Disable RLS so server writes work.
alter table battery_logs disable row level security;
alter table trips disable row level security;
