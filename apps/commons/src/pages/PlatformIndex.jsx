import { Link } from 'react-router-dom'

export default function PlatformIndex() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-6">
        <h1 className="text-4xl font-bold">Cogentia Platform</h1>
        <p className="text-slate-300">Two coordinated sides of the same idea: Personal Cogentia (self-knowledge) and Cogentia Commons (shared evolving knowledge).</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-slate-800 rounded p-4 space-y-2">
            <h2 className="text-xl font-semibold">Personal Cogentia</h2>
            <p className="text-sm text-slate-300">KYS flow: prompt, submit analysis, results, history, docs.</p>
            <Link className="underline" to="/personal">Open Personal Cogentia →</Link>
          </div>
          <div className="border border-slate-800 rounded p-4 space-y-2">
            <h2 className="text-xl font-semibold">Cogentia Commons</h2>
            <p className="text-sm text-slate-300">Collaborative thesis kernels, critique loops, and research traceability.</p>
            <Link className="underline" to="/commons">Open Cogentia Commons →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
