-- Seed admin only. Typing passages come from seed_passages.sql (multi-sentence).
-- Short one-liners are intentionally not seeded as active typing content.

insert into public.users (email, username, avatar_url, is_admin)
values (
  'samir1.dohoro@gmail.com',
  'samir1',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=samir1.dohoro%40gmail.com',
  true
)
on conflict (email) do update
set
  username = excluded.username,
  avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
  is_admin = true,
  updated_at = now();

-- Deactivate rows with fewer than 3 sentence terminators (. ! ?) so one-liners
-- never enter the typing bank.
update public.sentences
set is_active = false, updated_at = now()
where is_active = true
  and (length(text) - length(translate(text, '.!?', ''))) < 3;
