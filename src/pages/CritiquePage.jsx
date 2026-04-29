import { reviews } from '../lib/mockData'
export default function CritiquePage(){
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">Multi-Agent Critique Loop</h2>
    {reviews.map(r => <div key={r.agent} className="border border-slate-800 rounded p-3"><strong>{r.agent}:</strong> {r.summary}</div>)}
  </section>
}
