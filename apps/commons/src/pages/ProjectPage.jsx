import { thesis } from '../lib/mockData'

export default function ProjectPage() {
  const artifacts = ['research paper', 'policy brief', 'public explainer', 'hostile reviewer memo', 'FAQ', 'manifesto', 'grant proposal']
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">Public Project Page</h2>
    <p><strong>Thesis:</strong> {thesis.title}</p>
    <p><strong>Summary:</strong> {thesis.core_question}</p>
    <p><strong>Epistemic status:</strong> {thesis.epistemic_status}</p>
    <div><strong>Artifacts:</strong> {artifacts.join(' · ')}</div>
    <div className="border border-slate-800 rounded p-3">
      <h3 className="font-semibold">Recognition Commons</h3>
      <p>Simulated donations: $3,200 across 41 supporters.</p>
      <p className="text-amber-300">“Donations signal recognition, not validity.”</p>
      <p>Anti-plutocracy placeholder: quadratic weighting + donor caps + audit trail.</p>
    </div>
  </section>
}
