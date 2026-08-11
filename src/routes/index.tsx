import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppHeader } from '#/components/app-header'
import { DurationTabs } from '#/components/duration-tabs'
import { TypingArena } from '#/components/typing-arena'
import type { DurationSec } from '#/domain/typing-engine'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const [duration, setDuration] = useState<DurationSec>(30)

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
      <AppHeader user={user} />

      <div className="flex justify-center">
        <DurationTabs value={duration} onChange={setDuration} />
      </div>

      <TypingArena userId={user.id} duration={duration} />

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
