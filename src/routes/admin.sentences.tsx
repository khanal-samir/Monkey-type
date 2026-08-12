import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  createSentenceFn,
  listAllSentences,
  updateSentenceFn,
} from '#/server/sentences'
import type { Sentence } from '#/domain/sentence-bank'
import { APP_NAME } from '#/lib/app-brand'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/admin/sentences')({
  component: AdminSentencesPage,
})

function AdminSentencesPage() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const listFn = useServerFn(listAllSentences)
  const createFn = useServerFn(createSentenceFn)
  const updateFn = useServerFn(updateSentenceFn)

  const [sentences, setSentences] = useState<Sentence[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editActive, setEditActive] = useState(true)

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      void navigate({ to: '/login' })
      return
    }
    if (!user.isAdmin) {
      void navigate({ to: '/' })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const result = await listFn({ data: { adminUserId: user.id } })
        if (!cancelled) setSentences(result.sentences)
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load sentences.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, user, listFn, navigate])

  if (!hydrated || !user?.isAdmin) {
    return (
      <main className="admin-page mx-auto flex min-h-screen max-w-3xl items-center p-8">
        <p className="text-neutral-400">Loading…</p>
      </main>
    )
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setPending(true)
    try {
      const result = await createFn({
        data: { adminUserId: user.id, text, isActive: true },
      })
      setSentences((prev) => [...prev, result.sentence])
      setText('')
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create sentence.',
      )
    } finally {
      setPending(false)
    }
  }

  async function onSaveEdit(target: Sentence) {
    setFormError(null)
    setPending(true)
    try {
      const result = await updateFn({
        data: {
          adminUserId: user.id,
          sentenceId: target.id,
          text: editText,
          isActive: editActive,
        },
      })
      setSentences((prev) =>
        prev.map((s) => (s.id === result.sentence.id ? result.sentence : s)),
      )
      setEditingId(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to update sentence.',
      )
    } finally {
      setPending(false)
    }
  }

  async function toggleActive(target: Sentence) {
    setFormError(null)
    setPending(true)
    try {
      const result = await updateFn({
        data: {
          adminUserId: user.id,
          sentenceId: target.id,
          isActive: !target.isActive,
        },
      })
      setSentences((prev) =>
        prev.map((s) => (s.id === result.sentence.id ? result.sentence : s)),
      )
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to update sentence.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="admin-page mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            <Link to="/" className="underline-offset-2 hover:underline">
              ← {APP_NAME}
            </Link>
            {' · '}
            <Link
              to="/admin/users"
              className="underline-offset-2 hover:underline"
            >
              Users
            </Link>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--fg)]">
            Sentences
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Active sentences feed the typing bank. Inactive ones are never
            picked.
          </p>
        </div>
      </header>

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--error)]">
          {loadError}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-[var(--fg)]">Add sentence</h2>
        <form onSubmit={onCreate} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--fg)]">Text</span>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              className="admin-input rounded border px-3 py-2 outline-none"
              placeholder="A clear sentence for players to type…"
            />
          </label>
          {formError ? (
            <p role="alert" className="text-sm text-[var(--error)]">
              {formError}
            </p>
          ) : null}
          <div>
            <button
              type="submit"
              disabled={pending}
              className="admin-primary rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Create sentence'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--fg)]">
          Bank ({sentences.length})
        </h2>
        <ul className="admin-list mt-3 divide-y border-y">
          {sentences.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 py-4">
              {editingId === s.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={3}
                    value={editText}
                    onChange={(ev) => setEditText(ev.target.value)}
                    className="admin-input rounded border px-2 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-[var(--fg)]">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(ev) => setEditActive(ev.target.checked)}
                    />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onSaveEdit(s)}
                      className="admin-primary rounded px-3 py-1.5 text-xs font-medium"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="admin-ghost rounded border px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[var(--fg)]">{s.text}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                      {s.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void toggleActive(s)}
                      className="admin-ghost rounded border px-3 py-1.5 text-xs"
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.id)
                        setEditText(s.text)
                        setEditActive(s.isActive)
                      }}
                      className="admin-ghost rounded border px-3 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
