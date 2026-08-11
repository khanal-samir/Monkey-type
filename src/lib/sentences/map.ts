import type { Database } from '#/lib/supabase/database.types'
import type { Sentence } from '#/domain/sentence-bank'

type SentenceRow = Database['public']['Tables']['sentences']['Row']

export function mapSentenceRow(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    isActive: row.is_active,
  }
}
