import paper from '../../research/Cogentia_Commons_Working_Paper.md?raw'
export default function PaperPage(){
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">Working Paper</h2>
    <p>“The first object explored by Cogentia Commons is Cogentia Commons itself.”</p>
    <pre className="whitespace-pre-wrap text-xs bg-slate-900 border border-slate-800 p-3 rounded">{paper.slice(0,2800)}...</pre>
    <a href="https://github.com/JeanHuguesRobert/cogentia" className="underline">Repository context</a>
  </section>
}
