import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppHeader } from '#/components/app-header'
import { LeaderboardBoard } from '#/components/leaderboard-board'
import { COMPANY_TIMEZONE } from '#/domain/seed'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
})

function formatKathmanduDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00+05:45`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: COMPANY_TIMEZONE,
  }).format(date)
}

function LeaderboardPage() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const [localDate, setLocalDate] = useState<string | null>(null)

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
    <main className="leaderboard-page app-shell mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-10 px-6 py-8 sm:px-8">
      <AppHeader user={user} />

      <div className="lb-page-header">
        <h1 className="lb-page-title">Today&apos;s leaderboard</h1>
        {localDate ? (
          <p className="lb-page-date">
            {formatKathmanduDate(localDate)}
            <span className="lb-page-timezone"> · Kathmandu</span>
          </p>
        ) : null}
      </div>

      <LeaderboardBoard
        userId={user.id}
        onLocalDate={(date) => setLocalDate(date)}
      />
    </main>
  )
}
