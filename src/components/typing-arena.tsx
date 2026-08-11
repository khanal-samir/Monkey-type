import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { pickActiveSentence } from '#/server/sentences'
import { submitAttempt } from '#/server/rankings'
import { scoreAttempt } from '#/domain/scoring'
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

  const [state, setState] = useState<TypingEngineState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedScore, setCompletedScore] = useState<LiveScore | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dailyBestUpdated, setDailyBestUpdated] = useState(false)

  const sync = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    setState(engine.getState())
  }, [])

  const persistResult = useCallback(
    async (result: CompletedAttempt) => {
      const key = `${result.startedAtMs}-${result.endedAtMs}-${result.durationSec}`
      if (savedAttemptKeyRef.current === key) return
      savedAttemptKeyRef.current = key

      const score = scoreAttempt(result)
      setCompletedScore(score)
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
      setCompletedScore(scoreAttempt(after.result))
      void persistResult(after.result)
    },
    [persistResult],
  )

  const startWithSentence = useCallback(
    (sentence: TypingSentence, nextDuration: DurationSec) => {
      const engine = createTypingEngine({
        durationSec: nextDuration,
        sentence,
      })
      engineRef.current = engine
      savedAttemptKeyRef.current = null
      setCompletedScore(null)
      setSaveStatus('idle')
      setSaveError(null)
      setDailyBestUpdated(false)
      setState(engine.getState())
      setLoading(false)
      focusRef.current?.focus()
    },
    [],
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
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [handleCompleted])

  const discardAndRestart = useCallback(() => {
    void loadSentence(duration)
  }, [duration, loadSentence])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const engine = engineRef.current
      if (!engine) return

      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault()
        discardAndRestart()
        return
      }

      if (e.key === 'Backspace') {
        e.preventDefault()
        engine.backspace()
        sync()
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const before = engine.getState()
        if (before.status === 'completed') return
        engine.inputChar(e.key)
        engine.tick()
        const after = engine.getState()
        setState(after)
        if (after.status === 'completed' && after.result) {
          handleCompleted(after)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [discardAndRestart, handleCompleted, sync])

  const remainingSec = state
    ? Math.ceil(state.remainingMs / 1000)
    : duration

  return (
    <section className="typing-arena flex w-full flex-col items-center gap-8">
      <div className="timer-display font-mono text-2xl tabular-nums tracking-tight">
        {state?.status === 'completed' ? 0 : remainingSec}
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
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="restart-btn rounded-md px-4 py-2 text-sm font-medium"
          onClick={discardAndRestart}
        >
          Restart
        </button>
        <p className="typing-hint text-xs">
          Tab or Escape restarts · incomplete runs are discarded
        </p>
      </div>

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

function TypingText({ state }: { state: TypingEngineState }) {
  const chars = state.sentenceText.split('')
  return (
    <p className="typing-text mx-auto max-w-3xl text-center font-mono text-2xl leading-relaxed tracking-wide sm:text-3xl">
      {chars.map((ch, i) => {
        let className = 'typing-upcoming'
        if (i < state.caretIndex) {
          const event = state.events[i]
          className = event?.correct ? 'typing-correct' : 'typing-incorrect'
        } else if (i === state.caretIndex && state.status !== 'completed') {
          className = 'typing-caret'
        }
        return (
          <span key={`${i}-${ch}`} className={className}>
            {ch === ' ' ? '\u00a0' : ch}
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
        Run complete · {result.durationSec}s
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
              : 'Restart to try again'}
      </p>
    </div>
  )
}
