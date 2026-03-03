import { Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing  from './pages/Landing'
import Home     from './pages/Home'
import Submit   from './pages/Submit'
import Results  from './pages/Results'
import History  from './pages/History'
import Auth     from './pages/Auth'
import Docs     from './pages/Docs'

const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === 'true'

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const { user, signOut } = useAuth()
  const linkClass = ({ isActive }) =>
    `font-body text-sm transition-colors duration-150 ${
      isActive ? 'text-bright' : 'text-dim hover:text-bright'
    }`

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-void/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded bg-signal flex items-center justify-center">
            <span className="font-mono text-white text-xs font-medium">C</span>
          </span>
          <span className="font-display font-semibold text-bright tracking-tight">Cogentia</span>
          <span className="tag">PrivAI</span>
        </NavLink>
        <nav className="flex items-center gap-6">
          {!WAITLIST_MODE && (
            <>
              <NavLink to="/app"     className={linkClass}>Tester</NavLink>
              <NavLink to="/history" className={linkClass}>Historique</NavLink>
            </>
          )}
          <NavLink to="/docs" className={linkClass}>Docs</NavLink>
          {user
            ? <button onClick={signOut} className="btn-ghost text-xs">Déconnexion</button>
            : <NavLink to="/auth" className="btn-primary text-xs px-4 py-2">Connexion</NavLink>
          }
        </nav>
      </div>
    </header>
  )
}

// ─── Layout avec nav + padding top ───────────────────────────────────────────
function AppLayout() {
  return (
    <>
      <Nav />
      <div className="min-h-screen pt-14">
        <Outlet />
      </div>
    </>
  )
}

// ─── Guard waitlist ───────────────────────────────────────────────────────────
function WaitlistGuard() {
  if (WAITLIST_MODE) return <Navigate to="/" replace />
  return <Outlet />
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { loading } = useAuth()

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <span className="font-mono text-muted text-sm animate-pulse-slow">
        initialisation…
      </span>
    </div>
  )

  return (
    <Routes>
      {/* Landing — layout propre sans nav */}
      <Route path="/" element={<Landing />} />

      {/* Routes avec nav */}
      <Route element={<AppLayout />}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/docs" element={<Docs />} />

        {/* Routes protégées par le mode waitlist */}
        <Route element={<WaitlistGuard />}>
          <Route path="/app"           element={<Home />} />
          <Route path="/submit"        element={<Submit />} />
          <Route path="/results/:id"   element={<Results />} />
          <Route path="/history"       element={<History />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
