/**
 * Living Book Factory — Scaffolder
 * Generates the clean, minimal, non-centralized static shell for a new Living Book.
 * Invariant: Never overwrites existing customized project files unless force: true is specified.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';

export function scaffoldLivingBook(manifest, targetDir, options = {}) {
  const force = Boolean(options.force);
  const createdFiles = [];
  const skippedFiles = [];
  const createdDirs = [];

  const absDir = path.resolve(targetDir);

  function ensureDir(sub) {
    const d = sub ? path.join(absDir, sub) : absDir;
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
      createdDirs.push(path.relative(absDir, d) || '.');
    }
  }

  function writeFile(relPath, content) {
    const full = path.join(absDir, relPath);
    ensureDir(path.dirname(relPath));
    if (fs.existsSync(full) && !force) {
      skippedFiles.push(relPath);
      return;
    }
    fs.writeFileSync(full, content, 'utf8');
    createdFiles.push(relPath);
  }

  // 1. Directory Structure
  ensureDir('');
  ensureDir('manuscript');
  ensureDir('magazine');
  ensureDir('annexes');
  ensureDir('projections');
  ensureDir('journals');
  ensureDir('editions');
  ensureDir('deploy');
  ensureDir('site');

  const declaredExts = manifest.extensions || [];
  if (manifest.magazine?.mode === 'federated' || manifest.magazine?.mode === 'hybrid') {
    ensureDir('magazine/federated');
  }
  if (declaredExts.includes('chronology')) {
    ensureDir('chronology');
  }
  if (declaredExts.includes('cases')) {
    ensureDir('cases');
  }
  if (declaredExts.includes('people-registry')) {
    ensureDir('people');
  }
  if (declaredExts.includes('accounting')) {
    ensureDir('accounting');
  }
  if (declaredExts.includes('living-book-press')) {
    ensureDir('press');
  }

  const {
    id = 'living-book',
    title = 'Living Book',
    subtitle = '',
    canonical_host = `${id}.acorsica.org`,
    language = 'fr',
    description = ''
  } = manifest.book || {};

  const {
    publisher = 'C.O.R.S.I.C.A.',
    research_unit = 'Institut Mariani',
    license = 'CC BY-SA 4.0'
  } = manifest.institution || {};

  const isJanus = Boolean(manifest.editorial?.janus);

  // 2. Manifest file
  writeFile('living-book.yml', jsYaml.dump(manifest));

  // 3. README.md
  writeFile('README.md', `---
title: "${title}"
subtitle: "${subtitle}"
description: "${description}"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "${research_unit} / ${publisher}"
date: "${new Date().toISOString().split('T')[0]}"
version: "0.1"
status: "working-paper"
license: "${license}"
language: "${language}"
canonical_url: "https://${canonical_host}/"
document_role: "project"
document_kind: "project-index"
visibility: "public"
lifecycle_state: "working"
---

# ${title}

${subtitle ? `> *${subtitle}*\n` : ''}
${description ? `${description}\n` : ''}

## 1. Nature de l'objet : un Livre Vivant

Ce projet applique la doctrine du **Livre Vivant** (*JeanHuguesRobert/barons-Mariani/research/livre_vivant.md*).

Ce n'est ni un simple livre électronique mis à jour, ni un fil sans mémoire : c'est un **Corpus d'enquête et de recherche relié au Réel**. Il produit des projections lisibles continues et peut sceller périodiquement des **éditions figées et immuables**.

- **Le fond a une mémoire obligatoire** : toute révision ou correction est un contenu de premier ordre, tracé avec sa provenance.
- **La forme a une liberté permanente** : chaque projection ou édition peut adapter sa maquette et ses styles sans réécrire l'histoire des formes.

## 2. Le triptyque éditorial

> **Le corps principal raconte. Le magazine actualise. Les annexes démontrent.**

- **Livre (Manuscrit durable)** : synthèse de fond, récit, concepts et modélisations articulées.
- **Magazine (Deltas vivants)** : actualité de la recherche, veille, controverses, réponses du Réel et flux fédéré.
- **Annexes & Sources (Preuves)** : pièces justificatives, actes, études de cas, protocoles et chronologie.

## 3. Navigation et surfaces du projet

- [Manuscrit du Livre](manuscript/README.md)
- [Magazine](magazine/README.md)
- [Architecture technique](architecture.md)
- [Architecture éditoriale](editorial-architecture.md)
- [Registre des éditions](editions/index.md)
- [Manifeste de corpus](corpus.yml)
- [Profil Guide](guide-profile.yml)
- [Projection publique (Site)](site/index.html)
`);

  // 4. corpus.yml
  writeFile('corpus.yml', `schema: ${id}.corpus.v0
project: "${title}"
slug: ${id}
status: working
language: ${language}
visibility: public
updated: "${new Date().toISOString().split('T')[0]}"
source_of_truth: "repository files under projects/${id}, and the referenced sources; this manifest points at them and does not replace them"
target_identity: "https://${canonical_host}"
target_identity_status: "prepared name only; workstation DNS check did not resolve ${canonical_host}; not a live deployment and not a frozen edition"
institutional_frame: "${research_unit} / ${publisher}, 1 cours Paoli, F-20250 Corte, Corsica"

architecture:
  implementation: projects/${id}/architecture.md
  editorial: projects/${id}/editorial-architecture.md
  project_index: projects/${id}/README.md
  manuscript: projects/${id}/manuscript/
  magazine: projects/${id}/magazine/
  annexes: projects/${id}/annexes/
  editions: projects/${id}/editions/index.md
  projections: projects/${id}/projections/
  deploy: projects/${id}/deploy/README.md
  guide_profile: projects/${id}/guide-profile.yml
  site: projects/${id}/site/

realities:
  - id: public-host
    status: prepared
    statement: "The hostname ${canonical_host} is prepared. Deployment architecture documented in deploy/README.md. Operium owns deployment authority."
  - id: janus-separation
    status: ${isJanus ? 'active' : 'inactive'}
    statement: "${isJanus ? 'Past documentary reconstruction and future prospective scenarios follow strictly distinct proof regimes.' : 'Standard single temporality.'}"

sources:
  - id: livre-vivant
    path: research/livre_vivant.md
    role: editorial-grammar
    required: true
`);

  // 5. editorial-architecture.md
  writeFile('editorial-architecture.md', `---
title: "${title} — Architecture éditoriale"
subtitle: "Publication continue, éditions immuables, asymétrie fond/forme et triptyque éditorial"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "${research_unit} / ${publisher}, 1 cours Paoli, F-20250 Corte, Corsica"
date: "${new Date().toISOString().split('T')[0]}"
version: "0.1"
status: "working-paper"
language: "${language}"
license: "${license}"
document_role: "editorial-architecture"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
---

# ${title} — Architecture éditoriale

## 1. Modèle général

\`\`\`text
Traces primaires / archives / contributions du Réel
  │
  ▼
Qualification critique et intégration au Corpus vivant
  │
  ▼
Intention éditoriale et sélection
  │
  ▼
Projection candidate (Livre / Magazine / Annexes)
  │
  ▼
Contrôles de couverture et revue
  │
  ▼
FREEZE (déclaration datée, commit source scellé, empreintes SHA-256)
  │
  ▼
Édition immuable (HTML, PDF, EPUB, tirage papier singulier)
  │
  ▼
Réponses du Réel / traces ultérieures
  │
  ▼
Retour au Corpus vivant sans réécriture de l'édition gelée
\`\`\`

Règle absolue :
> **Freeze the edition, never the next projection.**

## 2. Asymétrie éditoriale

> **Le contenu nouveau est contraint par l'histoire du contenu ; la forme nouvelle n'est pas contrainte par l'histoire des formes.**

- **Continuité épistémique du fond** : les corrections sont du contenu de premier ordre. Une erreur découverte n'est jamais effacée furtivement.
- **Liberté esthétique de la forme** : chaque projection peut réinventer sa mise en page, sa typographie et son découpage.

## 3. Triptyque fonctionnel

> **Le corps principal raconte. Le magazine actualise. Les annexes démontrent.**

- **Livre** : récit et synthèse durable.
- **Magazine** : deltas, chroniques et flux fédéré.
- **Annexes** : corpus de preuves, méthodologies, sources.

${isJanus ? `## 4. Double temporality Janus (Passé / Futur)

Ce Livre Vivant adopte une architecture explicitement janusienne :

\`\`\`text
PASSÉ
→ Reconstitution historique, archives documentées, causalités prouvées

JANUS (Frontière étanche des régimes de preuve)

FUTUR
→ Scénarios possibilistes, hypothèses, Reality Tests et capacités à ouvrir
\`\`\`

> **Le passé se prouve par traces et documents ; le futur s'explore par hypothèses falsifiables et épreuves du Réel. Leurs régimes de preuve ne doivent jamais être fusionnés silencieusement.**
` : ''}

## ${isJanus ? '5' : '4'}. Frontière de contribution et non-substitution

Le lecteur ou contributeur peut proposer des corrections, objections ou traces via les surfaces dédiées (\`site/contribuer.html\`).
Ces propositions ne deviennent des modifications du Corpus qu'après qualification et Acte éditorial humain explicite.
`);

  // 6. architecture.md
  writeFile('architecture.md', `---
title: "${title} — Architecture technique"
subtitle: "Structure des dossiers, contrats de projection et outillage d'inspection"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "${research_unit} / ${publisher}"
date: "${new Date().toISOString().split('T')[0]}"
version: "0.1"
status: "working-paper"
language: "${language}"
license: "${license}"
---

# ${title} — Architecture technique

## 1. Arborescence du projet

\`\`\`text
projects/${id}/
├── README.md                  # Entrée générale du projet
├── living-book.yml            # Manifeste déclaratif living-book/v1
├── corpus.yml                 # Manifeste de corpus
├── architecture.md            # Spécification technique
├── editorial-architecture.md  # Doctrine éditoriale et régimes de preuve
├── guide-profile.yml          # Profil d'inférence Cogentia Guide borné
├── manuscript/                # Manuscrit du Livre
├── magazine/                  # Chroniques, deltas et articles
│   └── federated/             # Items syndiqués depuis d'autres Livres Vivants
├── annexes/                   # Pièces justificatives et preuves
├── editions/                  # Registre des éditions gelées (index.md)
├── projections/               # Contrats de projection de travail
├── deploy/                    # Documentation de déploiement (Operium)
└── site/                      # Projection statique pour le Web
\`\`\`

## 2. Outillage Living Book Factory

Ce projet est inspecté et validé via l'outil \`living-book\` :

\`\`\`bash
# Valider le manifeste
node scripts/living-book.js validate projects/${id}/living-book.yml

# Inspecter la conformité doctrinale et technique
node scripts/living-book.js inspect projects/${id}/living-book.yml
\`\`\`
`);

  // 7. editions/index.md
  writeFile('editions/index.md', `---
title: "${title} — Registre des éditions"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "${research_unit} / ${publisher}"
date: "${new Date().toISOString().split('T')[0]}"
language: "${language}"
---

# Registre des éditions — ${title}

## Statut courant

- **Éditions gelées :** Aucune édition n'est encore gelée.
- **État actif :** Projection de travail vivante (Phase 1).

Règle du Livre Vivant :
> Une édition n'est scellée qu'après arrêt d'un jalon éditorial, vérification complète de couverture et calcul des empreintes SHA-256 des artefacts publiés.
`);

  // 8. guide-profile.yml
  writeFile('guide-profile.yml', `schema: ${id}.guide_profile.v1
profile: ${id}
name: "Guide public — ${title}"
base_url: "https://cogentia.fractavolta.com"
endpoint: "/guide/chat"
status: prepared
version: "0.1"
description: >
  Profil d'exploration publique assistée pour le Livre Vivant ${title}.
  Fournit des réponses strictement bornées au Corpus sans hallucination hors périmètre.
invariants:
  non_substitution: "Ne se substitue jamais au jugement ni aux décisions de l'utilisateur."
  strict_grounding: "Cite systématiquement ses sources parmi les fichiers listés dans le manifeste de corpus."
  no_user_retention: "N'enregistre aucune mémoire de conversation ni de profil privé sur le serveur."
  institutional_frame: "Rappelle le cadre institutionnel (${research_unit} / ${publisher}) sans confusion de personnes."
corpus_manifest: "projects/${id}/corpus.yml"
sources:
  - "projects/${id}/manuscript/README.md"
  - "projects/${id}/editorial-architecture.md"
  - "research/livre_vivant.md"
`);

  // 9. manuscript/README.md
  writeFile('manuscript/README.md', `---
title: "${title} — Manuscrit"
language: "${language}"
---

# ${title} — Manuscrit

Ce répertoire abrite la synthèse durable du Livre Vivant.

${isJanus ? `## Structure Janus

1. **Partie I — Reconstitution du Passé**
   - Documents d'archives, actes, faits établis et chronologie.
2. **Partie II — Scénarios du Futur**
   - Perspectives, hypothèses possibilistes et modèles de transformation.
` : `## Sommaire prévisionnel

1. Introduction et problématique
2. Analyse de fond
3. Perspectives et conclusions
`}
`);

  // 10. magazine/README.md
  writeFile('magazine/README.md', `---
title: "${title} — Le Magazine"
description: "Chronique continue des deltas, retours du Réel et flux fédéré."
language: "${language}"
---

# ${title} — Le Magazine

> *Le corps principal raconte. Le magazine actualise. Les annexes démontrent.*

Le Magazine accueille le delta vivant de l'enquête : nouvelles observations, veille documentaire, comptes rendus d'expériences et syndications fédérées.

## Rubriques

- **Chroniques locales :** actualité directe de la recherche.
- **Flux fédéré :** articles et deltas syndiqués depuis les Livres Vivants frères, avec préservation stricte de la provenance et de l'autorité source.
`);

  // 11. annexes/README.md
  writeFile('annexes/README.md', `---
title: "${title} — Annexes & Sources"
language: "${language}"
---

# ${title} — Annexes & Sources

> *Le corps principal raconte. Le magazine actualise. Les annexes démontrent.*

Ce dossier contient les éléments probatoires indispensables à la vérifiabilité des énoncés du Livre.
`);

  // 12. deploy/README.md
  writeFile('deploy/README.md', `---
title: "${title} — Déploiement"
language: "${language}"
---

# Architecture de déploiement — ${title}

- **Hôte cible :** \`${canonical_host}\`
- **Statut :** Nom préparé, non résolu.
- **Autorité opérationnelle :** Operium possède la responsabilité exclusive des déploiements et modifications DNS.
`);

  // 13. Static Site Pages
  const navHtml = `<header class="site">
  <p class="mark"><a href="index.html">${title}</a></p>
  <nav aria-label="Navigation principale">
    <a href="index.html">Accueil</a>
    <a href="book.html">Livre</a>
    <a href="magazine.html">Magazine</a>
    <a href="annexes.html">Annexes</a>
    <a href="contribuer.html">Contribuer</a>
    <a href="guide.html">Guide</a>
    <a href="mentions.html">Mentions</a>
  </nav>
</header>`;

  const footerHtml = `<footer>
  <p>${title} · Direction éditoriale : Jean Hugues Noël Robert, baron Mariani · ${research_unit} / ${publisher} · Licence ${license}</p>
</footer>`;

  writeFile('site/styles.css', `/* Living Book Baseline Stylesheet */
:root {
  --font-serif: Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --bg: #fcfcfb;
  --text: #1a1a1a;
  --muted: #555555;
  --border: #e0ded9;
  --accent: #9e2a2b;
  --card-bg: #ffffff;
  --callout-bg: #f4f3ef;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.6;
  margin: 0;
  padding: 0;
}

.skip {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent);
  color: white;
  padding: 8px;
  z-index: 100;
}
.skip:focus { top: 0; }

header.site {
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}
header.site .mark {
  font-family: var(--font-serif);
  font-weight: bold;
  font-size: 1.25rem;
  margin: 0;
}
header.site .mark a { color: var(--text); text-decoration: none; }
header.site nav a {
  margin-left: 1.25rem;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.95rem;
}
header.site nav a:hover, header.site nav a[aria-current="page"] {
  color: var(--accent);
  font-weight: 600;
}

main {
  max-width: 860px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}

h1, h2, h3 {
  font-family: var(--font-serif);
  line-height: 1.25;
  color: #111;
}
h1 { font-size: 2.25rem; margin-top: 0.5rem; }
h2 { font-size: 1.5rem; margin-top: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }

.pill {
  display: inline-block;
  background: var(--callout-bg);
  color: var(--muted);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lede {
  font-size: 1.15rem;
  color: #333;
}

.byline {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
}

blockquote {
  border-left: 3px solid var(--accent);
  margin: 1.5rem 0;
  padding: 0.5rem 1rem;
  font-family: var(--font-serif);
  font-style: italic;
  background: var(--callout-bg);
}

.call {
  background: var(--callout-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1.25rem;
  margin: 1rem 0;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}
.meta-item {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
}
.meta-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 0.25rem;
}

footer {
  border-top: 1px solid var(--border);
  margin-top: 4rem;
  padding: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted);
  background: #fff;
}
`);

  writeFile('site/index.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Livre Vivant</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="styles.css">
<link rel="canonical" href="https://${canonical_host}/">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu principal</a>
${navHtml.replace('href="index.html">Accueil<', 'href="index.html" aria-current="page">Accueil<')}
<main id="contenu">
  <p class="pill">Projection de travail · Non gelée</p>
  <h1>${title}</h1>
  ${subtitle ? `<p class="lede"><strong>${subtitle}</strong></p>` : ''}
  <p class="byline">Direction éditoriale : Jean Hugues Noël Robert, baron Mariani · ${research_unit} / ${publisher} · Licence ${license}</p>

  <blockquote>
    <p>« Un Livre Vivant est un Corpus qui se donne à lire, à parcourir et à interroger, tout en permettant au Réel de lui répondre par des traces imputables susceptibles de transformer ses projections futures. »</p>
  </blockquote>

  ${isJanus ? `<div class="call">
    <h3>Architecture épistémique Janus</h3>
    <p>Ce Livre Vivant maintient une séparation stricte entre deux régimes de preuve :</p>
    <ul>
      <li><strong>Le regard vers le passé (Histoire)</strong> : reconstitution empirique rigoureuse appuyée sur des documents d'archives, actes et traces sourcées.</li>
      <li><strong>Le regard vers le futur (Prospective)</strong> : exploration possibiliste, hypothèses scientifiques et scénarios ouverts testables.</li>
    </ul>
  </div>` : ''}

  <h2>Parcours de lecture</h2>
  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Le Livre</span>
      <p><strong><a href="book.html">Manuscrit durable</a></strong> : synthèse de fond et modélisations.</p>
    </div>
    <div class="meta-item">
      <span class="meta-label">Le Magazine</span>
      <p><strong><a href="magazine.html">Deltas &amp; flux fédéré</a></strong> : actualité vivante et veille.</p>
    </div>
    <div class="meta-item">
      <span class="meta-label">Preuves</span>
      <p><strong><a href="annexes.html">Annexes &amp; sources</a></strong> : corpus probatoire et méthodes.</p>
    </div>
    <div class="meta-item">
      <span class="meta-label">Assistance</span>
      <p><strong><a href="guide.html">Guide interactif</a></strong> : exploration assistée bornée au corpus.</p>
    </div>
  </div>

  <h2>Amis avant concurrents</h2>
  <p>Conformément au principe cardinal de FractaCognition, ce projet compose avec les démarches sœurs de la confédération des Livres Vivants :</p>
  <ul>
    <li><a href="https://suicidecorse.baronsmariani.org/">Suicide Corse</a> : enquête inaugurale sur les mécanismes systémiques.</li>
    <li><a href="https://riseandfall.baronsmariani.org/">Rise &amp; Fall</a> : enquête archivistique et généalogique au long cours.</li>
    <li><a href="https://diaspora.acorsica.org/">DIASPORA</a> : cartographie et réseau des capacités d'un peuple dispersé.</li>
    <li><a href="https://github.com/JeanHuguesRobert/barons-Mariani/tree/main/projects/privai">PrivAI</a> : souveraineté humaine face aux personnes morales augmentées.</li>
    <li><a href="https://github.com/JeanHuguesRobert/barons-Mariani/tree/main/projects/commons">Commons</a> : histoire, présent et futurs possibles des biens communs.</li>
  </ul>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/book.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Le Livre</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="book.html">Livre<', 'href="book.html" aria-current="page">Livre<')}
<main id="contenu">
  <h1>Le Livre — Synthèse durable</h1>
  <p class="lede">Cette section rassemble les chapitres de fond constituant le corps principal de l'ouvrage.</p>
  <div class="call">
    <p>Consulter les manuscrits sources dans <a href="https://github.com/JeanHuguesRobert/barons-Mariani/tree/main/projects/${id}/manuscript">projects/${id}/manuscript/</a>.</p>
  </div>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/magazine.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Le Magazine</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="magazine.html">Magazine<', 'href="magazine.html" aria-current="page">Magazine<')}
<main id="contenu">
  <h1>Le Magazine</h1>
  <p class="lede">Deltas vivants, chroniques d'actualité, retours du Réel et flux fédéré.</p>
  <div id="federated-feed">
    <!-- BEGIN_FEDERATED_FEED -->
    <h2>Chroniques et syndications</h2>
    <div class="card">
      <p class="byline">Flux en cours de syndication via Living Book Factory.</p>
    </div>
    <!-- END_FEDERATED_FEED -->
  </div>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/annexes.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Annexes & Sources</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="annexes.html">Annexes<', 'href="annexes.html" aria-current="page">Annexes<')}
<main id="contenu">
  <h1>Annexes &amp; Sources</h1>
  <p class="lede">Pièces justificatives, archives primaires et protocoles de preuve.</p>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/contribuer.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Contribuer</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="contribuer.html">Contribuer<', 'href="contribuer.html" aria-current="page">Contribuer<')}
<main id="contenu">
  <h1>Contribuer ou corriger</h1>
  <p class="lede">Protocole de réception des retours du Réel, objections et signalements d'erreurs.</p>
  <div class="call">
    <h3>Règle d'engagement</h3>
    <p>Une proposition de correction ou un apport de trace primaire fait l'objet d'une qualification critique. Le fond conserve la mémoire des corrections sans effacement furtif.</p>
  </div>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/guide.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Guide interactif</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="guide.html">Guide<', 'href="guide.html" aria-current="page">Guide<')}
<main id="contenu">
  <h1>Guide interactif Cogentia</h1>
  <p class="lede">Assistance à l'exploration du Corpus sous contrainte stricte de vérifiabilité.</p>
  <div class="call">
    <p>Le Guide s'appuie sur le profil <code>projects/${id}/guide-profile.yml</code>. Il cite systématiquement ses sources et refuse toute inférence non étayée.</p>
  </div>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/mentions.html', `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Mentions légales & Responsabilité</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
${navHtml.replace('href="mentions.html">Mentions<', 'href="mentions.html" aria-current="page">Mentions<')}
<main id="contenu">
  <h1>Mentions légales &amp; Responsabilité éditoriale</h1>
  <p><strong>Éditeur responsable :</strong> ${publisher} / ${research_unit}</p>
  <p><strong>Direction éditoriale :</strong> Jean Hugues Noël Robert, baron Mariani</p>
  <p><strong>Licence :</strong> ${license} (Open Commons Default)</p>
  <p><strong>Nature du site :</strong> Projection de travail publique non gelée d'un Livre Vivant.</p>
</main>
${footerHtml}
</body>
</html>
`);

  writeFile('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://${canonical_host}/index.html</loc></url>
  <url><loc>https://${canonical_host}/book.html</loc></url>
  <url><loc>https://${canonical_host}/magazine.html</loc></url>
  <url><loc>https://${canonical_host}/annexes.html</loc></url>
  <url><loc>https://${canonical_host}/contribuer.html</loc></url>
  <url><loc>https://${canonical_host}/guide.html</loc></url>
  <url><loc>https://${canonical_host}/mentions.html</loc></url>
</urlset>
`);

  writeFile('site/robots.txt', `User-agent: *
Allow: /
Sitemap: https://${canonical_host}/sitemap.xml
`);

  writeFile('site/llms.txt', `# ${title}
> ${description}

- Canonical: https://${canonical_host}/
- Corpus: https://github.com/JeanHuguesRobert/barons-Mariani/tree/main/projects/${id}
- License: ${license}
`);

  return {
    targetDir: absDir,
    createdDirs,
    createdFiles,
    skippedFiles
  };
}
