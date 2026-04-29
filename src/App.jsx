import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import PlatformIndex from './pages/PlatformIndex'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Results from './pages/Results'
import History from './pages/History'
import Docs from './pages/Docs'
import Auth from './pages/Auth'
import CommonsHome from './pages/CommonsHome'
import ThesisKernelPage from './pages/ThesisKernelPage'
import ProjectPage from './pages/ProjectPage'
import CritiquePage from './pages/CritiquePage'
import TracePage from './pages/TracePage'
import PaperPage from './pages/PaperPage'

function Layout({ title, base, links, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="font-semibold">Cogentia Platform</NavLink>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-300">{title}</span>
            <nav className="flex gap-4 text-sm">
              {links.map((l) => <NavLink key={l.to} to={`${base}${l.to}`}>{l.label}</NavLink>)}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  )
}

export default function App() {
  const personalLinks = [
    { to: '', label: 'Home' }, { to: '/submit', label: 'Submit' }, { to: '/history', label: 'History' }, { to: '/docs', label: 'Docs' }, { to: '/auth', label: 'Auth' }
  ]
  const commonsLinks = [
    { to: '', label: 'Home' }, { to: '/kernel', label: 'Thesis Kernel' }, { to: '/project', label: 'Project' }, { to: '/critique', label: 'Critique' }, { to: '/trace', label: 'Trace' }, { to: '/paper', label: 'Paper' }
  ]

  return (
    <Routes>
      <Route path="/" element={<PlatformIndex />} />

      <Route path="/personal" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><Home /></Layout>} />
      <Route path="/personal/submit" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><Submit /></Layout>} />
      <Route path="/personal/results/:id" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><Results /></Layout>} />
      <Route path="/personal/history" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><History /></Layout>} />
      <Route path="/personal/docs" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><Docs /></Layout>} />
      <Route path="/personal/auth" element={<Layout title="Personal Cogentia" base="/personal" links={personalLinks}><Auth /></Layout>} />

      <Route path="/commons" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><CommonsHome /></Layout>} />
      <Route path="/commons/kernel" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><ThesisKernelPage /></Layout>} />
      <Route path="/commons/project" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><ProjectPage /></Layout>} />
      <Route path="/commons/critique" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><CritiquePage /></Layout>} />
      <Route path="/commons/trace" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><TracePage /></Layout>} />
      <Route path="/commons/paper" element={<Layout title="Cogentia Commons" base="/commons" links={commonsLinks}><PaperPage /></Layout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
