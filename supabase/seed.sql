-- Seed admin + starter sentences (idempotent-ish via ON CONFLICT)

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

insert into public.sentences (text, is_active)
select s.text, true
from (
  values
    ('The quick brown fox jumps over the lazy dog near the river bank.'),
    ('Practice every day and your typing speed will steadily improve.'),
    ('Dohoro teammates compete fairly on the daily leaderboard.'),
    ('Clear sentences help everyone focus on accuracy and rhythm.'),
    ('Small consistent efforts compound into remarkable skill over time.')
) as s(text)
where not exists (
  select 1 from public.sentences existing where existing.text = s.text
);
