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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-neutral-500">
          <Link to="/" className="underline-offset-2 hover:underline">
            Dohoro Type
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-neutral-600">
          Enter your allowlisted company email. No password required.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-800">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-800"
            placeholder="you.dohoro@gmail.com"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
