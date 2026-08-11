import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '#/lib/supabase/client'
import { SEED_ADMIN_EMAIL } from '#/domain/seed'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const supabaseReady = isSupabaseConfigured()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Dohoro Type</h1>
      <p className="text-lg text-neutral-600">
        Internal Monkeytype-style typing arena for Dohoro. Foundation slice is
        ready — login, typing, and leaderboard land in later issues.
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-neutral-700">
        <li>Seed admin: {SEED_ADMIN_EMAIL}</li>
        <li>
          Supabase env:{' '}
          {supabaseReady ? 'configured' : 'missing (.env from .env.example)'}
        </li>
      </ul>
    </main>
  )
}
