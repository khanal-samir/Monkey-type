# Dohoro Type

Company-only Monkeytype-style typing app for Dohoro employees.

Parent PRD: [issue #1](https://github.com/khanal-samir/Dohoro-type/issues/1)  
Slices: [#2](https://github.com/khanal-samir/Dohoro-type/issues/2) · [#3](https://github.com/khanal-samir/Dohoro-type/issues/3) · [#4](https://github.com/khanal-samir/Dohoro-type/issues/4) · [#5](https://github.com/khanal-samir/Dohoro-type/issues/5) · [#6](https://github.com/khanal-samir/Dohoro-type/issues/6)

## Stack

- **TanStack Start** (Vite + file routes + server functions)
- **Supabase** — Postgres + Realtime (no Supabase Auth)
- **Zustand** + localStorage — allowlist email session
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
2. Run `supabase/seed.sql`

Seed admin: `samir1.dohoro@gmail.com` (`is_admin = true`, username `samir1`).

Local Supabase CLI (optional):

```bash
npx supabase start
npx supabase db reset   # applies migrations + seed from config.toml
```

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

`pnpm test:e2e` sets:

| Env | Effect |
|-----|--------|
| `VITE_E2E_FIXTURES=1` | In-memory users / sentences / attempts / daily bests (seeded admin + short sentence) |
| `VITE_E2E_SHORT_TIMER=1` | Wall-clock timer ≈2.5s while scored duration stays 15 / 30 / 60 |

You do **not** need a live Supabase project for acceptance. Specs cover login fail/success, a completed run → daily best on the scoreboard, and admin create-user → new login.

To manually demo fixtures:

```bash
VITE_E2E_FIXTURES=1 VITE_E2E_SHORT_TIMER=1 pnpm dev
# Sign in as samir1.dohoro@gmail.com
```

## Try typing (Supabase)

1. Apply migration + seed, fill `.env`.
2. `pnpm dev` → sign in as `samir1.dohoro@gmail.com`.
3. On `/`: pick 15 / 30 / 60, type the sentence; Tab / Escape / Restart discards incomplete runs.
4. On timer end, WPM + accuracy save; daily best appears on Today's scoreboard.
5. Admin: **Users** / **Sentences**.

## Project layout

```
src/
  domain/           # Pure modules (auth, scoring, daily-best, typing-engine, …)
  components/       # TypingArena, Scoreboard, DurationTabs
  lib/e2e/          # Fixture store + E2E env flags
  lib/supabase/     # Client + Database types
  lib/users/        # User lookups (Supabase or fixtures)
  lib/sentences/    # Sentence CRUD
  lib/rankings/     # Attempts + daily bests
  server/           # Server functions
  session/          # Zustand + localStorage session
  routes/           # /login, /, /admin/users, /admin/sentences
supabase/
  migrations/       # SQL schema
  seed.sql          # Admin + sentences
e2e/                # Playwright specs
```

## Agent workflow

Implement GitHub issues in order (#2 → #3 → #4 → #5 → #6).  
Use TDD: one failing Vitest/Playwright assertion → minimal code → next behavior.

## Env vars

| Name | Description |
|------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_E2E_FIXTURES` | `1` = in-memory backend for demos/Playwright |
| `VITE_E2E_SHORT_TIMER` | `1` = ~2.5s wall timer (production defaults unchanged) |
