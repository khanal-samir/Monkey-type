import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getTodaysScoreboard } from '#/server/rankings'
import type { ScoreboardEntry } from '#/domain/leaderboard'
import {
  TYPING_DURATIONS,
  type DurationSec,
} from '#/domain/typing-engine'
import { localDateInTimezone } from '#/domain/daily-best'
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from '#/lib/supabase/client'
import { UserAvatar } from '#/components/user-avatar'

type LeaderboardBoardProps = {
  userId: string
  onLocalDate?: (localDate: string | null) => void
}

type BoardsByDuration = Record<DurationSec, ScoreboardEntry[]>

const LEADERBOARD_TOP_N = 5
const EMPTY_BOARDS: BoardsByDuration = { 15: [], 30: [], 60: [] }

function LeaderboardColumn({
  durationSec,
  entries,
}: {
  durationSec: DurationSec
  entries: ScoreboardEntry[]
}) {
  return (
    <section
      className="lb-column"
      aria-labelledby={`lb-heading-${durationSec}`}
    >
      <header className="lb-column-header">
        <h2 id={`lb-heading-${durationSec}`} className="lb-column-title">
          {durationSec}s
        </h2>
      </header>

      {entries.length === 0 ? (
        <p className="lb-empty">No finishers yet</p>
      ) : (
        <ol className="lb-list">
          {entries.map((entry) => (
            <li
              key={entry.userId}
              className={`lb-row${entry.rank === 1 ? ' lb-rank-1' : ''}`}
            >
              <span className="lb-rank">{entry.rank}</span>
              <UserAvatar
                username={entry.username}
                avatarUrl={entry.avatarUrl}
                size={32}
                className="lb-avatar"
                fallbackClassName="lb-avatar lb-avatar-fallback"
              />
              <span className="lb-username">{entry.username}</span>
              <span className="lb-stats">
                <span className="lb-wpm">{Math.round(entry.wpm)}</span>
                <span className="lb-wpm-label">wpm</span>
                <span className="lb-acc">{Math.round(entry.accuracy)}%</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function LeaderboardBoard({ userId, onLocalDate }: LeaderboardBoardProps) {
  const loadBoard = useServerFn(getTodaysScoreboard)
  const [boards, setBoards] = useState<BoardsByDuration>(EMPTY_BOARDS)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const onLocalDateRef = useRef(onLocalDate)
  onLocalDateRef.current = onLocalDate

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const results = await Promise.all(
        TYPING_DURATIONS.map((durationSec) =>
          loadBoard({ data: { userId, durationSec } }),
        ),
      )

      const nextBoards = { ...EMPTY_BOARDS }
      for (let i = 0; i < TYPING_DURATIONS.length; i++) {
        const durationSec = TYPING_DURATIONS[i]
        nextBoards[durationSec] = results[i].entries.slice(0, LEADERBOARD_TOP_N)
      }

      setBoards(nextBoards)
      onLocalDateRef.current?.(results[0]?.localDate ?? null)
    } catch (err) {
      onLocalDateRef.current?.(null)
      setError(
        err instanceof Error ? err.message : 'Failed to load leaderboards.',
      )
    } finally {
      setLoading(false)
    }
  }, [loadBoard, userId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    const today = localDateInTimezone(new Date())
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('daily-bests-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_bests',
        },
        (payload) => {
          if (cancelled) return
          const row = (payload.new ?? payload.old) as
            | { local_date?: string }
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
  }, [refresh])

  if (loading) {
    return <p className="lb-loading typing-muted">Loading rankings…</p>
  }

  if (error) {
    return (
      <p role="alert" className="lb-error text-sm text-[var(--error)]">
        {error}
      </p>
    )
  }

  return (
    <div className="lb-grid">
      {TYPING_DURATIONS.map((durationSec) => (
        <LeaderboardColumn
          key={durationSec}
          durationSec={durationSec}
          entries={boards[durationSec]}
        />
      ))}
    </div>
  )
}
