import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { loginByEmail } from '#/server/users'
import { useSessionStore } from '#/session/store'
import { useSessionHydrated } from '#/session/use-session-hydrated'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const hydrated = useSessionHydrated()
  const user = useSessionStore((s) => s.user)
  const setUser = useSessionStore((s) => s.setUser)
  const loginFn = useServerFn(loginByEmail)

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (hydrated && user) {
      void navigate({ to: '/' })
    }
  }, [hydrated, user, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await loginFn({ data: { email } })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setUser(result.user)
      await navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setPending(false)
    }
  }

  if (!hydrated) {
    return (
      <main className="app-shell mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    )
  }

  return (
    <main className="app-shell mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-[var(--muted)]">
          <Link
            to="/"
            className="brand-mark text-base underline-offset-2 hover:underline"
          >
            Monkey Type
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fg)]">
          Sign in
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Enter your email. No password — an admin must add you first.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        data-testid="login-form"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--fg)]">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="admin-input rounded border px-3 py-2 text-base outline-none"
            placeholder="you@example.com"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-[var(--error)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="admin-primary rounded px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
