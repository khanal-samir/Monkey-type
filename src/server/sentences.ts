import { createServerFn } from '@tanstack/react-start'
import { requireAdmin, requireExistingUser } from '#/domain/access'
import { pickSentence } from '#/domain/sentence-bank'
import { findUserById } from '#/lib/users/repo'
import {
  createSentence,
  listSentences,
  updateSentence,
} from '#/lib/sentences/repo'
import { assertSupabaseConfigured } from '#/lib/users/repo'

function accessDeps() {
  return { findUserById }
}

export const pickActiveSentence = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireExistingUser(data.userId, accessDeps())
    const active = await listSentences({ activeOnly: true })
    const sentence = pickSentence(active)
    return { sentence }
  })

export const listAllSentences = createServerFn({ method: 'POST' })
  .validator((data: { adminUserId: string }) => data)
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())
    const sentences = await listSentences()
    return { sentences }
  })

export const createSentenceFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      adminUserId: string
      text: string
      isActive?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())
    const sentence = await createSentence({
      text: data.text,
      isActive: data.isActive,
    })
    return { sentence }
  })

export const updateSentenceFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      adminUserId: string
      sentenceId: string
      text?: string
      isActive?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())
    const sentence = await updateSentence({
      id: data.sentenceId,
      text: data.text,
      isActive: data.isActive,
    })
    return { sentence }
  })
