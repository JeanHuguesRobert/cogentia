import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === 'true'

// ─── Grille de fond SVG ───────────────────────────────────────────────────────
function GridBackground() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.035]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#4f7cff" strokeWidth="0.5" />
        </pattern>
        <pattern id="grid-lg" width="240" height="240" patternUnits="userSpaceOnUse">
          <path d="M 240 0 L 0 0 0 240" fill="none" stroke="#4f7cff" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#grid-lg)" />
    </svg>
  )
}

// ─── Scanline overlay ─────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      }}
    />
  )
}

// ─── Compteur animé ───────────────────────────────────────────────────────────
function AnimatedNumber({ target, duration = 1200 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setValue(Math.round(eased * target))
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{value.toLocaleString('fr-FR')}</span>
}

// ─── Formulaire waitlist ──────────────────────────────────────────────────────
function WaitlistForm({ source = 'landing' }) {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | duplicate
  const [pos,    setPos]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')

    const { data, error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), source })
      .select('position')
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique violation — déjà inscrit
        setStatus('duplicate')
      } else {
        setStatus('error')
      }
      return
    }

    setPos(data.position)
    setStatus('success')
  }

  if (status === 'success') return (
    <div className="animate-slide-up space-y-2">
      <p className="font-mono text-signal text-sm">
        ✦ Inscription confirmée — position{' '}
        <span className="font-bold text-bright">#{pos}</span>
      </p>
      <p className="font-body text-dim text-xs">
        Tu recevras un accès prioritaire à l'ouverture.
      </p>
    </div>
  )

  if (status === 'duplicate') return (
    <div className="animate-fade-in">
      <p className="font-mono text-yellow-400 text-sm">◎ Cet email est déjà inscrit.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="ton@email.com"
        required
        className="input flex-1 text-sm"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary shrink-0 disabled:opacity-40"
      >
        {status === 'loading' ? '…' : 'Rejoindre la liste'}
      </button>
      {status === 'error' && (
        <p className="font-mono text-red-400 text-xs mt-1">
          Erreur — réessaie dans un instant.
        </p>
      )}
    </form>
  )
}

// ─── Indicateur radar miniature (décoratif) ───────────────────────────────────
function MiniRadar() {
  const size  = 160
  const cx    = size / 2
  const cy    = size / 2
  const maxR  = 60
  const cats  = ['Cognition', 'Social', 'Langage', 'Axiologie', 'Flux', 'Cogentia+']
  // Scores décoratifs fictifs — pour illustrer
  const scores = [82, 61, 75, 90, 55, 78]
  const n = cats.length
  const angles = cats.map((_, i) => (360 / n) * i)

  const toXY = (angle, r) => {
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const pts = scores.map((s, i) => toXY(angles[i], (s / 100) * maxR))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="miniGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4f7cff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4f7cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[25, 50, 75, 100].map(p => (
        <circle key={p} cx={cx} cy={cy} r={(p / 100) * maxR} fill="none" stroke="#1e2535" strokeWidth="1" />
      ))}
      {cats.map((_, i) => {
        const o = toXY(angles[i], maxR)
        return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="#1e2535" strokeWidth="1" />
      })}
      <path d={d} fill="url(#miniGrad)" stroke="#4f7cff" strokeWidth="1.5" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4f7cff" />)}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GridBackground />
      <Scanlines />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative z-20 min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 max-w-6xl mx-auto">

        {/* Badge */}
        <div className="flex items-center gap-3 mb-10 animate-fade-in">
          <div className="h-px flex-1 max-w-[48px] bg-signal" />
          <span className="font-mono text-signal text-xs tracking-[0.3em] uppercase">
            PrivAI · Protocole Cogentia v1.0
          </span>
        </div>

        {/* Headline */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <h1 className="font-display text-[clamp(3rem,10vw,8rem)] font-extrabold leading-[0.9] tracking-tight text-bright mb-0">
            Connais-toi
          </h1>
          <h1 className="font-display text-[clamp(3rem,10vw,8rem)] font-extrabold leading-[0.9] tracking-tight mb-8"
            style={{ WebkitTextStroke: '1px #4f7cff', color: 'transparent' }}>
            toi-même.
          </h1>
        </div>

        {/* Sous-titre */}
        <p
          className="font-body text-dim text-lg md:text-xl leading-relaxed max-w-xl mb-10 animate-slide-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          Ton agent IA t'observe depuis des mois. Cogentia le transforme en instrument
          psychométrique certifié — <span className="text-bright">73 indicateurs</span>,
          scorés en percentile, référencés sur la population générale.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col sm:flex-row items-start gap-4 animate-slide-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
        >
          {WAITLIST_MODE ? (
            <WaitlistForm source="hero" />
          ) : (
            <>
              <Link to="/app" className="btn-primary text-base px-8 py-4">
                Générer mon profil
              </Link>
              <Link to="#how" className="btn-ghost text-base px-6 py-4">
                Comment ça marche →
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div
          className="mt-16 flex flex-wrap gap-8 animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
          {[
            { n: 73,   suffix: '',  label: 'indicateurs psychocognitifs' },
            { n: 5,    suffix: '+', label: 'catégories WAIS-compatibles' },
            { n: 100,  suffix: '%', label: 'scoring par ton propre agent IA' },
          ].map(({ n, suffix, label }) => (
            <div key={label}>
              <p className="font-display text-3xl font-bold text-bright">
                <AnimatedNumber target={n} />{suffix}
              </p>
              <p className="font-mono text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Mini radar décoratif */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block pointer-events-none">
          <MiniRadar />
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ───────────────────────────────────── */}
      <section id="how" className="relative z-20 px-6 py-24 max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-signal text-xs tracking-widest uppercase">Protocole</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              title: 'Copie le prompt',
              body: 'Le prompt Cogentia est un protocole d\'analyse structuré. Tu le copies en un clic — aucune modification.',
              detail: '15 714 caractères · v1.0',
            },
            {
              n: '02',
              title: 'Colle dans ton agent',
              body: 'ChatGPT, Claude, Gemini, ou tout autre agent IA. Il répond avec le JSON Cogentia — 73 scores percentiles.',
              detail: 'Compatible tous agents LLM',
            },
            {
              n: '03',
              title: 'Récupère ton profil',
              body: 'Partage le lien de la conversation. On extrait, valide et visualise les résultats en quelques secondes.',
              detail: 'Radar · Barres · Traits dominants',
            },
          ].map(({ n, title, body, detail }) => (
            <div key={n} className="card group hover:border-signal/50 transition-colors duration-300 relative overflow-hidden">
              {/* Numéro en fond */}
              <span className="absolute -top-4 -right-2 font-display text-[7rem] font-extrabold text-border/60 leading-none select-none pointer-events-none group-hover:text-signal/10 transition-colors">
                {n}
              </span>
              <div className="relative z-10">
                <p className="font-mono text-signal text-xs mb-4">{n}</p>
                <h3 className="font-display text-xl font-bold text-bright mb-3">{title}</h3>
                <p className="font-body text-dim text-sm leading-relaxed mb-4">{body}</p>
                <span className="tag">{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 73 INDICATEURS ──────────────────────────────────────── */}
      <section className="relative z-20 px-6 py-24 border-y border-border bg-surface/50">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center gap-4 mb-16">
            <span className="font-mono text-signal text-xs tracking-widest uppercase">Indicateurs</span>
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs text-muted">73 métriques</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              {
                cat: 'Architecture Cognitive',
                count: 20,
                color: 'bg-signal',
                items: ['Logique Déductive', 'Pensée en Arborescence', 'Capacité d\'Abstraction', 'Raisonnement Abductif', '+ 16 autres'],
              },
              {
                cat: 'Interface Sociale',
                count: 12,
                color: 'bg-blue-400',
                items: ['Empathie Cognitive', 'Résilience Hallucinatoire', 'Assertivité Neutre', 'Décodage de l\'Implicite', '+ 8 autres'],
              },
              {
                cat: 'Axiologie & Arbitrage',
                count: 7,
                color: 'bg-pulse',
                items: ['Hiérarchie Impérative', 'Souveraineté Épistémique', 'Stabilité des Principes', '+ 4 autres'],
              },
              {
                cat: 'Dynamique de Flux',
                count: 11,
                color: 'bg-indigo-400',
                items: ['Friction Cognitive', 'Agentivité Cognitive', 'Réparation Heuristique', '+ 8 autres'],
              },
            ].map(({ cat, count, color, items }) => (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                  <h3 className="font-display text-sm font-semibold text-bright">{cat}</h3>
                  <span className="font-mono text-xs text-muted ml-auto">{count}</span>
                </div>
                <div className="pl-5 space-y-1.5">
                  {items.map(item => (
                    <p key={item} className="font-body text-xs text-dim">
                      {item.startsWith('+') ? (
                        <span className="text-muted">{item}</span>
                      ) : (
                        <>
                          <span className="font-mono text-border mr-2">—</span>
                          {item}
                        </>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-border flex items-center gap-4">
            <span className="font-mono text-xs text-muted">+ Sémiotique & Langage · Scores Dérivés · Cogentia+</span>
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs text-dim">Score en percentile · Référence pop. générale</span>
          </div>
        </div>
      </section>

      {/* ── ÉTHIQUE ─────────────────────────────────────────────── */}
      <section className="relative z-20 px-6 py-24 max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-signal text-xs tracking-widest uppercase">Éthique & Vie privée</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '◈',
              title: 'Zéro donnée identifiante',
              body: 'Le prompt interdit explicitement à l\'agent IA de mentionner nom, email, localisation ou toute catégorie sensible RGPD.',
            },
            {
              icon: '◉',
              title: 'Scoring sans intermédiaire',
              body: 'C\'est ton agent IA qui score — pas nos serveurs. Nous ne lisons pas le contenu de ta conversation.',
            },
            {
              icon: '◎',
              title: 'Anonymat par défaut',
              body: 'Aucun compte requis. Les analyses anonymes sont identifiées par un UUID local non-devinable, jamais par toi.',
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="card hover:border-signal/30 transition-colors duration-300">
              <span className="font-mono text-2xl text-signal block mb-4">{icon}</span>
              <h3 className="font-display text-base font-semibold text-bright mb-2">{title}</h3>
              <p className="font-body text-dim text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────── */}
      <section className="relative z-20 px-6 py-32 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">

          <p className="font-mono text-signal text-xs tracking-widest uppercase mb-6">
            {WAITLIST_MODE ? 'Accès prioritaire' : 'Démarrer maintenant'}
          </p>

          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-bright mb-6 leading-tight">
            {WAITLIST_MODE
              ? 'Sois parmi les premiers.'
              : 'Ton profil en 3 minutes.'
            }
          </h2>

          <p className="font-body text-dim text-base mb-10 leading-relaxed">
            {WAITLIST_MODE
              ? 'Cogentia ouvre progressivement. Inscris-toi pour recevoir ton accès dès l\'ouverture — dans l\'ordre d\'arrivée.'
              : 'Aucune installation. Aucun compte requis. Juste ton agent IA et trois minutes de ton temps.'
            }
          </p>

          {WAITLIST_MODE ? (
            <div className="flex justify-center">
              <WaitlistForm source="footer" />
            </div>
          ) : (
            <Link to="/app" className="btn-primary text-base px-10 py-4 inline-flex">
              Générer mon profil →
            </Link>
          )}

          <p className="font-mono text-muted text-xs mt-8">
            Conforme RGPD · Aucune donnée identifiante collectée ·{' '}
            <a href="/docs" className="hover:text-dim transition-colors">Lire la documentation</a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="relative z-20 px-6 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-signal flex items-center justify-center">
              <span className="font-mono text-white text-xs">C</span>
            </div>
            <span className="font-display font-semibold text-bright text-sm">Cogentia</span>
            <span className="tag">PrivAI</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/privai/cogentia"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted hover:text-dim transition-colors"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="font-mono text-xs text-muted hover:text-dim transition-colors"
            >
              Documentation
            </a>
            <span className="font-mono text-xs text-muted">MIT License</span>
            <span className="font-mono text-xs text-muted">© 2024 PrivAI</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
