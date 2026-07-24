---
title: Pipeline Conversation vers Corpus (Conversia)
subtitle: Transformation progressive des conversations en corpus vivant, modèles, agents, mandats et traces
author: Jean Hugues Noël Robert (conceptuel, pour intégration dans le corpus)
status: document source — méta-pipeline — conceptuel — conclusions provisoires
version: '0.4'
date: '2026-06-12'
license: CC BY-SA 4.0
language: fr
repository: cogentia
canonical_path: cogentia/research/conversation_to_corpus_pipeline.md
corpus_hierarchy:
  role: document méta sur Conversia / Cellula
  level: 1
  scope: conversation vers corpus, décisions candidates, mandats, traces, retours d’expérience
  delegates_crisis_doctrine_to:
    - barons-Mariani/research/democratie_crise_mandats_express.md
  synthetic_companion:
    - cogentia/research/mandated_fast_democracy.md
related_prompts:
  - cogentia/prompts/document_conversation_frame.md
  - cogentia/prompts/redactor.md
  - cogentia/prompts/reviewer.md
  - cogentia/prompts/pipeline.md
related_research:
  - barons-Mariani/research/democratie_crise_mandats_express.md
  - cogentia/research/mandated_fast_democracy.md
  - cogentia/research/pipeline.md
  - cogentia/research/derived_products.md
  - barons-Mariani/research/second_method.md
  - barons-Mariani/research/methode_terrains_feconds.md
  - barons-Mariani/research/traceabilite_des_actes.md
continuations:
  - barons-Mariani/research/democratie_crise_mandats_express.md
  - inseme/docs/concepts/conversia.md
  - inseme/docs/concepts/cellula.md
  - inseme/docs/mvp/conversia_cellula_mvp.md
  - inseme/docs/architecture/cellula_data_model.md
  - inseme/docs/architecture/cellula_markdown_export.md
  - cogentia/research/conversia_agent.md
document_role: source
document_kind: concept-note
visibility: public
lifecycle_state: working
classification_source: cogentia.js
classification_version: '1'
classification_rule: concept-note
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
# Pipeline Conversation vers Corpus (Conversia)

**Document source méta-pipeline — version 0.4**

## Objet

Ce document décrit le pipeline **Conversia** : un processus structuré pour transformer des conversations, souvent éphémères, en un **corpus vivant**, structuré, versionné et réutilisable, puis en modèles, agents, mandats, actes et traces.

Il s’intègre dans le cadre plus large du corpus Cogentia et des travaux sur l’**Autonomie de Capacité**, en fournissant une méthode explicite pour stabiliser les connaissances produites dans les discussions, revues, kernels, objections, échanges collectifs et situations de coordination opérationnelle.

Le pipeline suit le principe général :

```text
conversation
→ stabilisation
→ corpus
→ modèle
→ agent
→ suggestion
→ conversation
```

Il peut aussi, lorsque la conversation appelle une action collective, suivre la chaîne complémentaire :

```text
conversation
→ options
→ décision candidate
→ mandat
→ action
→ trace
→ contrôle
→ retour d’expérience
→ corpus
```

Les conversations deviennent ainsi une matière première durable plutôt qu’un flux qui disparaît.

## Origine provisoire du concept

Le concept est issu d’une comparaison entre Slack, Mattermost et Discord, puis d’un déplacement progressif vers les besoins propres d’Inseme, Cogentia, Kudocracy et Archiac.

Les outils existants indiquent des surfaces utiles :

- Slack : fluidité d’usage, canaux, intégrations, workflows ;
- Mattermost : souveraineté, auto-hébergement, coordination opérationnelle, logique de centre de commandement ;
- Discord : présence communautaire, salons, rôles, oralité, sentiment de collectif vivant ;
- GitHub : versionnement, branches, commits, issues, pull requests, releases ;
- wikis et blogs : publication et stabilisation documentaire ;
- outils de vote : décision explicite ;
- outils de gestion de tâches : action et suivi.

Mais aucun de ces outils ne porte l’ensemble de la chaîne :

```text
discuter
→ structurer
→ stabiliser
→ décider
→ mandater
→ agir
→ tracer
→ apprendre
→ transmettre
```

Conversia nomme cette chaîne.

## Documents associés

- `cogentia/research/pipeline.md` — pipeline général de transformation corpus → produits déclinés.
- `cogentia/prompts/document_conversation_frame.md` — cadre pour conversations structurées.
- `cogentia/prompts/redactor.md` — production rédactionnelle.
- `cogentia/prompts/reviewer.md` — revue critique.
- `barons-Mariani/research/second_method.md` — seconde méthode, objections, niveaux de preuve.
- `barons-Mariani/research/methode_terrains_feconds.md` — exploration des possibles.
- `barons-Mariani/research/traceabilite_des_actes.md` — actes, traces, imputabilité.

## Méthode de mise à jour

Ce document est mis à jour selon une logique de corpus source : les échanges, objections et revues peuvent produire des checkpoints, puis des documents stabilisateurs, puis des versions successives du document.

Toute révision substantielle doit distinguer :

- les concepts et principes stabilisés ;
- les hypothèses de fonctionnement ;
- les décisions terminologiques ;
- les continuations à explorer ;
- les éléments à intégrer dans d’autres documents du corpus ;
- les éléments relevant de produits déclinés plutôt que du corpus source.

## Statut

Document source méta-pipeline v0.4.

Il consolide les conclusions provisoires suivantes :

- **Conversia** : couche conversationnelle fractale ;
- **Cellula** : unité opérationnelle de Conversia ;
- **conversation vers corpus** : pipeline de stabilisation ;
- **démocratie rapide** : renvoi au document source souverain `barons-Mariani/research/democratie_crise_mandats_express.md` ;
- **mandat conditionnel** : objet du pipeline pouvant devenir mandat express en contexte de crise ;
- **trace renforcée** : condition démocratique de l’action rapide, développée dans le document souverain ;
- **Supabase + Netlify** : hypothèse réaliste de premier MVP dans Inseme.

## Hiérarchie dans le sous-corpus

Ce document est le **document méta** du triptyque.

Il décrit la méthode générale de transformation :

```text
conversation
→ stabilisation
→ corpus
→ modèle
→ agent
→ suggestion
→ conversation
```

et son extension décisionnelle :

```text
conversation
→ options
→ décision candidate
→ mandat
→ action
→ trace
→ contrôle
→ retour d’expérience
→ corpus
```

Il ne doit pas porter seul la doctrine politique complète de la démocratie de crise. Cette doctrine est désormais déléguée au document source souverain :

```text
barons-Mariani/research/democratie_crise_mandats_express.md
```

Le document `cogentia/research/mandated_fast_democracy.md` devient une synthèse conceptuelle courte. Le présent document conserve le rôle d’architecture de pipeline.

## Résumé

La plupart des systèmes de communication traitent les conversations comme des flux éphémères.

Les messages s’accumulent, puis disparaissent dans l’historique.

Le pipeline Conversia vise une approche différente : les conversations deviennent une matière première durable pour construire un corpus vivant, traçable et productif.

La finalité n’est pas seulement documentaire. Elle est aussi opérationnelle et politique : permettre à une communauté de transformer des discussions en connaissances, décisions, mandats, actions, traces et apprentissages.

## Problème initial

Dans la plupart des organisations et projets :

```text
discussion
→ oubli
```

ou :

```text
discussion
→ document manuel
```

La transformation est coûteuse, irrégulière et dépend fortement de quelques personnes.

Les connaissances produites collectivement sont souvent perdues.

La coordination opérationnelle est souvent séparée de la légitimité démocratique.

La prise de décision rapide est souvent confondue avec la concentration du pouvoir.

## Hypothèse

Une conversation importante contient déjà :

- des faits ;
- des hypothèses ;
- des objections ;
- des désaccords ;
- des décisions implicites ou explicites ;
- des expériences ;
- des retours d’expérience ;
- des connaissances implicites ;
- des amorces de mandats ;
- des traces d’action ;
- des bifurcations possibles.

Le problème n’est pas l’absence de connaissance.

Le problème est l’absence de mécanismes de stabilisation explicites, versionnés et traçables.

## Terminologie retenue

### Conversia

**Conversia** désigne la couche conversationnelle fractale qui transforme des conversations en connaissances, décisions, mandats, actions et traces.

Le nom a été préféré à Dialogia parce que le terme « dialogue » peut évoquer une relation entre deux personnes, alors que le système doit fonctionner pour des collectifs, des agents et des combinaisons humains + agents.

Conversia évoque :

- la conversation ;
- la conversion ;
- la transformation ;
- le passage d’un flux à une forme structurée.

### Cellula

**Cellula** désigne l’unité opérationnelle de Conversia.

Une Cellula est une conversation organisée pour devenir capacité d’action.

Elle peut contenir :

- messages ;
- branches ;
- checkpoints ;
- documents stabilisateurs ;
- décisions candidates ;
- mandats ;
- traces d’action ;
- retours d’expérience ;
- liens vers le corpus.

Le terme évoque à la fois la cellule vivante, la cellule locale, la cellule de crise, l’unité autonome et la brique fractale.

## Positionnement architectural

```text
Inseme
→ plateforme de mise en relation, publication et mémoire collective

Conversia
→ couche conversationnelle fractale

Cellula
→ unité opérationnelle de conversation, décision, mandat et trace

Cogentia
→ structuration, modèles, agents, suggestions

Kudocracy
→ légitimation démocratique, vote, délégation, mandat

Archiac
→ actes, traces, imputabilité, audit
```

Formule synthétique :

## Le pipeline Conversia

### Étape 1 : Messages

Le niveau élémentaire.

```text
message
```

Un message est :

- daté ;
- attribué ;
- contextualisé.

Il ne prétend pas être stable.

### Étape 2 : Conversation

Les messages s’organisent.

```text
messages
→ conversation
```

Une conversation possède :

- un sujet ;
- des participants ;
- un contexte ;
- une temporalité ;
- éventuellement un objet rattaché dans le corpus.

Dans Conversia, une conversation peut être ramifiée.

### Étape 3 : Branches

Les divergences deviennent explicites.

```text
conversation
→ branches
```

Une branche peut représenter :

- une hypothèse ;
- une objection ;
- une variante ;
- une piste de recherche ;
- une stratégie alternative ;
- un sous-problème ;
- une exploration latérale.

Les désaccords ne sont plus cachés dans le flux.

Ils deviennent des objets traçables.

### Étape 4 : Merges

Les branches peuvent produire des fusions.

Une fusion ne signifie pas nécessairement consensus.

Elle signifie qu’un point d’étape est produit et qu’une partie de la branche peut être réintégrée dans la conversation principale, un document stabilisateur ou une décision candidate.

```text
branches
→ merges
→ stabilisation partielle
```

### Étape 5 : Checkpoints

Une conversation produit périodiquement des points d’étape.

```text
branches + merges
→ checkpoints
```

Un checkpoint indique :

- ce qui semble acquis ;
- ce qui reste ouvert ;
- ce qui doit être vérifié ;
- les objections sérieuses ;
- les prochaines étapes.

### Étape 6 : Documents stabilisateurs

Lorsque certains éléments deviennent suffisamment stables :

```text
checkpoints
→ documents stabilisateurs
```

Ces documents constituent l’interface entre la conversation et le corpus.

Ils restent révisables.

Ils ne prétendent pas être définitifs.

### Étape 7 : Corpus vivant

Les documents stabilisateurs rejoignent le corpus.

```text
documents stabilisateurs
→ corpus
```

Le corpus est :

- versionné ;
- traçable ;
- réutilisable ;
- transmissible.

Le corpus est plus stable que la conversation, mais moins figé qu’une publication traditionnelle.

### Étape 8 : Modèles

Le corpus peut être structuré.

```text
corpus
→ modèles
```

Un modèle peut représenter :

- une doctrine ;
- un processus ;
- une organisation ;
- une stratégie ;
- un territoire ;
- une personne ;
- une communauté ;
- une situation de crise ;
- un mandat type.

### Étape 9 : Agents

Les modèles peuvent produire des agents.

```text
modèles
→ agents
```

Un agent est une représentation exécutable d’une partie du corpus.

Il n’est pas une source souveraine.

Il est un produit décliné du corpus.

### Étape 10 : Suggestions

Les agents produisent des suggestions.

```text
agents
→ suggestions
```

Les suggestions peuvent :

- résumer ;
- comparer ;
- détecter des contradictions ;
- rappeler des précédents ;
- identifier des risques ;
- proposer des pistes ;
- préparer des checkpoints ;
- proposer des documents stabilisateurs ;
- signaler des mandats applicables.

Les suggestions ne doivent pas devenir des prescriptions.

### Étape 11 : Retour vers la conversation

La boucle se referme.

```text
suggestions
→ conversations
```

Les humains conservent la responsabilité ultime.

Les agents alimentent la discussion.

Ils ne la remplacent pas.

## Schéma complet

```text
messages
→ conversations
→ branches
→ merges
→ checkpoints
→ documents stabilisateurs
→ corpus
→ modèles
→ agents
→ suggestions
→ conversations
```

## Extension décisionnelle

Le pipeline conversationnel peut produire une chaîne décisionnelle :

```text
conversation
→ options
→ décision candidate
→ validation
→ mandat
→ action
→ trace
→ revue
→ corpus
```

Cette extension est essentielle : Conversia ne doit pas devenir seulement un système de discussion ou de documentation. Elle doit pouvoir servir de couche de préparation à l’action.

### Décision candidate

Une décision candidate doit expliciter :

- le contexte ;
- les options examinées ;
- les objections ;
- les risques ;
- les personnes concernées ;
- le mode de validation ;
- le lien éventuel vers Kudocracy.

### Mandat

Un mandat doit préciser :

- qui mandate ;
- qui est mandaté ;
- pour faire quoi ;
- dans quel périmètre ;
- pendant combien de temps ;
- avec quels actes autorisés ;
- avec quelles limites ;
- avec quelles traces ;
- avec quelles conditions de révocation.

### Trace

Une trace d’action doit permettre de répondre à des questions simples :

- qui a agi ?
- quand ?
- au nom de quel mandat ?
- avec quels moyens ?
- pour quel résultat ?
- avec quelles conséquences ?
- avec quelles pièces associées ?
- avec quelles suites ?

## Démocratie rapide, crise et mandats

Conversia rencontre la question de la vitesse démocratique parce que le pipeline peut produire des décisions candidates, des mandats, des actions et des traces. Toutefois, le développement doctrinal complet de la démocratie capable de crise relève du document source souverain :

```text
barons-Mariani/research/democratie_crise_mandats_express.md
```

Dans le présent document, seule la fonction technique est retenue : Conversia doit pouvoir manipuler des objets de type `mandate`, les relier aux conversations, aux décisions candidates, aux traces d’action et aux retours d’expérience.

Terminologie minimale :

```text
mandat conditionnel
→ catégorie générale : mandat préparé à l’avance, activable sous conditions

mandat express
→ mandat conditionnel en contexte d’urgence ou de crise
```

Le pipeline reste donc :

```text
conversation
→ décision candidate
→ validation
→ mandat
→ action
→ trace
→ revue
→ corpus
```

## Cellula : unité opérationnelle

Une **Cellula** est l’unité opérationnelle de Conversia.

Elle organise une conversation afin qu’elle puisse devenir capacité d’action : discussion, branches, synthèses, décisions candidates, mandats, actions, traces et retour d’expérience.

Une Cellula n’est pas seulement un salon de discussion, un canal ou un thread. C’est un espace structuré où des personnes et des agents peuvent discuter, décider, mandater, agir, tracer et apprendre.

Formule courte :

> Une Cellula est une conversation organisée pour devenir capacité d’action.

Une Cellula peut être :

- territoriale ;
- thématique ;
- temporaire ;
- permanente ;
- de crise ;
- d’expertise ;
- de coordination ;
- documentaire ;
- politique ;
- technique.

Elle peut être attachée à :

- un projet ;
- un lieu ;
- une association ;
- une commune ;
- un dossier ;
- une crise ;
- une proposition ;
- un événement ;
- une décision ;
- un mandat ;
- un objet du corpus.

## Structure minimale d’une Cellula

```yaml
cellula:
  id: example-cellula
  title: "Cellula d’exemple"
  status: active
  mode: ordinary
  scope:
    type: project
    linked_object: ""
  participants:
    humans: []
    agents: []
  conversations: []
  branches: []
  checkpoints: []
  stabilizers: []
  decision_candidates: []
  mandates: []
  action_traces: []
  reviews: []
  corpus_links: []
```

## Garde-fous opérationnels minimaux

Conversia ne porte pas toute la doctrine politique des pouvoirs d’urgence. Elle doit seulement garantir que chaque décision ou mandat puisse être rattaché à un contexte, un périmètre, une durée, des actes autorisés ou interdits, un niveau de trace, une procédure de revue, une possibilité de révocation et un lien vers le corpus.

Règle opérationnelle minimale :

```text
pas de mandat sans trace
pas d’action significative sans imputabilité
pas de crise sans retour d’expérience
pas d’agent IA prescripteur
```

Les principes politiques détaillés — proportion démocratique, anti-capture, état d’urgence, rôle des agents IA en crise — sont traités dans `barons-Mariani/research/democratie_crise_mandats_express.md`.

## Hypothèse d’implémentation Inseme : Supabase + Netlify

Dans Inseme, une première implémentation réaliste peut s’appuyer sur Supabase et Netlify.

Architecture :

```text
Netlify
→ interface web Inseme / Conversia / Cellula

Supabase Auth
→ utilisateurs, rôles, groupes

Supabase Postgres
→ conversations, branches, messages, décisions, mandats, traces

Supabase Realtime
→ discussion quasi instantanée

Supabase Storage
→ pièces jointes, documents stabilisateurs

GitHub export
→ corpus versionné Markdown/YAML
```

Tables initiales possibles :

```text
profiles
spaces
cellulae
cellula_members
messages
branches
checkpoints
decision_candidates
mandates
action_traces
documents
reviews
```

Parcours minimal :

```text
Créer une Cellula
→ ouvrir une conversation
→ ajouter des messages
→ créer une branche
→ produire un checkpoint
→ proposer une décision
→ créer un mandat
→ tracer une action
→ exporter vers Markdown/YAML
```

Priorité d’implémentation :

```text
1. Auth Supabase
2. Cellulae
3. Messages
4. Checkpoints
5. Décisions candidates
6. Mandats
7. Traces d’action
8. Export Markdown/YAML
9. Realtime
10. GitHub sync
```

Ne pas commencer par un clone Slack/Discord/Mattermost.

Commencer par la structure décisionnelle : discussion → décision → mandat → trace.

## Différence avec Slack, Discord et Mattermost

### Slack

Slack fournit un modèle d’usage : fluidité, canaux, intégrations, workflows.

Mais Slack reste un SaaS propriétaire centré sur la coordination d’entreprise.

### Discord

Discord fournit un modèle de présence : communautés, rôles, salons, voix, sentiment de collectif vivant.

Mais Discord n’est pas conçu comme une infrastructure souveraine, traçable et démocratique de décision.

### Mattermost

Mattermost fournit un modèle de souveraineté opérationnelle : self-hosting, contrôle des données, intégrations, playbooks, coordination de crise.

Mais Mattermost ne porte pas nativement la logique démocratique des mandats, de la légitimation, de la révocation et de la traçabilité politique.

### Conversia

Conversia ne doit pas être un clone de ces outils.

Conversia doit être une infrastructure de transformation :

```text
conversation
→ connaissance
→ décision
→ mandat
→ action
→ trace
→ apprentissage
```

## Principes fondamentaux

1. Les conversations sont la matière première.
2. Les désaccords doivent rester visibles et traçables.
3. Les branches doivent préserver les hypothèses et objections sérieuses.
4. Les merges doivent être explicites.
5. Les stabilisations doivent être explicites et versionnées.
6. Le corpus doit rester versionné et traçable jusqu’aux conversations d’origine.
7. Les modèles doivent rester traçables jusqu’au corpus.
8. Les agents doivent rester traçables jusqu’aux modèles.
9. Les suggestions ne doivent pas devenir des prescriptions.
10. Les décisions doivent être rattachées à des modes de légitimation.
11. Les mandats doivent être bornés, datés, révocables et traçables.
12. Les actes significatifs doivent produire des traces.
13. Les crises doivent renforcer la traçabilité au lieu de suspendre la démocratie.
14. Les humains conservent la responsabilité finale.

## Formules stabilisées

```text
Les discussions sont la matière première.
Les documents sont des stabilisateurs.
Le corpus est une mémoire organisée.
L’IA est une représentation exécutable du corpus.
```

```text
Une Cellula est une conversation organisée pour devenir capacité d’action.
```

## Intégration dans le corpus existant

Ce pipeline s’intègre naturellement avec les autres documents du corpus :

- il complète `cogentia/research/pipeline.md` en détaillant la phase amont conversation → corpus ;
- il est directement applicable au processus de review et redaction ;
- il renforce la méthode des terrains féconds en structurant les branches, objections et hypothèses ;
- il s’aligne avec la traçabilité des actes ;
- il fournit un cadre méthodologique pour les futures conversations sur l’Autonomie de Capacité, le Pacte anti-capture, FractaVolta, Inseme, Kudocracy et Archiac ;
- il délègue explicitement la doctrine politique des mandats express au document souverain `barons-Mariani/research/democratie_crise_mandats_express.md`.

Il peut être utilisé concrètement pour :

- structurer les revues externes ;
- transformer les checkpoints implicites en documents stabilisateurs explicites ;
- guider le développement d’agents légers basés sur le corpus ;
- préparer des décisions candidates ;
- expliciter des mandats ;
- produire des traces d’action ;
- préparer des retours d’expérience.

## Continuations à explorer

### 1. Document Inseme : Conversia

Créer ou compléter :

```text
inseme/docs/concepts/conversia.md
```

Objet : présenter Conversia comme couche conversationnelle fractale de la plateforme Inseme.

### 2. Document Inseme : Cellula

Créer ou compléter :

```text
inseme/docs/concepts/cellula.md
```

Objet : définir Cellula comme unité opérationnelle de conversation, décision, mandat et trace.

### 3. MVP technique Supabase / Netlify

Créer :

```text
inseme/docs/mvp/conversia_cellula_mvp.md
```

Objet : traduire le concept en schéma de base de données, parcours utilisateur, écrans et roadmap technique.

### 4. Mandats express et démocratie capable de crise

Document désormais principal :

```text
barons-Mariani/research/democratie_crise_mandats_express.md
```

Objet : formaliser la réponse politique et doctrinale à la contradiction démocratie/vitesse, en traitant l’objection de lenteur, l’état d’urgence, l’état d’exception, les mandats express, la trace renforcée, l’anti-capture et le retour d’expérience.

### 5. Synthèse conceptuelle : démocratie rapide mandatée

Document court :

```text
cogentia/research/mandated_fast_democracy.md
```

Objet : fournir une introduction synthétique au concept, sans dupliquer le document souverain.

### 6. Modèle de données Cellula

Créer :

```text
inseme/docs/architecture/cellula_data_model.md
```

Objet : définir les tables Supabase, relations, permissions, événements, exports et contraintes.

### 7. Export Markdown/YAML

Créer :

```text
inseme/docs/architecture/cellula_markdown_export.md
```

Objet : définir le format d’export d’une Cellula vers le corpus vivant.

### 8. Agent Conversia

Créer :

```text
cogentia/research/conversia_agent.md
```

Objet : définir ce qu’un agent peut suggérer dans une conversation sans devenir prescripteur.

## Prochaines étapes recommandées

1. Archiver cette version dans `cogentia/research/conversation_to_corpus_pipeline.md`.
2. Ajouter des références à ce document dans `cogentia/research/pipeline.md`.
3. Rédiger `inseme/docs/concepts/conversia.md`.
4. Rédiger `inseme/docs/concepts/cellula.md`.
5. Rédiger une première spécification MVP Supabase / Netlify.
6. Distinguer clairement ce qui relève du corpus source et ce qui relève des produits déclinés.
7. Tester le pipeline sur une conversation réelle déjà structurée par revue.

---

*Fin du document v0.3 — hiérarchie clarifiée consolidées pour archivage dans le corpus et continuations ultérieures.*
