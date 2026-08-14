import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useServerFn } from '@tanstack/react-start'
import { pickActiveSentence } from '#/server/sentences'
import { submitAttempt } from '#/server/rankings'
import { scoreAttempt } from '#/domain/scoring'
import { E2E_SHORT_TIMER_MS, isE2eShortTimer } from '#/lib/e2e/env'
import { createTypingEngine } from '#/domain/typing-engine'
import type {
  CompletedAttempt,
  DurationSec,
  TypingEngine,
  TypingEngineState,
  TypingSentence,
  TypingStatus,
} from '#/domain/typing-engine'

type TypingArenaProps = {
  userId: string
  duration: DurationSec
  /** Fired after a completed run is persisted (always), with whether daily best changed. */
  onAttemptSaved?: (info: { dailyBestUpdated: boolean }) => void
}

type RunScore = {
  wpm: number
  accuracy: number
}

type TypingSurfaceHandle = {
  sync: (state: TypingEngineState) => void
  reset: (text: string) => void
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
  const surfaceRef = useRef<TypingSurfaceHandle>(null)
  const savedAttemptKeyRef = useRef<string | null>(null)
  const onAttemptSavedRef = useRef(onAttemptSaved)
  onAttemptSavedRef.current = onAttemptSaved
  const pendingRestartRef = useRef(false)
  const displayedSecRef = useRef(duration)

  const [passageText, setPassageText] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<TypingStatus>('idle')
  const [completedResult, setCompletedResult] =
    useState<CompletedAttempt | null>(null)
  const [remainingSec, setRemainingSec] = useState(duration)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedScore, setCompletedScore] = useState<RunScore | null>(null)
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

  const persistResult = useCallback(
    async (result: CompletedAttempt) => {
      const key = `${result.startedAtMs}-${result.endedAtMs}-${result.durationSec}`
      if (savedAttemptKeyRef.current === key) return
      savedAttemptKeyRef.current = key

      const score = scoreAttempt(result)
      setCompletedScore(score)
      setSaveError(null)
      setDailyBestUpdated(false)

      if (result.typed.length === 0) {
        setSaveStatus('idle')
        return
      }

      setSaveStatus('saving')

      try {
        const saved = await submitFn({
          data: {
            userId,
            durationSec: result.durationSec,
            sentenceId: result.sentenceId,
            typed: result.typed,
            startedAtMs: result.startedAtMs,
            endedAtMs: result.endedAtMs,
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
      setRunStatus('completed')
      setCompletedResult(after.result)
      setRemainingSec(0)
      displayedSecRef.current = 0
      setCompletedScore(scoreAttempt(after.result))
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
      setCompletedResult(null)
      setSaveStatus('idle')
      setSaveError(null)
      setDailyBestUpdated(false)
      const initial = engine.getState()
      setPassageText(initial.sentenceText)
      setRunStatus(initial.status)
      displayedSecRef.current = Math.ceil(initial.remainingMs / 1000)
      setRemainingSec(displayedSecRef.current)
      setLoading(false)
      // Reset surface after React commits the new passage.
      requestAnimationFrame(() => {
        surfaceRef.current?.reset(initial.sentenceText)
        surfaceRef.current?.sync(initial)
        focusRef.current?.focus()
      })
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
    // Reload only when identity or shared duration changes.
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
      if (after.status === 'completed' && after.result) {
        handleCompleted(after)
        return
      }
      const nextSec = Math.ceil(after.remainingMs / 1000)
      // Avoid React re-renders when the displayed second is unchanged.
      if (nextSec !== displayedSecRef.current) {
        displayedSecRef.current = nextSec
        setRemainingSec(nextSec)
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
      if (!e.isTrusted) return
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
        const before = engine.getState()
        if (before.status === 'completed') return
        engine.backspace()
        const after = engine.getState()
        // Imperative DOM only — no React letter re-render on the hot path.
        surfaceRef.current?.sync(after)
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
        const after = engine.getState()
        surfaceRef.current?.sync(after)
        if (before.status === 'idle' && after.status === 'running') {
          setRunStatus('running')
        }
        if (after.status === 'completed' && after.result) {
          handleCompleted(after)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearPendingRestart, discardAndRestart, handleCompleted])

  const isCompleted = runStatus === 'completed'

  return (
    <section className="typing-arena flex w-full flex-col items-center gap-6">
      {!isCompleted ? (
        <div className="live-stats flex items-end justify-center gap-8 tabular-nums">
          <div className="stat-block text-center">
            <p className="stat-value font-mono text-3xl tracking-tight sm:text-4xl">
              {remainingSec}
            </p>
            <p className="stat-label">time</p>
          </div>
        </div>
      ) : null}

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
        {loading || !passageText ? (
          <p className="typing-muted text-center text-lg">Loading sentence…</p>
        ) : isCompleted && completedResult && completedScore ? (
          <ResultSummary
            result={completedResult}
            score={completedScore}
            saveStatus={saveStatus}
            saveError={saveError}
            dailyBestUpdated={dailyBestUpdated}
          />
        ) : (
          <TypingSurface ref={surfaceRef} text={passageText} />
        )}
        {runStatus === 'idle' && !loading && passageText ? (
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

      <ShortcutLegend completed={isCompleted} />
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

type TextToken = { start: number; value: string; isSpace: boolean }

function tokenizePassage(text: string): TextToken[] {
  const tokens: TextToken[] = []
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
  return tokens
}

const LETTER_BASE = 'typing-letter'
const SPACE_BASE = 'typing-space typing-letter'

function setLetterClass(
  el: HTMLElement,
  isSpace: boolean,
  kind: 'upcoming' | 'correct' | 'incorrect',
) {
  el.className = `${isSpace ? SPACE_BASE : LETTER_BASE} typing-${kind}`
}

/**
 * Static letter DOM + imperative class/caret updates.
 * Keystrokes never re-render the passage — same model as Monkeytype.
 */
const TypingSurface = memo(
  forwardRef<TypingSurfaceHandle, { text: string }>(function TypingSurface(
    { text },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const wordsRef = useRef<HTMLParagraphElement>(null)
    const caretRef = useRef<HTMLDivElement>(null)
    const letterElsRef = useRef<(HTMLElement | null)[]>([])
    const spaceFlagsRef = useRef<boolean[]>([])
    const caretIndexRef = useRef(0)
    const lineOffsetRef = useRef(0)
    const caretReadyRef = useRef(false)
    const metricsRef = useRef({ lh: 0, fontSize: 0 })
    const preferReducedRef = useRef(false)
    const tokens = useMemo(() => tokenizePassage(text), [text])

    const refreshLetterIndex = useCallback(() => {
      const words = wordsRef.current
      if (!words) return
      const nodes = words.querySelectorAll<HTMLElement>('[data-i]')
      const letters: (HTMLElement | null)[] = []
      const spaces: boolean[] = []
      for (const node of nodes) {
        const i = Number(node.dataset.i)
        if (!Number.isFinite(i)) continue
        letters[i] = node
        spaces[i] = node.classList.contains('typing-space')
      }
      letterElsRef.current = letters
      spaceFlagsRef.current = spaces

      const style = getComputedStyle(words)
      metricsRef.current = {
        lh: parseFloat(style.lineHeight) || 0,
        fontSize: parseFloat(style.fontSize) || 0,
      }
      preferReducedRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
    }, [])

    const placeCaret = useCallback((caretIndex: number, smooth: boolean) => {
      const viewport = viewportRef.current
      const words = wordsRef.current
      const caret = caretRef.current
      if (!viewport || !words || !caret) return

      const letters = letterElsRef.current
      if (letters.length === 0) return

      caret.classList.remove('typing-caret-hidden')

      let metrics = metricsRef.current
      if (!metrics.lh || !metrics.fontSize) {
        const style = getComputedStyle(words)
        metrics = {
          lh: parseFloat(style.lineHeight) || words.getBoundingClientRect().height / 3,
          fontSize: parseFloat(style.fontSize) || 16,
        }
        metricsRef.current = metrics
      }

      const targetIndex = Math.min(
        caretIndex,
        Math.max(0, letters.length - 1),
      )
      const target = letters[targetIndex]
      if (!target) return

      const activeLine = Math.floor(target.offsetTop / metrics.lh)
      const nextOffset = Math.max(0, activeLine) * metrics.lh
      const scrolled = nextOffset !== lineOffsetRef.current
      lineOffsetRef.current = nextOffset
      words.style.transform = `translateY(${-nextOffset}px)`

      const viewportRect = viewport.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const caretHeight = Math.min(metrics.fontSize, targetRect.height)
      let x = targetRect.left - viewportRect.left
      const y =
        targetRect.top -
        viewportRect.top +
        (targetRect.height - caretHeight) / 2
      if (caretIndex >= letters.length) {
        x += targetRect.width
      }

      const allowSmooth =
        smooth && caretReadyRef.current && !scrolled && !preferReducedRef.current

      caret.classList.toggle('typing-caret-smooth', allowSmooth)
      caret.style.height = `${caretHeight}px`
      caret.style.transform = `translate(${x}px, ${y}px)`

      if (!caretReadyRef.current) {
        requestAnimationFrame(() => {
          caretReadyRef.current = true
        })
      }
    }, [])

    const sync = useCallback(
      (state: TypingEngineState) => {
        const letters = letterElsRef.current
        const spaces = spaceFlagsRef.current
        if (letters.length === 0) return

        const prev = caretIndexRef.current
        const next = state.caretIndex
        const events = state.events

        if (next > prev) {
          for (let i = prev; i < next; i++) {
            const el = letters[i]
            if (!el) continue
            setLetterClass(
              el,
              Boolean(spaces[i]),
              events[i]?.correct ? 'correct' : 'incorrect',
            )
          }
        } else if (next < prev) {
          for (let i = next; i < prev; i++) {
            const el = letters[i]
            if (!el) continue
            setLetterClass(el, Boolean(spaces[i]), 'upcoming')
          }
        }

        caretIndexRef.current = next

        if (state.status === 'completed') {
          caretRef.current?.classList.add('typing-caret-hidden')
          caretRef.current?.classList.remove('typing-caret-smooth')
          return
        }

        placeCaret(next, true)
      },
      [placeCaret],
    )

    const reset = useCallback(
      (nextText: string) => {
        void nextText
        caretIndexRef.current = 0
        lineOffsetRef.current = 0
        caretReadyRef.current = false
        const words = wordsRef.current
        if (words) words.style.transform = 'translateY(0px)'
        refreshLetterIndex()
        for (let i = 0; i < letterElsRef.current.length; i++) {
          const el = letterElsRef.current[i]
          if (!el) continue
          setLetterClass(el, Boolean(spaceFlagsRef.current[i]), 'upcoming')
        }
        const caret = caretRef.current
        if (caret) {
          caret.classList.add('typing-caret-hidden')
          caret.classList.remove('typing-caret-smooth')
          caret.style.transform = 'translate(0, 0)'
        }
      },
      [refreshLetterIndex],
    )

    useImperativeHandle(ref, () => ({ sync, reset }), [sync, reset])

    useLayoutEffect(() => {
      caretIndexRef.current = 0
      lineOffsetRef.current = 0
      caretReadyRef.current = false
      const words = wordsRef.current
      if (words) words.style.transform = 'translateY(0px)'
      refreshLetterIndex()
      placeCaret(0, false)
    }, [text, refreshLetterIndex, placeCaret])

    useEffect(() => {
      const viewport = viewportRef.current
      if (!viewport) return
      const ro = new ResizeObserver(() => {
        refreshLetterIndex()
        lineOffsetRef.current = -1
        placeCaret(caretIndexRef.current, false)
      })
      ro.observe(viewport)
      return () => ro.disconnect()
    }, [text, refreshLetterIndex, placeCaret])

    return (
      <div ref={viewportRef} className="typing-viewport">
        <div
          ref={caretRef}
          className="typing-caret-el typing-caret-hidden"
          aria-hidden
        />
        <p ref={wordsRef} className="typing-words">
          {tokens.map((token) => {
            if (token.isSpace) {
              const idx = token.start
              return (
                <span
                  key={`sp-${idx}`}
                  data-i={idx}
                  className={`${SPACE_BASE} typing-upcoming`}
                >
                  {' '}
                </span>
              )
            }

            return (
              <span key={`w-${token.start}`} className="typing-word">
                {[...token.value].map((ch, offset) => {
                  const idx = token.start + offset
                  return (
                    <span
                      key={`${idx}-${ch}`}
                      data-i={idx}
                      className={`${LETTER_BASE} typing-upcoming`}
                    >
                      {ch}
                    </span>
                  )
                })}
              </span>
            )
          })}
        </p>
      </div>
    )
  }),
)

function ResultSummary({
  result,
  score,
  saveStatus,
  saveError,
  dailyBestUpdated,
}: {
  result: CompletedAttempt
  score: RunScore
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  dailyBestUpdated: boolean
}) {
  return (
    <div className="result-panel w-full text-center" role="status">
      <div className="flex justify-center gap-12 sm:gap-16">
        <div>
          <p className="result-value font-mono text-5xl tabular-nums tracking-tight sm:text-6xl">
            {Math.round(score.wpm)}
          </p>
          <p className="result-label mt-2 text-xs uppercase tracking-wider">
            wpm
          </p>
        </div>
        <div>
          <p className="result-value font-mono text-5xl tabular-nums tracking-tight sm:text-6xl">
            {Math.round(score.accuracy)}
          </p>
          <p className="result-label mt-2 text-xs uppercase tracking-wider">
            acc
          </p>
        </div>
      </div>
      <p className="typing-hint mt-5 text-xs">
        {result.typed.length === 0
          ? 'Nothing typed · not saved'
          : saveStatus === 'saving'
            ? 'Saving attempt…'
            : saveStatus === 'saved'
              ? dailyBestUpdated
                ? `Saved · new daily best · ${result.durationSec}s`
                : `Saved · daily best unchanged · ${result.durationSec}s`
              : saveStatus === 'error'
                ? (saveError ?? 'Save failed')
                : 'Tab + Enter for next test'}
      </p>
    </div>
  )
}
