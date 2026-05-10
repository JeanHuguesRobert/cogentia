import { thesis } from '../lib/mockData'
import { epistemicTags, categoryLegend } from '../lib/epistemicTags'

export default function ThesisKernelPage() {
  return <div className="space-y-4">
    <h2 className="text-2xl font-semibold">Create Thesis Kernel</h2>
    <div className="grid md:grid-cols-2 gap-4">
      {Object.entries(thesis).map(([k,v]) => <div key={k} className="border border-slate-800 rounded p-3">
        <div className="text-xs uppercase text-slate-400">{k.replaceAll('_',' ')}</div>
        <div>{Array.isArray(v) ? v.join(' · ') : v}</div>
      </div>)}
    </div>
    <div className="border border-slate-800 rounded p-3">
      <h3 className="font-semibold">Epistemic Status Tags</h3>
      <div className="flex flex-wrap gap-2 mt-2">{epistemicTags.map(t => <span className="text-xs px-2 py-1 rounded bg-slate-800" key={t}>{t}</span>)}</div>
    </div>
    <div className="border border-slate-800 rounded p-3">
      <h3 className="font-semibold">Semantic Distinctions</h3>
      {categoryLegend.map(([name,desc]) => <p key={name}><strong>{name}:</strong> {desc}</p>)}
    </div>
  </div>
}
