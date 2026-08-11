import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createUser, listUsers, updateUser } from '#/server/users'
import type { SessionUser } from '#/domain/auth'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const listUsersFn = useServerFn(listUsers)
  const createUserFn = useServerFn(createUser)
  const updateUserFn = useServerFn(updateUser)

  const [users, setUsers] = useState<SessionUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')

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
        const result = await listUsersFn({ data: { adminUserId: user.id } })
        if (!cancelled) setUsers(result.users)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load users.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, user, listUsersFn, navigate])

  if (!hydrated || !user?.isAdmin) {
    return (
      <main className="admin-page mx-auto flex min-h-screen max-w-3xl items-center p-8">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    )
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setPending(true)
    try {
      const result = await createUserFn({
        data: {
          adminUserId: user.id,
          email,
          username: username.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        },
      })
      setUsers((prev) => [...prev, result.user])
      setEmail('')
      setUsername('')
      setAvatarUrl('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setPending(false)
    }
  }

  async function onSaveEdit(target: SessionUser) {
    setFormError(null)
    setPending(true)
    try {
      const result = await updateUserFn({
        data: {
          adminUserId: user.id,
          userId: target.id,
          username: editUsername,
          avatarUrl: editAvatarUrl,
        },
      })
      setUsers((prev) => prev.map((u) => (u.id === result.user.id ? result.user : u)))
      setEditingId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user.')
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
              ← Monkey Type
            </Link>
            {' · '}
            <Link
              to="/admin/sentences"
              className="underline-offset-2 hover:underline"
            >
              Sentences
            </Link>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--fg)]">
            Users
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Add anyone who should be able to sign in. Username defaults from
            email; avatar URL optional or auto-generated.
          </p>
        </div>
      </header>

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--error)]">
          {loadError}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-[var(--fg)]">Add user</h2>
        <form onSubmit={onCreate} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--fg)]">Email (required)</span>
            <input
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="admin-input rounded border px-3 py-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--fg)]">Username (optional)</span>
            <input
              type="text"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              className="admin-input rounded border px-3 py-2 outline-none"
              placeholder="Defaults from email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--fg)]">Avatar URL (optional)</span>
            <input
              type="url"
              value={avatarUrl}
              onChange={(ev) => setAvatarUrl(ev.target.value)}
              className="admin-input rounded border px-3 py-2 outline-none"
              placeholder="Leave blank to generate"
            />
          </label>
          {formError ? (
            <p role="alert" className="text-sm text-[var(--error)] sm:col-span-2">
              {formError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="admin-primary rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--fg)]">
          Roster ({users.length})
        </h2>
        <ul className="admin-list mt-3 divide-y border-y">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full bg-[var(--surface)]"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--fg)]">
                    {u.username.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--fg)]">
                    {u.username}
                    {u.isAdmin ? (
                      <span className="ml-2 text-xs font-normal uppercase tracking-wide text-[var(--muted)]">
                        admin
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-[var(--muted)]">{u.email}</p>
                </div>
              </div>

              {editingId === u.id ? (
                <div className="flex w-full max-w-sm flex-col gap-2">
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(ev) => setEditUsername(ev.target.value)}
                    className="admin-input rounded border px-2 py-1.5 text-sm"
                    placeholder="Username"
                  />
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(ev) => setEditAvatarUrl(ev.target.value)}
                    className="admin-input rounded border px-2 py-1.5 text-sm"
                    placeholder="Avatar URL"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onSaveEdit(u)}
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(u.id)
                    setEditUsername(u.username)
                    setEditAvatarUrl(u.avatarUrl ?? '')
                  }}
                  className="admin-ghost self-start rounded border px-3 py-1.5 text-xs"
                >
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
