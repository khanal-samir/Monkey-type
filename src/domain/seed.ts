import { resolveUsername } from './username'

export const COMPANY_TIMEZONE = 'Asia/Kathmandu'

export const SEED_ADMIN_EMAIL = 'samir1.dohoro@gmail.com'

export const SEED_SENTENCES = [
  'The quick brown fox jumps over the lazy dog near the river bank.',
  'Practice every day and your typing speed will steadily improve.',
  'Dohoro teammates compete fairly on the daily leaderboard.',
  'Clear sentences help everyone focus on accuracy and rhythm.',
  'Small consistent efforts compound into remarkable skill over time.',
] as const

export type SeedUser = {
  email: string
  username: string
  isAdmin: boolean
  avatarUrl: string | null
}

export function buildSeedAdmin(): SeedUser {
  return {
    email: SEED_ADMIN_EMAIL,
    username: resolveUsername(SEED_ADMIN_EMAIL),
    isAdmin: true,
    avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(SEED_ADMIN_EMAIL)}`,
  }
}

export function getSeedSentenceCount(): number {
  return SEED_SENTENCES.length
}
