import {
  createSupabaseClient,
  isSupabaseConfigured,
  type DohoroSupabase,
} from '#/lib/supabase/client'
import { mapUserRow } from '#/lib/users/map'
import type { SessionUser } from '#/domain/auth'
import type { FindUserByEmail } from '#/domain/auth'
import type { FindUserById } from '#/domain/access'

const CONFIG_ERROR =
  'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(CONFIG_ERROR)
  }
}

export function getUsersClient(): DohoroSupabase {
  assertSupabaseConfigured()
  return createSupabaseClient()
}

export async function findUserByEmail(
  email: string,
): Promise<SessionUser | null> {
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
