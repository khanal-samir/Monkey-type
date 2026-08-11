-- Disable RLS on all app tables (internal toy app; anon key must read/write).
-- Safe to re-run.

alter table public.users disable row level security;
alter table public.sentences disable row level security;
alter table public.attempts disable row level security;
alter table public.daily_bests disable row level security;
