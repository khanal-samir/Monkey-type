# Dohoro Type

Company-only Monkeytype-style typing app for Dohoro employees.

Parent PRD: [issue #1](https://github.com/khanal-samir/Dohoro-type/issues/1)  
Foundation slice: [issue #2](https://github.com/khanal-samir/Dohoro-type/issues/2)  
Identity slice: [issue #3](https://github.com/khanal-samir/Dohoro-type/issues/3)

## Stack

- **TanStack Start** (Vite + file routes + server functions)
- **Supabase** — Postgres + Realtime (no Supabase Auth)
- **Zustand** + localStorage — allowlist email session
- **Vitest** — domain unit tests
- **Playwright** — E2E smoke / acceptance

## Setup

```bash
pnpm install
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
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
| `pnpm test` | Vitest (domain) |
| `pnpm test:e2e` | Playwright (starts dev server) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |

First Playwright run may need browsers:

```bash
pnpm exec playwright install chromium
```

## Try identity

1. Apply migration + seed, fill `.env`.
2. `pnpm dev` → http://localhost:3000/login
3. Sign in as `samir1.dohoro@gmail.com` (session persists in localStorage).
4. Open **Manage users** to create allowlisted employees (optional username / avatar URL; blank avatar → DiceBear).

## Project layout

```
src/
  domain/           # Pure modules (auth, username, avatar, access) — TDD first
  lib/supabase/     # Client + Database types
  lib/users/        # Row mapping + Supabase lookups
  server/           # TanStack Start server functions (login + admin CRUD)
  session/          # Zustand + localStorage session
  routes/           # /login, /, /admin/users
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
