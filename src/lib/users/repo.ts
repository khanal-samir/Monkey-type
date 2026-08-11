import {
  createSupabaseClient,
  isSupabaseConfigured,
  type DohoroSupabase,
} from '#/lib/supabase/client'
import { isE2eFixtures } from '#/lib/e2e/env'
import {
  fixtureFindUserByEmail,
  fixtureFindUserById,
} from '#/lib/e2e/fixture-store'
import { mapUserRow } from '#/lib/users/map'
import type { SessionUser } from '#/domain/auth'
import type { FindUserByEmail } from '#/domain/auth'
import type { FindUserById } from '#/domain/access'

const CONFIG_ERROR =
  'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'

export function isDataBackendReady(): boolean {
  return isE2eFixtures() || isSupabaseConfigured()
}

export function assertSupabaseConfigured(): void {
  if (!isDataBackendReady()) {
    throw new Error(CONFIG_ERROR)
  }
}

export function getUsersClient(): DohoroSupabase {
  if (isE2eFixtures()) {
    throw new Error(
      'Supabase client is unavailable in E2E fixture mode. Use fixture helpers instead.',
    )
  }
  if (!isSupabaseConfigured()) {
    throw new Error(CONFIG_ERROR)
  }
  return createSupabaseClient()
}

export async function findUserByEmail(
  email: string,
): Promise<SessionUser | null> {
  if (isE2eFixtures()) {
    return fixtureFindUserByEmail(email)
  }
  const supabase = getUsersClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data ? mapUserRow(data) : null
}

export async function findUserById(id: string): Promise<SessionUser | null> {
  if (isE2eFixtures()) {
    return fixtureFindUserById(id)
  }
  const supabase = getUsersClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapUserRow(data) : null
}

export const emailLookup: FindUserByEmail = findUserByEmail
export const idLookup: FindUserById = findUserById
