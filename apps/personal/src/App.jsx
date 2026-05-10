import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Results from './pages/Results'
import History from './pages/History'
import Docs from './pages/Docs'
import Auth from './pages/Auth'

function Layout({ children }) {
  const links = [
    { to: '/', label: 'Home' },
    { to: '/submit', label: 'Submit' },
    { to: '/history', label: 'History' },
    { to: '/docs', label: 'Docs' },
    { to: '/auth', label: 'Auth' },
  ]
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="font-semibold">Cogentia — Personal</NavLink>
          <nav className="flex gap-4 text-sm">
            {links.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
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
      <Route path="/submit" element={<Layout><Submit /></Layout>} />
      <Route path="/results/:id" element={<Layout><Results /></Layout>} />
      <Route path="/history" element={<Layout><History /></Layout>} />
      <Route path="/docs" element={<Layout><Docs /></Layout>} />
      <Route path="/auth" element={<Layout><Auth /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
