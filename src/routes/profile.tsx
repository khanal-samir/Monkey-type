import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AppHeader } from '#/components/app-header'
import { UserAvatar } from '#/components/user-avatar'
import { COMPANY_TIMEZONE } from '#/domain/seed'
import {
  findUserDailyStanding,
  type UserDailyStanding,
} from '#/domain/leaderboard'
import {
  TYPING_DURATIONS,
  type DurationSec,
} from '#/domain/typing-engine'
import { getTodaysScoreboard } from '#/server/rankings'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

type StandingsByDuration = Record<DurationSec, UserDailyStanding | null>

const EMPTY_STANDINGS: StandingsByDuration = { 15: null, 30: null, 60: null }

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

function formatRank(value: number | null | undefined): string {
  return value == null ? '—' : `#${value}`
}

function formatWpm(value: number | null | undefined): string {
  return value == null ? '—' : String(Math.round(value))
}

function formatAccuracy(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value)}%`
}

function StandingRow({
  durationSec,
  standing,
}: {
  durationSec: DurationSec
  standing: UserDailyStanding | null
}) {
  const hasStanding = standing != null

  return (
    <div className="profile-standing-row">
      <div className="profile-standing-mode">
        <span className="profile-standing-duration">{durationSec}</span>
        <span className="profile-standing-unit">sec</span>
      </div>

      <dl className="profile-standing-stats">
        <div className="profile-stat">
          <dt className="profile-stat-label">Rank</dt>
          <dd
            className={`profile-stat-value${hasStanding ? ' profile-stat-value-accent' : ''}`}
          >
            {formatRank(standing?.rank)}
          </dd>
        </div>
        <div className="profile-stat">
          <dt className="profile-stat-label">Best WPM</dt>
          <dd
            className={`profile-stat-value${hasStanding ? ' profile-stat-value-accent' : ''}`}
          >
            {formatWpm(standing?.wpm)}
          </dd>
        </div>
        <div className="profile-stat">
          <dt className="profile-stat-label">Accuracy</dt>
          <dd className="profile-stat-value">{formatAccuracy(standing?.accuracy)}</dd>
        </div>
      </dl>
    </div>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const loadScoreboard = useServerFn(getTodaysScoreboard)
  const [standings, setStandings] = useState<StandingsByDuration>(EMPTY_STANDINGS)
  const [localDate, setLocalDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hydrated && !user) {
      void navigate({ to: '/login' })
    }
  }, [hydrated, user, navigate])

  const refresh = useCallback(async () => {
    if (!user) return

    try {
      setError(null)
      const results = await Promise.all(
        TYPING_DURATIONS.map((durationSec) =>
          loadScoreboard({ data: { userId: user.id, durationSec } }),
        ),
      )

      const nextStandings = { ...EMPTY_STANDINGS }
      for (let i = 0; i < TYPING_DURATIONS.length; i++) {
        const durationSec = TYPING_DURATIONS[i]
        const result = results[i]
        nextStandings[durationSec] = findUserDailyStanding(
          result.entries,
          user.id,
        )
      }

      setStandings(nextStandings)
      setLocalDate(results[0]?.localDate ?? null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load profile standings.',
      )
    } finally {
      setLoading(false)
    }
  }, [loadScoreboard, user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    void refresh()
  }, [refresh, user])

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
    <main className="profile-page app-shell mx-auto flex min-h-screen w-full max-w-[760px] flex-col gap-10 px-6 py-8 sm:px-8">
      <AppHeader user={user} />

      <section className="profile-hero" aria-labelledby="profile-heading">
        <UserAvatar
          username={user.username}
          avatarUrl={user.avatarUrl}
          size={88}
          className="profile-avatar profile-avatar-hero"
          fallbackClassName="profile-avatar profile-avatar-hero profile-avatar-fallback"
        />
        <div className="profile-identity">
          <h1 id="profile-heading" className="profile-username">
            {user.username}
          </h1>
          <p className="profile-email">{user.email}</p>
        </div>
      </section>

      <section className="profile-standings" aria-labelledby="profile-standings-heading">
        <header className="profile-standings-header">
          <h2 id="profile-standings-heading" className="profile-standings-title">
            Today&apos;s standing
          </h2>
          {localDate ? (
            <p className="profile-standings-date">
              {formatKathmanduDate(localDate)}
              <span className="profile-standings-timezone"> · Kathmandu</span>
            </p>
          ) : null}
        </header>

        {error ? (
          <p role="alert" className="text-sm text-[var(--error)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="typing-muted text-sm">Loading today&apos;s stats…</p>
        ) : (
          <div className="profile-standings-panel">
            {TYPING_DURATIONS.map((durationSec) => (
              <StandingRow
                key={durationSec}
                durationSec={durationSec}
                standing={standings[durationSec]}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
