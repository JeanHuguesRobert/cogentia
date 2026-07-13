import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Snapshot from './pages/Snapshot'
import Submit from './pages/Submit'
import Results from './pages/Results'
import History from './pages/History'
import Docs from './pages/Docs'
import Auth from './pages/Auth'

function Layout({ children }) {
  const links = [
    { to: '/', label: 'Accueil' },
    { to: '/snapshot', label: 'Mon miroir' },
    { to: '/history', label: 'Historique' },
    { to: '/docs', label: 'Comprendre' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <NavLink to="/" className="font-display font-semibold text-bright">KYS — miroir agentique</NavLink>
          <nav className="flex gap-4 text-sm overflow-x-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => isActive ? 'text-bright' : 'text-dim hover:text-bright'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/snapshot" element={<Layout><Snapshot /></Layout>} />

      {/* Parcours avancé historique, conservé pendant la transition du MVP. */}
      <Route path="/submit" element={<Layout><Submit /></Layout>} />
      <Route path="/results/:id" element={<Layout><Results /></Layout>} />
      <Route path="/history" element={<Layout><History /></Layout>} />
      <Route path="/docs" element={<Layout><Docs /></Layout>} />
      <Route path="/auth" element={<Layout><Auth /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
