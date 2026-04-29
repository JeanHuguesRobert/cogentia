import { trace } from '../lib/mockData'
export default function TracePage(){
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">Traceability & Version History</h2>
    <table className="w-full text-sm border border-slate-800"><thead><tr><th>Version</th><th>Event</th><th>Accepted</th><th>Rejected</th><th>Unresolved</th></tr></thead>
    <tbody>{trace.map(t => <tr key={t.version} className="border-t border-slate-800"><td>{t.version}</td><td>{t.event}</td><td>{t.objectionsAccepted}</td><td>{t.objectionsRejected}</td><td>{t.unresolved}</td></tr>)}</tbody></table>
  </section>
}
