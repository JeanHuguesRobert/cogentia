import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">Personal Cogentia (KYS)</h1>
      <p className="text-slate-300">Self-knowledge side of Cogentia: generate a psychocognitive profile from your AI-agent interaction trace.</p>
      <div className="flex gap-3 text-sm">
        <Link className="underline" to="/personal/submit">Submit Analysis</Link>
        <Link className="underline" to="/personal/history">History</Link>
        <Link className="underline" to="/personal/docs">Docs</Link>
      </div>
    </section>
  )
}
