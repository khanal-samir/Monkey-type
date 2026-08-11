import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { pickActiveSentence } from '#/server/sentences'
import { submitAttempt } from '#/server/rankings'
import { scoreAttempt } from '#/domain/scoring'
import { E2E_SHORT_TIMER_MS, isE2eShortTimer } from '#/lib/e2e/env'
import {
  createTypingEngine,
  type CompletedAttempt,
  type DurationSec,
  type TypingEngine,
  type TypingEngineState,
  type TypingSentence,
} from '#/domain/typing-engine'

type TypingArenaProps = {
  userId: string
  duration: DurationSec
  /** Fired after a completed run is persisted (always), with whether daily best changed. */
  onAttemptSaved?: (info: { dailyBestUpdated: boolean }) => void
}

type LiveScore = {
  wpm: number
  accuracy: number
}

export function TypingArena({
  userId,
  duration,
  onAttemptSaved,
}: TypingArenaProps) {
  const pickFn = useServerFn(pickActiveSentence)
  const submitFn = useServerFn(submitAttempt)
  const engineRef = useRef<TypingEngine | null>(null)
  const focusRef = useRef<HTMLDivElement>(null)
  const savedAttemptKeyRef = useRef<string | null>(null)
  const onAttemptSavedRef = useRef(onAttemptSaved)
  onAttemptSavedRef.current = onAttemptSaved
  const pendingRestartRef = useRef(false)

  const [state, setState] = useState<TypingEngineState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedScore, setCompletedScore] = useState<LiveScore | null>(null)
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null)
  const [pendingRestart, setPendingRestart] = useState(false)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dailyBestUpdated, setDailyBestUpdated] = useState(false)

  const clearPendingRestart = useCallback(() => {
    pendingRestartRef.current = false
    setPendingRestart(false)
  }, [])

  const sync = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    const next = engine.getState()
    setState(next)
    if (next.status === 'running' && next.events.length > 0) {
      setLiveScore(
        scoreAttempt({
          durationSec: next.durationSec,
          events: next.events,
          elapsedMs: Math.max(next.elapsedMs, 1),
        }),
      )
    } else if (next.status === 'idle') {
      setLiveScore(null)
    }
  }, [])

  const persistResult = useCallback(
    async (result: CompletedAttempt) => {
      const key = `${result.startedAtMs}-${result.endedAtMs}-${result.durationSec}`
      if (savedAttemptKeyRef.current === key) return
      savedAttemptKeyRef.current = key

      const score = scoreAttempt(result)
      setCompletedScore(score)
      setLiveScore(null)
      setSaveStatus('saving')
      setSaveError(null)
      setDailyBestUpdated(false)

      try {
        const saved = await submitFn({
          data: {
            userId,
            durationSec: result.durationSec,
            wpm: score.wpm,
            accuracy: score.accuracy,
          },
        })
        setSaveStatus('saved')
        setDailyBestUpdated(saved.dailyBestUpdated)
        onAttemptSavedRef.current?.({
          dailyBestUpdated: saved.dailyBestUpdated,
        })
      } catch (err) {
        setSaveStatus('error')
        setSaveError(
          err instanceof Error ? err.message : 'Failed to save attempt.',
        )
        savedAttemptKeyRef.current = null
      }
    },
    [submitFn, userId],
  )

  const handleCompleted = useCallback(
    (after: TypingEngineState) => {
      if (after.status !== 'completed' || !after.result) return
      clearPendingRestart()
      setCompletedScore(scoreAttempt(after.result))
      setLiveScore(null)
      void persistResult(after.result)
    },
    [clearPendingRestart, persistResult],
  )

  const startWithSentence = useCallback(
    (sentence: TypingSentence, nextDuration: DurationSec) => {
      const engine = createTypingEngine({
        durationSec: nextDuration,
        sentence,
        ...(isE2eShortTimer() ? { timerMs: E2E_SHORT_TIMER_MS } : {}),
      })
      engineRef.current = engine
      savedAttemptKeyRef.current = null
      clearPendingRestart()
      setCompletedScore(null)
      setLiveScore(null)
      setSaveStatus('idle')
      setSaveError(null)
      setDailyBestUpdated(false)
      setState(engine.getState())
      setLoading(false)
      requestAnimationFrame(() => focusRef.current?.focus())
    },
    [clearPendingRestart],
  )

  const loadSentence = useCallback(
    async (nextDuration: DurationSec = duration) => {
      setLoadError(null)
      setLoading(true)
      try {
        const { sentence } = await pickFn({ data: { userId } })
        startWithSentence(
          { id: sentence.id, text: sentence.text },
          nextDuration,
        )
      } catch (err) {
        setLoading(false)
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load a sentence.',
        )
      }
    },
    [duration, pickFn, startWithSentence, userId],
  )

  useEffect(() => {
    void loadSentence(duration)
    // Reload when identity or shared duration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, duration])

  useEffect(() => {
    const id = window.setInterval(() => {
      const engine = engineRef.current
      if (!engine) return
      const before = engine.getState()
      if (before.status !== 'running') return
      engine.tick()
      const after = engine.getState()
      setState(after)
      if (after.status === 'completed' && after.result) {
        handleCompleted(after)
      } else if (after.events.length > 0) {
        setLiveScore(
          scoreAttempt({
            durationSec: after.durationSec,
            events: after.events,
            elapsedMs: Math.max(after.elapsedMs, 1),
          }),
        )
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [handleCompleted])

  const discardAndRestart = useCallback(() => {
    clearPendingRestart()
    void loadSentence(duration)
  }, [clearPendingRestart, duration, loadSentence])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const engine = engineRef.current
      if (!engine) return

      if (e.key === 'Tab') {
        e.preventDefault()
        pendingRestartRef.current = true
        setPendingRestart(true)
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (pendingRestartRef.current) {
          clearPendingRestart()
        }
        return
      }

      if (e.key === 'Enter' && pendingRestartRef.current) {
        e.preventDefault()
        discardAndRestart()
        return
      }

      if (e.key === 'Backspace') {
        e.preventDefault()
        if (engine.getState().status === 'completed') return
        engine.backspace()
        sync()
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const before = engine.getState()
        if (before.status === 'completed') return
        if (pendingRestartRef.current) {
          clearPendingRestart()
        }
        engine.inputChar(e.key)
        engine.tick()
        const after = engine.getState()
        setState(after)
        if (after.status === 'completed' && after.result) {
          handleCompleted(after)
        } else if (after.events.length > 0) {
          setLiveScore(
            scoreAttempt({
              durationSec: after.durationSec,
              events: after.events,
              elapsedMs: Math.max(after.elapsedMs, 1),
            }),
          )
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearPendingRestart, discardAndRestart, handleCompleted, sync])

  const remainingSec = state
    ? Math.ceil(state.remainingMs / 1000)
    : duration

  const displayWpm =
    state?.status === 'running' && liveScore
      ? Math.round(liveScore.wpm)
      : state?.status === 'completed' && completedScore
        ? Math.round(completedScore.wpm)
        : null
  const displayAcc =
    state?.status === 'running' && liveScore
      ? Math.round(liveScore.accuracy)
      : state?.status === 'completed' && completedScore
        ? Math.round(completedScore.accuracy)
        : null

  return (
    <section className="typing-arena flex w-full flex-col items-center gap-6">
      <div className="live-stats flex items-end justify-center gap-8 tabular-nums">
        <div className="stat-block text-center">
          <p className="stat-value font-mono text-3xl tracking-tight sm:text-4xl">
            {state?.status === 'completed' ? 0 : remainingSec}
          </p>
          <p className="stat-label">time</p>
        </div>
        <div className="stat-block text-center">
          <p className="stat-value font-mono text-3xl tracking-tight sm:text-4xl">
            {displayWpm ?? '—'}
          </p>
          <p className="stat-label">wpm</p>
        </div>
        <div className="stat-block text-center">
          <p className="stat-value font-mono text-3xl tracking-tight sm:text-4xl">
            {displayAcc ?? '—'}
          </p>
          <p className="stat-label">acc</p>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--error)]">
          {loadError}
        </p>
      ) : null}

      <div
        ref={focusRef}
        tabIndex={0}
        className="typing-focus outline-none"
        aria-label="Typing area"
        onClick={() => focusRef.current?.focus()}
      >
        {loading || !state ? (
          <p className="typing-muted text-center text-lg">Loading sentence…</p>
        ) : (
          <TypingText state={state} />
        )}
        {state && state.status === 'idle' && !loading ? (
          <p className="click-hint mt-4 text-left text-xs">
            click here or start typing
          </p>
        ) : null}
      </div>

      {pendingRestart ? (
        <p className="restart-pending text-sm" role="status">
          Press <kbd className="kbd">Enter</kbd> to restart ·{' '}
          <kbd className="kbd">Esc</kbd> to cancel
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="restart-btn rounded-md px-4 py-2 text-sm font-medium"
          onClick={discardAndRestart}
        >
          Restart
        </button>
      </div>

      <ShortcutLegend completed={state?.status === 'completed'} />

      {state?.status === 'completed' && state.result && completedScore ? (
        <ResultSummary
          result={state.result}
          score={completedScore}
          saveStatus={saveStatus}
          saveError={saveError}
          dailyBestUpdated={dailyBestUpdated}
        />
      ) : null}
    </section>
  )
}

function ShortcutLegend({ completed }: { completed?: boolean }) {
  return (
    <ul className="shortcut-legend flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
      <li>
        <kbd className="kbd">Tab</kbd>
        <span className="shortcut-plus">+</span>
        <kbd className="kbd">Enter</kbd>
        <span className="shortcut-desc">
          {completed ? 'next test' : 'restart'}
        </span>
      </li>
      <li>
        <kbd className="kbd">Esc</kbd>
        <span className="shortcut-desc">cancel restart</span>
      </li>
    </ul>
  )
}

function TypingText({ state }: { state: TypingEngineState }) {
  const text = state.sentenceText
  const tokens: Array<{ start: number; value: string; isSpace: boolean }> = []
  let i = 0
  while (i < text.length) {
    if (text[i] === ' ') {
      tokens.push({ start: i, value: ' ', isSpace: true })
      i += 1
      continue
    }
    let end = i + 1
    while (end < text.length && text[end] !== ' ') end += 1
    tokens.push({ start: i, value: text.slice(i, end), isSpace: false })
    i = end
  }

  return (
    <p className="typing-text mx-auto w-full max-w-none text-left font-mono text-[1.25rem] leading-[1.95] tracking-wide sm:text-[1.4rem] sm:leading-[2.05]">
      {tokens.map((token) => {
        if (token.isSpace) {
          const idx = token.start
          let className = 'typing-upcoming'
          if (idx < state.caretIndex) {
            const event = state.events[idx]
            className = event?.correct ? 'typing-correct' : 'typing-incorrect'
          } else if (idx === state.caretIndex && state.status !== 'completed') {
            className = 'typing-caret'
          }
          return (
            <span key={`sp-${idx}`} className={`typing-space ${className}`}>
             {' '}
            </span>
          )
        }

        return (
          <span key={`w-${token.start}`} className="typing-word">
            {[...token.value].map((ch, offset) => {
              const idx = token.start + offset
              let className = 'typing-upcoming'
              if (idx < state.caretIndex) {
                const event = state.events[idx]
                className = event?.correct
                  ? 'typing-correct'
                  : 'typing-incorrect'
              } else if (
                idx === state.caretIndex &&
                state.status !== 'completed'
              ) {
                className = 'typing-caret'
              }
              return (
                <span key={`${idx}-${ch}`} className={className}>
                  {ch}
                </span>
              )
            })}
          </span>
        )
      })}
    </p>
  )
}

function ResultSummary({
  result,
  score,
  saveStatus,
  saveError,
  dailyBestUpdated,
}: {
  result: CompletedAttempt
  score: LiveScore
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  dailyBestUpdated: boolean
}) {
  return (
    <div className="result-panel w-full max-w-md text-center" role="status">
      <p className="result-label text-xs uppercase tracking-[0.2em]">
        Run complete · {result.durationSec}s board
      </p>
      <div className="mt-3 flex justify-center gap-10">
        <div>
          <p className="result-value font-mono text-4xl tabular-nums">
            {Math.round(score.wpm)}
          </p>
          <p className="result-label text-xs uppercase tracking-wider">wpm</p>
        </div>
        <div>
          <p className="result-value font-mono text-4xl tabular-nums">
            {Math.round(score.accuracy)}
          </p>
          <p className="result-label text-xs uppercase tracking-wider">acc</p>
        </div>
      </div>
      <p className="typing-hint mt-3 text-xs">
        {saveStatus === 'saving'
          ? 'Saving attempt…'
          : saveStatus === 'saved'
            ? dailyBestUpdated
              ? 'Saved · new daily best for this duration'
              : 'Saved · daily best unchanged'
            : saveStatus === 'error'
              ? (saveError ?? 'Save failed')
              : 'Tab + Enter for next test'}
      </p>
    </div>
  )
}
