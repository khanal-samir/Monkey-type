import { Link, useNavigate } from '@tanstack/react-router'
import type { SessionUser } from '#/domain/auth'
import { useSessionStore } from '#/session/store'

type AppHeaderProps = {
  user: SessionUser
}

function UserAvatar({ user }: { user: SessionUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={32}
        height={32}
        className="app-header-avatar"
      />
    )
  }

  return (
    <div className="app-header-avatar app-header-avatar-fallback" aria-hidden>
      {user.username.slice(0, 1).toUpperCase()}
    </div>
  )
}

function NavLink({
  to,
  children,
  exact = false,
}: {
  to: '/' | '/leaderboard' | '/profile'
  children: React.ReactNode
  exact?: boolean
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="app-nav-link"
      activeProps={{ className: 'app-nav-link app-nav-link-active' }}
    >
      {children}
    </Link>
  )
}

export function AppHeader({ user }: AppHeaderProps) {
  const navigate = useNavigate()
  const clearSession = useSessionStore((s) => s.clearSession)

  return (
    <header className="app-header">
      <div className="app-header-start">
        <Link to="/" className="brand-mark app-header-brand">
          Monkey Type
        </Link>

        <nav className="app-header-nav" aria-label="Main">
          <NavLink to="/" exact>
            Type
          </NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>

      <div className="app-header-end">
        <Link to="/profile" className="app-header-user">
          <UserAvatar user={user} />
          <span className="app-header-username">{user.username}</span>
        </Link>

        {user.isAdmin ? (
          <div className="app-header-admin">
            <Link to="/admin/users" className="app-header-admin-link">
              Users
            </Link>
            <Link to="/admin/sentences" className="app-header-admin-link">
              Sentences
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            clearSession()
            void navigate({ to: '/login' })
          }}
          className="admin-ghost app-header-logout"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
