/**
 * SentenceBank — pick random active multi-sentence passages.
 * Single-sentence rows are never served for typing.
 */

export type Sentence = {
  id: string
  text: string
  isActive: boolean
}

export type PickSentenceOptions = {
  /** Deterministic RNG for tests; defaults to Math.random. Returns [0, 1). */
  random?: () => number
}

/** Minimum sentences (by . ? !) required for a typing passage. */
export const MIN_PASSAGE_SENTENCES = 3

/** Soft floor for a healthy active bank (fun-project guardrail). */
export const MIN_ACTIVE_PASSAGE_POOL = 20

/**
 * Counts terminal sentences in a passage (splits on . ? ! followed by space/end).
 */
export function countPassageSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length > 0)
    .length
}

/** True when text is long enough to use as a typing passage. */
export function isTypingPassage(text: string): boolean {
  return countPassageSentences(text) >= MIN_PASSAGE_SENTENCES
}

/**
 * Picks a random active multi-sentence passage.
 * Inactive rows and single-sentence text are never selected.
 */
export function pickSentence(
  sentences: readonly Sentence[],
  options: PickSentenceOptions = {},
): Sentence {
  const pool = sentences.filter((s) => s.isActive && isTypingPassage(s.text))
  if (pool.length === 0) {
    throw new Error(
      'No active multi-sentence passages available (need at least 3 sentences each).',
    )
  }

  const random = options.random ?? Math.random
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index]!
}

/** Deep-module facade: SentenceBank.pickSentence */
export const SentenceBank = {
  pickSentence,
  countPassageSentences,
  isTypingPassage,
}
