import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getTodaysScoreboard } from '#/server/rankings'
import type { ScoreboardEntry } from '#/domain/leaderboard'
import type { DurationSec } from '#/domain/typing-engine'
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from '#/lib/supabase/client'
import { localDateInTimezone } from '#/domain/daily-best'
import { UserAvatarPreview } from '#/components/user-avatar-preview'

type ScoreboardProps = {
  userId: string
  durationSec: DurationSec
  /** Bump to force a refetch after the local user improves a daily best. */
  refreshToken?: number
}

export function Scoreboard({
  userId,
  durationSec,
  refreshToken = 0,
}: ScoreboardProps) {
  const loadBoard = useServerFn(getTodaysScoreboard)
  const [entries, setEntries] = useState<ScoreboardEntry[]>([])
  const [localDate, setLocalDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await loadBoard({
        data: { userId, durationSec },
      })
      setEntries(result.entries)
      setLocalDate(result.localDate)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load scoreboard.',
      )
    } finally {
      setLoading(false)
    }
  }, [durationSec, loadBoard, userId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh, refreshToken])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    const today = localDateInTimezone(new Date())
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`daily-bests-${durationSec}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_bests',
          filter: `duration_sec=eq.${durationSec}`,
        },
        (payload) => {
          if (cancelled) return
          const row = (payload.new ?? payload.old) as
            | { local_date?: string; duration_sec?: number }
            | undefined
          if (!row) return
          if (row.local_date && row.local_date !== today) return
          void refresh()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [durationSec, refresh])

  return (
    <section className="scoreboard w-full max-w-lg" aria-label="Today's scoreboard">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="scoreboard-title text-sm font-semibold uppercase tracking-[0.18em]">
          Today
        </h2>
        {localDate ? (
          <p className="typing-hint text-xs tabular-nums">{localDate}</p>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="text-sm text-[var(--error)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="typing-muted text-sm">Loading rankings…</p>
      ) : entries.length === 0 ? (
        <p className="typing-muted text-sm">
          No finishers yet for {durationSec}s today. Complete a run to appear.
        </p>
      ) : (
        <ol className="scoreboard-list m-0 list-none p-0">
          {entries.map((entry) => (
            <li
              key={entry.userId}
              className="scoreboard-row flex items-center gap-3 py-2.5"
            >
              <span className="scoreboard-rank w-6 shrink-0 font-mono text-sm tabular-nums text-[var(--muted)]">
                {entry.rank}
              </span>
              <UserAvatarPreview
                username={entry.username}
                avatarUrl={entry.avatarUrl}
                size={32}
                className="h-8 w-8 shrink-0 rounded-full bg-[var(--surface)]"
                fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--fg)]">
                {entry.username}
              </span>
              <span className="shrink-0 text-right font-mono text-sm tabular-nums">
                <span className="text-[var(--accent)]">
                  {Math.round(entry.wpm)}
                </span>
                <span className="ml-1 text-[var(--muted)]">wpm</span>
                <span className="ml-2 text-[var(--muted)]">
                  {Math.round(entry.accuracy)}%
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
