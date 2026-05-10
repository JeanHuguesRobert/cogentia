import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import CommonsHome from './pages/CommonsHome'
import ThesisKernelPage from './pages/ThesisKernelPage'
import ProjectPage from './pages/ProjectPage'
import CritiquePage from './pages/CritiquePage'
import TracePage from './pages/TracePage'
import PaperPage from './pages/PaperPage'

function Layout({ children }) {
  const links = [
    { to: '/', label: 'Home' },
    { to: '/kernel', label: 'Thesis Kernel' },
    { to: '/project', label: 'Project' },
    { to: '/critique', label: 'Critique' },
    { to: '/trace', label: 'Trace' },
    { to: '/paper', label: 'Paper' },
  ]
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="font-semibold">Cogentia — Commons</NavLink>
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
      <Route path="/" element={<Layout><CommonsHome /></Layout>} />
      <Route path="/kernel" element={<Layout><ThesisKernelPage /></Layout>} />
      <Route path="/project" element={<Layout><ProjectPage /></Layout>} />
      <Route path="/critique" element={<Layout><CritiquePage /></Layout>} />
      <Route path="/trace" element={<Layout><TracePage /></Layout>} />
      <Route path="/paper" element={<Layout><PaperPage /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
