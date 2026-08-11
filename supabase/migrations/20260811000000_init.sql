-- Monkey Type v1 schema
-- Daily ranking day boundary is Asia/Kathmandu (enforced in app logic; local_date stored as date)

create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  duration_sec integer not null check (duration_sec in (15, 30, 60)),
  wpm numeric(8, 2) not null,
  accuracy numeric(5, 2) not null,
  created_at timestamptz not null default now()
);

create index attempts_user_id_created_at_idx on public.attempts (user_id, created_at desc);
create index attempts_duration_created_at_idx on public.attempts (duration_sec, created_at desc);

create table public.daily_bests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  duration_sec integer not null check (duration_sec in (15, 30, 60)),
  local_date date not null,
  wpm numeric(8, 2) not null,
  accuracy numeric(5, 2) not null,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, duration_sec, local_date)
);

create index daily_bests_local_date_duration_wpm_idx
  on public.daily_bests (local_date, duration_sec, wpm desc);

-- Realtime for live scoreboard (subscribe to daily_bests changes)
alter publication supabase_realtime add table public.daily_bests;
