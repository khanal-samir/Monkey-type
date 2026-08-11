import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { DurationTabs } from '#/components/duration-tabs'
import { Scoreboard } from '#/components/scoreboard'
import { TypingArena } from '#/components/typing-arena'
import type { DurationSec } from '#/domain/typing-engine'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)
  const [duration, setDuration] = useState<DurationSec>(30)
  const [boardRefresh, setBoardRefresh] = useState(0)

  useEffect(() => {
    if (hydrated && !user) {
      void navigate({ to: '/login' })
    }
  }, [hydrated, user, navigate])

  if (!hydrated || !user) {
    return (
      <main className="app-shell mx-auto flex min-h-screen max-w-[1100px] items-center justify-center p-8">
        <p className="typing-muted">
          {!hydrated ? 'Loading session…' : 'Redirecting to login…'}
        </p>
      </main>
    )
  }

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-10 px-6 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="brand-mark text-2xl font-semibold tracking-tight">
            Monkey Type
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full bg-[var(--surface)]"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--fg)]">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-[var(--fg)]">{user.username}</span>
          </div>

          {user.isAdmin ? (
            <div className="flex gap-3 text-sm text-[var(--muted)]">
              <Link
                to="/admin/users"
                className="underline-offset-2 hover:text-[var(--fg)] hover:underline"
              >
                Users
              </Link>
              <Link
                to="/admin/sentences"
                className="underline-offset-2 hover:text-[var(--fg)] hover:underline"
              >
                Sentences
              </Link>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              clearSession()
              void navigate({ to: '/login' })
            }}
            className="admin-ghost rounded border px-3 py-1.5 text-sm"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex justify-center">
        <DurationTabs value={duration} onChange={setDuration} />
      </div>

      <TypingArena
        userId={user.id}
        duration={duration}
        onAttemptSaved={({ dailyBestUpdated }) => {
          if (dailyBestUpdated) {
            setBoardRefresh((n) => n + 1)
          }
        }}
      />

      <div className="flex justify-center border-t border-[var(--border)] pt-8">
        <Scoreboard
          userId={user.id}
          durationSec={duration}
          refreshToken={boardRefresh}
        />
      </div>

      <footer className="mt-auto border-t border-[var(--border)] pt-6 pb-2 text-center">
        <p className="typing-hint text-sm">
          Open for more features on GitHub
        </p>
        <a
          href="https://github.com/khanal-samir/Monkey-type"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          github.com/khanal-samir/Monkey-type
        </a>
      </footer>
    </main>
  )
}
