-- Run this in Supabase → SQL Editor → New query.

create extension if not exists "pgcrypto";

create table if not exists battery_logs (
  id uuid primary key default gen_random_uuid(),
  battery_pct int not null check (battery_pct >= 0 and battery_pct <= 100),
  logged_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists battery_logs_logged_at_idx
  on battery_logs (logged_at desc);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  start_pct int not null check (start_pct >= 0 and start_pct <= 100),
  end_pct int not null check (end_pct >= 0 and end_pct <= 100),
  distance_km numeric(6,2) not null check (distance_km > 0),
  trip_date date not null default current_date,
  with_passenger boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  constraint start_higher check (start_pct > end_pct)
);

-- Migration: if you previously ran the schema, add the new column.
alter table trips add column if not exists with_passenger boolean not null default false;

create index if not exists trips_trip_date_idx
  on trips (trip_date desc);

-- Row Level Security: we go through the service role from the server,
-- and the middleware gate handles access. Disable RLS so server writes work.
alter table battery_logs disable row level security;
alter table trips disable row level security;
