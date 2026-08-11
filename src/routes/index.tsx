import { useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { isSupabaseConfigured } from '#/lib/supabase/client'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)
  const supabaseReady = isSupabaseConfigured()

  useEffect(() => {
    if (hydrated && !user) {
      void navigate({ to: '/login' })
    }
  }, [hydrated, user, navigate])

  if (!hydrated || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center p-8">
        <p className="text-neutral-500">
          {!hydrated ? 'Loading session…' : 'Redirecting to login…'}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dohoro Type</h1>
          <p className="text-sm text-neutral-600">Identity slice — typing comes next.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearSession()
            void navigate({ to: '/login' })
          }}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Log out
        </button>
      </header>

      <section className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full bg-neutral-100"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold">{user.username}</p>
          <p className="text-sm text-neutral-600">{user.email}</p>
          {user.isAdmin ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Admin
            </p>
          ) : null}
        </div>
      </section>

      <ul className="list-inside list-disc space-y-1 text-sm text-neutral-700">
        <li>
          Supabase env:{' '}
          {supabaseReady ? 'configured' : 'missing (.env from .env.example)'}
        </li>
        {user.isAdmin ? (
          <li>
            <Link
              to="/admin/users"
              className="font-medium text-neutral-900 underline-offset-2 hover:underline"
            >
              Manage users
            </Link>
          </li>
        ) : null}
      </ul>
    </main>
  )
}
