---
title: The Knowledge Mesh (Decentralized Wiki)
description: How humans and agents curate, cross-reference, and navigate the Cogentia corpus.
layout: default
nav_order: 4
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/knowledge_mesh.md
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
last_stamped_at: 2026-06-01T00:00:00.000Z
date: '2026-05-16'
status: draft — auto-filled (frontmatter cleanup)
document_role: source
document_kind: guide
visibility: public
lifecycle_state: working
classification_source: cogentia.js
classification_version: '1'
classification_rule: guide
classification_confidence: medium
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# The Knowledge Mesh (Decentralized Wiki)

Cogentia is designed to operate as a seamless, decentralized "Wikipedia" across multiple repositories (`cogentia`, `FractaVolta`, `marenostrum`, etc.).

To maintain semantic coherence without relying on external databases, `cogentia.js` v2 builds a structural map directly from the Markdown files and can refresh generated navigation views.

## 1. The Concept Registry

Every repository contains a [`research/concepts.md`](../research/concepts.md) file. This is the local glossary.
When you write a new theoretical memo, you should formally register its key concepts in this file.

The `concepts check` command parses all these local registries, ignoring generated auto-blocks, and reports missing fields, duplicate names and undefined references:

```bash
node scripts/cogentia.js concepts check --json
```

The generated concept summary and graph are refreshed through the corpus plan/apply cycle:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

## 2. Automatic Backlinks (Cross-References)

In a true Wiki, if Document A links to Document B, Document B should proudly display "I am referenced by Document A."

Cogentia automates this. By running:
```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

The CLI scans Markdown links across all registered repositories. It refreshes existing managed backlink blocks by default. Use `--create-backlinks` when you explicitly want missing backlink blocks created.

## 2 bis. Chaque document peut être une porte d'entrée (« Pour aller plus loin »)

La fonction d'un document public ne se limite pas à transmettre son contenu : il peut aussi permettre au lecteur d'entrer dans le **maillage de connaissances**. Lorsque le contexte et le lectorat le justifient, terminer par une courte rubrique **« Pour aller plus loin »** (ou proposer un encadré de navigation au point naturel de sortie), avec des **liens cliquables vérifiés** vers quelques documents réellement complémentaires.

- **Sélection éditoriale, pas génération systématique** : proposer généralement deux à cinq destinations, chacune annotée par sa valeur pour le lecteur ; omettre la rubrique lorsqu'elle serait artificielle, redondante ou disproportionnée (pièce probatoire, courrier, document bref, etc.).
- **Diversité des portes** : selon le cas, une introduction plus accessible, la source souveraine, un approfondissement contradictoire, un cas concret, ou une voie de contribution. Distinguer clairement ces rôles.
- **Liens utiles et stables** : privilégier les URL canoniques publiques ou les chemins relatifs résolus au sein du dépôt. Vérifier l'existence des cibles ; ne pas annoncer des sites, rendus ou publications non déployés. Une référence en métadonnées `related_documents` et des backlinks automatiques ne remplacent pas à eux seuls un chemin intelligible pour un lecteur humain.
- **Sans détournement du propos** : la navigation sert la lecture et la Surface de Chance ; elle ne doit ni se substituer à la conclusion, ni transformer chaque document en catalogue promotionnel.
- **Maintenance proportionnée** : ajouter et corriger les liens lors des révisions ordinaires ou d'un Test du Réel ; ne pas lancer une propagation massive simplement pour insérer une rubrique standard.

**Cas pilote :** [présentation de Casa Mariani](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/presentation-publique-casa-mariani.md). Elle dispose déjà d'un passage « Découvrir, vérifier, contribuer » : ce passage joue le rôle de « Pour aller plus loin » et ne nécessite pas de seconde rubrique identique. Tester auprès d'un lecteur si ses liens suffisent à aller vers la doctrine, les sources et une contribution.

## 3. Curated Pathways (Trails)

The raw concept graph can be overwhelming. To guide humans (or agents) through complex subjects step-by-step, you can create "Trails".

Create a markdown file in `research/trails/`, for example `ai_governance.md`:
```markdown
# Trail: AI Governance
1. [Democratic AI Safety](../../cogentia/research/democratic_ai_safety.md)
2. [Sovereign Digital Twin](../../cogentia/research/cogentia-digital-twin.md)
```

In v2, trails remain plain Markdown documents and are visible through `docs query --role trail` / `docs search`. Their navigation banners are refreshed through the normal corpus cycle:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

This keeps trail handling inside the same smaller `plan/apply/verify` model as backlinks and corpus status, instead of reviving a separate legacy command surface.

### Trails à embranchements : choix du lecteur

Un Trail ne doit pas nécessairement imposer une lecture séquentielle. Préserver les Trails linéaires lorsqu'un ordre dépendant est réellement utile ; préférer une **entrée commune suivie de branches thématiques** quand plusieurs questions de lecteurs sont également légitimes. Chaque branche doit indiquer son intention (« Je veux comprendre… », « Je veux vérifier… », « Je veux contribuer… »), avec peu de destinations réelles et une possibilité de retour ou de changement de branche.

La structure documentaire sous-jacente demeure un **graphe**, non un arbre strict : les chemins peuvent se rejoindre, mais le lecteur ne doit pas être forcé de traverser tout le graphe. Rester en Markdown natif et conserver `document_role: trail` ; ne pas inventer un moteur ou un schéma technique avant un besoin réel. Les Trails sont des **projections de navigation éditoriale**, non des sources souveraines.

**Premier cas pratique :** [Trail arborescent Casa Mariani](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/trails/casa_mariani.md) : choix entre sens du Musée, expériences, démarrage matériel et contribution. Examiner d'autres Trails progressivement au rythme des révisions, sans conversion massive.

### Navigation Guidée à deux modalités : Trails et Guides conversationnels

Les Trails balisés et les Guides conversationnels spécialisés sont **deux projections complémentaires d'un même Corpus**, et non deux autorités documentaires concurrentes.

1. **Trail (guidage éditorial relativement stable)** : parcours lisible sans agent, en Markdown et avec URLs stables ; chemin linéaire quand nécessaire, embranchements par curiosité quand utile. Il offre un point d'entrée reproductible et vérifiable.
2. **Guide (guidage dialogique, adaptatif et borné)** : l'utilisateur pose sa question, demande une comparaison, signale une surprise ou choisit une nouvelle direction ; l'agent oriente et explique en citant les sources et en distinguant faits, hypothèses et propositions. Son champ de réponse et ses pouvoirs restent bornés par les règles du Livre Vivant et du Corpus.
3. **Passerelle bidirectionnelle** : un Trail peut proposer un Guide correspondant à son domaine ; une réponse de Guide peut proposer un Trail ou quelques documents précis. Chaque voie garde un retour explicite à l'autre et une voie de lecture sans JavaScript ni agent.
4. **Amélioration révisée, jamais automatique** : questions récurrentes, incompréhensions ou découvertes inattendues peuvent motiver une correction de la carte ou un nouvel embranchement, mais aucune conversation ne réécrit silencieusement les sources ou ne devient une preuve. Respecter consentement, vie privée, provenance et budget attentionnel.
5. **Double piège** : ni dispersion par branches infinies, ni promotion d'une idée du seul fait qu'elle est récente ou formulée par le dernier interlocuteur. Un Guide doit réancrer les explorations dans le projet parent et comparer les nouvelles pistes aux priorités existantes.

**Test du Réel / Surface de Chance :** vérifier, sans assimiler clics et succès, si l'alternance entre Trail et Guide facilite découverte, compréhension, accès aux sources et contributions qualifiées. Distinguer une page ou un profil de Guide **présent dans Git** d'un service conversationnel **effectivement disponible en ligne** ; ne pas affirmer cette disponibilité sans test. Aucun nouveau moteur n'est nécessaire à la formalisation.

**Implémentations existantes :** [Living Book Checklist](../research/living_book_checklist.md) (Face 4 — Guide borné), [Trail Casa Mariani](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/trails/casa_mariani.md), [Guide du Livre Vivant 1755](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/1755/site/guide.html), [Trails as Consolidated Orientation](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/trails_as_consolidated_orientation.md).

### Deux catégories de lecteurs : humains et machines

La Navigation Guidée vise **deux catégories de lecteurs** en croissance : personnes humaines et agents logiciels (LLM, indexeurs, outils documentaires et autres machines). Cela constitue une **seconde dimension**, indépendante des deux modalités *Trail balisé* et *Guide conversationnel* :

| Lecteur | Trail balisé | Exploration dialogique ou outillée |
| --- | --- | --- |
| Humain | Questions, synthèses, liens commentés, choix de branches | Guide spécialisé, contradictions et approfondissements à la demande |
| Machine | Graphe de liens, métadonnées, URL canoniques, identifiants, états et provenance | Recherche structurée, consultation de sources, outils ou Guides bornés |

**Principe : unité sémantique, pluralité des présentations.** Ne pas entretenir deux vérités ni deux Corpus divergents. Sources et statuts souverains restent communs ; la présentation humaine et les représentations exploitables par machine sont des projections, chacune adaptée aux capacités et contraintes de son destinataire.

**Contrat minimal des portes d'entrée machine :** liens réellement résolvables ; métadonnées explicites (`document_role`, `visibility`, `lifecycle_state`, provenance, `canonical_url` quand pertinent) ; chemins de navigation et frontières des corpus ; distinction source/projection ; citations et incertitudes ; conditions d'accès et de contribution. Réutiliser les ressources existantes (Markdown, frontmatter, `llms.txt`/`llms-full.txt`, index et requêtes Cogentia) sans supposer que leur simple présence garantit indexation ou interopérabilité. Éviter les formats parallèles sans besoin vérifié.

**Transversalité :** une machine peut emprunter un Trail humain et un humain consulter un index structuré. L'adaptation est un service, non une barrière. Les Guides ne doivent pas inventer de liens, de sources ou de services disponibles.

**Test du Réel :** vérifier séparément qu'un nouveau lecteur humain *et* un agent externe dépourvu de contexte préalable peuvent découvrir Casa Mariani, trouver une introduction, retrouver la source d'une affirmation, puis identifier un canal de correction. Mesurer les défauts de résolution et de provenance avant d'ajouter une infrastructure.

**Surface de Chance :** chaque chemin public réellement intelligible pour l'un ou l'autre lectorat constitue une occasion supplémentaire de rencontre utile ; trafic automatique, réponses non sourcées ou multiplication de formats ne constituent pas à eux seuls une réussite.

### Représentations HTTP symétriques d'une ressource (convention proposée)

Pour les **serveurs HTTP que nous développons et contrôlons**, lorsqu'une ressource s'y prête, proposer une même identité de ressource sous plusieurs représentations :

- `GET /ressource` ou `?format=html` : **HTML par défaut**, lisible et accessible par les humains ;
- `?format=markdown` : Markdown réutilisable, avec liens et provenance ;
- `?format=json` : représentation structurée versionnable (identité, titre, statut, liens, source et, selon le type de ressource, sections/contenu) ;
- compléter si pertinent par la négociation HTTP standard via `Accept: text/html`, `text/markdown`, `application/json` ; lorsqu'un paramètre `format` explicite est présent, il prend priorité selon une règle documentée.

**Invariant :** même ressource, même identité canonique, même base de contenu et de provenance, mêmes règles de visibilité et d'autorisation ; seules les projections changent. Définir `Content-Type` exact, liens inter-représentations (`Link: rel="alternate"` ou équivalent), `Vary: Accept` lorsque l'en-tête influe sur la réponse, erreurs explicites pour formats non disponibles et tests de cohérence entre vues. Une représentation JSON peut exposer métadonnées, sections et références sans dupliquer nécessairement la totalité du texte : son contrat doit le préciser. Ne jamais laisser l'une des variantes révéler du contenu privé invisible aux autres utilisateurs autorisés au même niveau.

Il s'agit d'une **convention de conception proposée, pas d'une affirmation sur tous les serveurs existants**. Elle prolonge [Capability Symmetry](../patterns/capability-symmetry/PATTERN.md) et la politique de parité CLI/daemon/MCP déjà décrite dans [Intent](../research/intent.md). MCP, CLI, API et A2A ne sont pas des « formats » HTTP interchangeables : ils peuvent transporter ou invoquer les mêmes ressources/capacités avec leurs propres contrats, tout en préservant sémantique, provenance, mandat, droits et traces.

**Test du Réel minimal :** sur **un** serveur HTTP contrôlé et réellement déployé, choisir une ressource publique ; vérifier les représentations disponibles, les codes et en-têtes HTTP, les liens, les statuts/provenances et l'absence de divulgation entre variantes. Étendre progressivement sans conversion massive ni promesse générale non testée.

## 4. Web Rendering (Jekyll)

Because all references are standard relative Markdown links and metadata is managed as Jekyll Front-Matter, the entire corpus can be rendered instantly into a website.

The v2 CLI does not generate Jekyll configuration. The repositories keep their normal GitHub Pages / Jekyll files under version control; `cogentia.js` focuses on corpus structure and generated navigation blocks.
