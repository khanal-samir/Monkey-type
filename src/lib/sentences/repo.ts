import { createSupabaseClient } from '#/lib/supabase/client'
import { assertSupabaseConfigured } from '#/lib/users/repo'
import { isE2eFixtures } from '#/lib/e2e/env'
import {
  fixtureCreateSentence,
  fixtureFindSentenceById,
  fixtureListSentences,
  fixtureUpdateSentence,
} from '#/lib/e2e/fixture-store'
import { mapSentenceRow } from './map'
import type { Sentence } from '#/domain/sentence-bank'

export async function listSentences(options?: {
  activeOnly?: boolean
}): Promise<Sentence[]> {
  assertSupabaseConfigured()
  if (isE2eFixtures()) {
    return fixtureListSentences(options)
  }
  const supabase = createSupabaseClient()
  let query = supabase
    .from('sentences')
    .select('*')
    .order('created_at', { ascending: true })

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapSentenceRow)
}

export async function findSentenceById(id: string): Promise<Sentence | null> {
  assertSupabaseConfigured()
  if (isE2eFixtures()) {
    return fixtureFindSentenceById(id)
  }
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapSentenceRow(data) : null
}

export async function createSentence(input: {
  text: string
  isActive?: boolean
}): Promise<Sentence> {
  assertSupabaseConfigured()
  if (isE2eFixtures()) {
    return fixtureCreateSentence(input)
  }
  const supabase = createSupabaseClient()
  const text = input.text.trim()
  if (!text) throw new Error('Sentence text is required.')

  const { data, error } = await supabase
    .from('sentences')
    .insert({
      text,
      is_active: input.isActive ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapSentenceRow(data)
}

export async function updateSentence(input: {
  id: string
  text?: string
  isActive?: boolean
}): Promise<Sentence> {
  assertSupabaseConfigured()
  if (isE2eFixtures()) {
    return fixtureUpdateSentence(input)
  }
  const supabase = createSupabaseClient()

  const patch: {
    text?: string
    is_active?: boolean
    updated_at?: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (input.text !== undefined) {
    const trimmed = input.text.trim()
    if (!trimmed) throw new Error('Sentence text is required.')
    patch.text = trimmed
  }

  if (input.isActive !== undefined) {
    patch.is_active = input.isActive
  }

  const { data, error } = await supabase
    .from('sentences')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error('Sentence not found.')
  return mapSentenceRow(data)
}
