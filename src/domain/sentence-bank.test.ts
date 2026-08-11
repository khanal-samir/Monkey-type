import { describe, expect, it, vi } from 'vitest'
import {
  countPassageSentences,
  isTypingPassage,
  pickSentence,
  type Sentence,
} from './sentence-bank'

const passageA: Sentence = {
  id: 'a',
  text: 'First line here. Second line follows. Third line closes.',
  isActive: true,
}

const passageB: Sentence = {
  id: 'b',
  text: 'Alpha starts strong. Bravo keeps pace. Charlie finishes clean. Delta adds depth.',
  isActive: true,
}

const oneLiner: Sentence = {
  id: 'one',
  text: 'The quick brown fox jumps over the lazy dog near the river bank.',
  isActive: true,
}

const inactivePassage: Sentence = {
  id: 'c',
  text: 'Inactive opener. Still three sentences. Not selectable though.',
  isActive: false,
}

describe('SentenceBank passage helpers', () => {
  it('counts sentences by terminal punctuation', () => {
    expect(countPassageSentences(passageA.text)).toBe(3)
    expect(countPassageSentences(passageB.text)).toBe(4)
    expect(countPassageSentences(oneLiner.text)).toBe(1)
    expect(isTypingPassage(oneLiner.text)).toBe(false)
    expect(isTypingPassage(passageA.text)).toBe(true)
  })
})

describe('SentenceBank.pickSentence', () => {
  it('returns a random active multi-sentence passage and skips one-liners', () => {
    const random = vi.fn(() => 0.9)
    const picked = pickSentence(
      [passageA, inactivePassage, oneLiner, passageB],
      { random },
    )

    expect(picked.isActive).toBe(true)
    expect(picked.id).toBe('b')
    expect(isTypingPassage(picked.text)).toBe(true)
  })

  it('never picks an active single-sentence row', () => {
    expect(() => pickSentence([oneLiner])).toThrow(/multi-sentence/i)
  })

  it('throws when no active passages are available', () => {
    expect(() => pickSentence([inactivePassage])).toThrow(/multi-sentence/i)
  })

  it('throws on an empty bank', () => {
    expect(() => pickSentence([])).toThrow(/multi-sentence/i)
  })
})
