/**
 * SentenceBank — pick random active sentences; admin CRUD lives at the repo/server seam.
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

/**
 * Picks a random active sentence. Inactive entries are never selected.
 */
export function pickSentence(
  sentences: readonly Sentence[],
  options: PickSentenceOptions = {},
): Sentence {
  const active = sentences.filter((s) => s.isActive)
  if (active.length === 0) {
    throw new Error('No active sentences available.')
  }

  const random = options.random ?? Math.random
  const index = Math.min(
    active.length - 1,
    Math.floor(random() * active.length),
  )
  return active[index]!
}

/** Deep-module facade: SentenceBank.pickSentence */
export const SentenceBank = { pickSentence }
