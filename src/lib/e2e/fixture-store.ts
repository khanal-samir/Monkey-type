/**
 * In-memory repository for Playwright / demo mode (VITE_E2E_FIXTURES=1).
 * Seeds the PRD admin and a short active sentence so runs are fast to type.
 */

import type { SessionUser } from '#/domain/auth'
import type { DailyBestRecord } from '#/domain/daily-best'
import type { ScoreboardRowInput } from '#/domain/leaderboard'
import type { AttemptInsert } from '#/domain/persist-attempt'
import type { Sentence } from '#/domain/sentence-bank'
import { buildSeedAdmin, SEED_SENTENCES } from '#/domain/seed'
import { resolveAvatar } from '#/domain/avatar'
import { resolveUsername } from '#/domain/username'
import type { DurationSec } from '#/domain/typing-engine'

export const FIXTURE_ADMIN_ID = 'fixture-admin-0001'
export const FIXTURE_SENTENCE_ID = 'fixture-sentence-0001'

type DailyBestRow = DailyBestRecord & { updatedAt: string }

type FixtureState = {
  users: Map<string, SessionUser>
  sentences: Map<string, Sentence>
  attempts: Array<AttemptInsert & { id: string }>
  dailyBests: Map<string, DailyBestRow>
  seq: number
}

function dailyKey(
  userId: string,
  durationSec: number,
  localDate: string,
): string {
  return `${userId}|${durationSec}|${localDate}`
}

function createInitialState(): FixtureState {
  const adminSeed = buildSeedAdmin()
  const admin: SessionUser = {
    id: FIXTURE_ADMIN_ID,
    email: adminSeed.email,
    username: adminSeed.username,
    avatarUrl: adminSeed.avatarUrl,
    isAdmin: true,
  }

  const sentences = new Map<string, Sentence>()
  // Short multi-sentence passage so E2E can start typing quickly but still
  // satisfies the ≥3 sentence typing-bank rule. Keep as the only active row
  // so Playwright picks are deterministic.
  sentences.set(FIXTURE_SENTENCE_ID, {
    id: FIXTURE_SENTENCE_ID,
    text: 'type fast now. keep going steady. finish strong here.',
    isActive: true,
  })
  // Extra unique inactive passages (pool content for admin UI / bank size).
  for (let i = 0; i < 24; i++) {
    const id = `fixture-passage-${String(i + 2).padStart(4, '0')}`
    sentences.set(id, {
      id,
      text: `Fixture passage ${i + 1} opens cleanly. The middle sentence keeps variety high. A third sentence closes the loop for practice. Optional fourth line adds depth ${i + 1}.`,
      isActive: false,
    })
  }
  SEED_SENTENCES.forEach((text, i) => {
    const id = `fixture-sentence-${String(i + 2).padStart(4, '0')}`
    sentences.set(id, { id, text, isActive: false })
  })

  return {
    users: new Map([[admin.id, admin]]),
    sentences,
    attempts: [],
    dailyBests: new Map(),
    seq: 1,
  }
}

let state: FixtureState = createInitialState()

export function resetFixtureStore(): void {
  state = createInitialState()
}

function nextId(prefix: string): string {
  state.seq += 1
  return `fixture-${prefix}-${String(state.seq).padStart(4, '0')}`
}

export async function fixtureFindUserByEmail(
  email: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase()
  for (const user of state.users.values()) {
    if (user.email === normalized) return user
  }
  return null
}

export async function fixtureFindUserById(
  id: string,
): Promise<SessionUser | null> {
  return state.users.get(id) ?? null
}

export async function fixtureListUsers(): Promise<SessionUser[]> {
  return [...state.users.values()].sort((a, b) =>
    a.email.localeCompare(b.email),
  )
}

export async function fixtureCreateUser(input: {
  email: string
  username?: string | null
  avatarUrl?: string | null
  isAdmin?: boolean
}): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error('Email is required.')
  if (await fixtureFindUserByEmail(email)) {
    throw new Error('A user with that email already exists.')
  }

  const user: SessionUser = {
    id: nextId('user'),
    email,
    username: resolveUsername(email, input.username),
    avatarUrl: resolveAvatar({
      uploadUrl: input.avatarUrl,
      seed: email,
    }),
    isAdmin: Boolean(input.isAdmin),
  }
  state.users.set(user.id, user)
  return user
}

export async function fixtureUpdateUser(input: {
  userId: string
  username?: string | null
  avatarUrl?: string | null
  isAdmin?: boolean
}): Promise<SessionUser> {
  const existing = state.users.get(input.userId)
  if (!existing) throw new Error('User not found for the given userId.')

  const next: SessionUser = { ...existing }
  if (input.username !== undefined) {
    const trimmed = input.username?.trim()
    if (trimmed) next.username = trimmed
  }
  if (input.avatarUrl !== undefined) {
    const trimmed = input.avatarUrl?.trim()
    next.avatarUrl = trimmed || null
  }
  if (input.isAdmin !== undefined) {
    next.isAdmin = input.isAdmin
  }
  state.users.set(next.id, next)
  return next
}

export async function fixtureListSentences(options?: {
  activeOnly?: boolean
}): Promise<Sentence[]> {
  let rows = [...state.sentences.values()]
  if (options?.activeOnly) {
    rows = rows.filter((s) => s.isActive)
  }
  return rows
}

export async function fixtureCreateSentence(input: {
  text: string
  isActive?: boolean
}): Promise<Sentence> {
  const text = input.text.trim()
  if (!text) throw new Error('Sentence text is required.')
  const sentence: Sentence = {
    id: nextId('sentence'),
    text,
    isActive: input.isActive ?? true,
  }
  state.sentences.set(sentence.id, sentence)
  return sentence
}

export async function fixtureUpdateSentence(input: {
  id: string
  text?: string
  isActive?: boolean
}): Promise<Sentence> {
  const existing = state.sentences.get(input.id)
  if (!existing) throw new Error('Sentence not found.')
  const next: Sentence = { ...existing }
  if (input.text !== undefined) {
    const trimmed = input.text.trim()
    if (!trimmed) throw new Error('Sentence text is required.')
    next.text = trimmed
  }
  if (input.isActive !== undefined) {
    next.isActive = input.isActive
  }
  state.sentences.set(next.id, next)
  return next
}

export async function fixtureInsertAttempt(
  input: AttemptInsert,
): Promise<{ id: string }> {
  const id = nextId('attempt')
  state.attempts.push({ ...input, id })
  return { id }
}

export async function fixtureFindDailyBest(key: {
  userId: string
  durationSec: DurationSec
  localDate: string
}): Promise<{ wpm: number } | null> {
  const row = state.dailyBests.get(
    dailyKey(key.userId, key.durationSec, key.localDate),
  )
  return row ? { wpm: row.wpm } : null
}

export async function fixtureWriteDailyBest(
  record: DailyBestRecord,
): Promise<void> {
  state.dailyBests.set(
    dailyKey(record.userId, record.durationSec, record.localDate),
    { ...record, updatedAt: new Date().toISOString() },
  )
}

export async function fixtureListTodaysScoreboardRows(input: {
  durationSec: DurationSec
  localDate: string
}): Promise<ScoreboardRowInput[]> {
  const rows: ScoreboardRowInput[] = []
  for (const best of state.dailyBests.values()) {
    if (
      best.localDate !== input.localDate ||
      best.durationSec !== input.durationSec
    ) {
      continue
    }
    const user = state.users.get(best.userId)
    if (!user) continue
    rows.push({
      userId: best.userId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      wpm: best.wpm,
      accuracy: best.accuracy,
    })
  }
  return rows.sort((a, b) => b.wpm - a.wpm)
}
