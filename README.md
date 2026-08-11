# Monkey Type

Monkeytype-style typing practice app with timed runs, live WPM/accuracy, and a daily scoreboard.

Repo: [github.com/khanal-samir/Monkey-type](https://github.com/khanal-samir/Monkey-type)

## Stack

- **TanStack Start** (Vite + file routes + server functions)
- **Supabase** — Postgres + Realtime (no Supabase Auth)
- **Zustand** + localStorage — email allowlist session (admin-managed users)
- **Vitest** — domain unit tests
- **Playwright** — E2E acceptance (fixture-backed, no live Supabase required)

## Setup

```bash
pnpm install
cp .env.example .env
# For real data/Realtime: fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Database

Apply schema + seed against your Supabase project (SQL editor or CLI):

1. Run `supabase/migrations/20260811000000_init.sql`
2. Run `supabase/migrations/20260811000001_rls_anon_access.sql`
3. Run `supabase/seed.sql`
4. Run `supabase/seed_passages.sql` (or `node scripts/seed-passages-to-supabase.mjs`)

Seed admin: `samir1.dohoro@gmail.com` (`is_admin = true`, username `samir1`).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server at http://localhost:3000 |
| `pnpm test` | Vitest (domain + fixture store) |
| `pnpm test:e2e` | Playwright acceptance (starts fixtures-backed dev server) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |

First Playwright run may need browsers:

```bash
pnpm exec playwright install chromium
```

### E2E without Supabase

`pnpm test:e2e` sets `VITE_E2E_FIXTURES=1` and `VITE_E2E_SHORT_TIMER=1`. Specs cover login fail/success, a completed run → daily best on the scoreboard, and admin create-user → new login.

## Try typing

1. Apply migration + seed, fill `.env`.
2. `pnpm dev` → sign in as the seeded admin email.
3. On `/`: pick 15 / 30 / 60, type the passage; Tab then Enter restarts.
4. On finish (passage complete or timer end), WPM + accuracy save; daily best appears on Today's scoreboard.
5. Admin: **Users** / **Sentences**.

Anyone can be invited — admins add emails in **Users**. There is no company-domain email restriction.

## Env vars

| Name | Description |
|------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_E2E_FIXTURES` | `1` = in-memory backend for demos/Playwright |
| `VITE_E2E_SHORT_TIMER` | `1` = ~2.5s wall timer (production defaults unchanged) |
