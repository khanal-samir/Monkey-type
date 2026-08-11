import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { pickActiveSentence } from '#/server/sentences'
import { scoreAttempt } from '#/domain/scoring'
import {
  createTypingEngine,
  TYPING_DURATIONS,
  type CompletedAttempt,
  type DurationSec,
  type TypingEngine,
  type TypingEngineState,
  type TypingSentence,
} from '#/domain/typing-engine'

type TypingArenaProps = {
  userId: string
}

type LiveScore = {
  wpm: number
  accuracy: number
}

export function TypingArena({ userId }: TypingArenaProps) {
  const pickFn = useServerFn(pickActiveSentence)
  const engineRef = useRef<TypingEngine | null>(null)
  const focusRef = useRef<HTMLDivElement>(null)

  const [duration, setDuration] = useState<DurationSec>(30)
  const [state, setState] = useState<TypingEngineState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedScore, setCompletedScore] = useState<LiveScore | null>(null)

  const sync = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    setState(engine.getState())
  }, [])

  const startWithSentence = useCallback(
    (sentence: TypingSentence, nextDuration: DurationSec) => {
      const engine = createTypingEngine({
        durationSec: nextDuration,
        sentence,
      })
      engineRef.current = engine
      setCompletedScore(null)
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
    // Initial load only — duration changes handled explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
        setCompletedScore(scoreAttempt(after.result))
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  const discardAndRestart = useCallback(() => {
    void loadSentence(duration)
  }, [duration, loadSentence])

  const onDurationChange = useCallback(
    (next: DurationSec) => {
      setDuration(next)
      void loadSentence(next)
    },
    [loadSentence],
  )

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
          setCompletedScore(scoreAttempt(after.result))
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [discardAndRestart, sync])

  const remainingSec = state
    ? Math.ceil(state.remainingMs / 1000)
    : duration

  return (
    <section className="typing-arena flex w-full flex-col items-center gap-8">
      <div
        className="duration-tabs flex gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Duration"
      >
        {TYPING_DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={duration === d}
            className={`duration-tab rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              duration === d ? 'duration-tab-active' : ''
            }`}
            onClick={() => onDurationChange(d)}
          >
            {d}
          </button>
        ))}
      </div>

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
        <ResultSummary result={state.result} score={completedScore} />
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
}: {
  result: CompletedAttempt
  score: LiveScore
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
        Result ready for scoring persistence (next slice). Restart to try again.
      </p>
    </div>
  )
}
