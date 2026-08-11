import { describe, expect, it, vi } from 'vitest'
import { pickSentence, type Sentence } from './sentence-bank'

const activeA: Sentence = {
  id: 'a',
  text: 'Active sentence one.',
  isActive: true,
}

const activeB: Sentence = {
  id: 'b',
  text: 'Active sentence two.',
  isActive: true,
}

const inactive: Sentence = {
  id: 'c',
  text: 'Inactive sentence.',
  isActive: false,
}

describe('SentenceBank.pickSentence', () => {
  it('returns a random active sentence and never picks inactive ones', () => {
    const random = vi.fn(() => 0.9)
    const picked = pickSentence([activeA, inactive, activeB], { random })

    expect(picked.isActive).toBe(true)
    expect(picked.id).toBe('b')
    expect(picked.text).toBe('Active sentence two.')
  })

  it('throws when no active sentences are available', () => {
    expect(() => pickSentence([inactive])).toThrow(
      'No active sentences available.',
    )
  })

  it('throws on an empty bank', () => {
    expect(() => pickSentence([])).toThrow('No active sentences available.')
  })
})
