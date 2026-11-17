---
packet_id: CPKT-2026-010
packet_kind: cognitive-packet/v0.1
packet_version: 1
title: "CPKT-2026-010 — Continuation de référence : Judgment, accounting, traces, localité et liberté de sortie"
created: "2026-11-17"
date: "2026-11-17"
last_modified_at: "2026-11-17"
status: working-paper
packet_status: "open — handoff ready; acceptance not yet demonstrated"
lifecycle_state: working
visibility: public
language: fr
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
license: CC BY-SA 4.0
home_of_record: "JeanHuguesRobert/cogentia — Cognitive Packets et CPS"
subscribing_homes:
  - "JeanHuguesRobert/inseme — COP, accounting, FractaLog, journal canonique"
carrier: "Dépôt GitHub public ; transmission par copie ou référence, interprétable sans la conversation source"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/CPKT-2026-010_cps_judgment_reprise_comptabilite_portabilite.md"
document_role: operational
document_kind: cognitive-packet-handoff
update_policy: UP-DEFAULT-REVIEWED
review:
  status: unreviewed
  reviewed_by: []
classification_source: cogentia.js
classification_version: "1"
classification_rule: explicit-metadata
classification_confidence: strong
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-17 — revue de MCP, A2A, agentproto, CMMN, OASF et décision de prioriser la démonstration CPS"
  origin_date: "2026-11-17"
  derived_from:
    - "research/portable_continuations_and_judgment_boundaries.md"
    - "research/cognitive_packets.md"
    - "research/locality_principle.md"
    - "research/integration/agentproto-cmmn-oasf-interop.md"
    - "docs/continuation-protocol-catalog.md"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
related_documents:
  - "skills/continuation-handling/SKILL.md"
  - "research/agent_resumable_cli.md"
  - "docs/cogentia-magistral-boundary.md"
  - "docs/mcp-tasks-cop-bridge.md"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/336"
---

# CPKT-2026-010 — Reprise effective, accounting strict, traces fractales, localité, liberté de sortie

**À l'agent ou à l'humain qui reçoit ce paquet :** il est autonome. Lisez les instructions locales, les références citées et l'état réel du code avant de travailler. Ne dépendez ni du transcript de la conversation initiale, ni d'une mémoire ChatGPT, ni d'un modèle particulier. Si une pièce manque, rapportez une *packaging failure* ; ne la recréez pas par hypothèse. Ce paquet **ne délivre aucun mandat d'effet** : résolvez l'autorité réellement applicable à chaque acte.

## 0. État / prochain Hop

- **État :** travail mandaté au niveau de sa préparation ; plan de vérification stabilisé, **parcours de bout en bout non encore prouvé**. Ce fichier est un paquet de continuation documentaire, **pas** une entrée créée dans le journal COP de production ni une Task MCP/A2A.
- **But court terme :** prouver **un seul** parcours complet, plutôt qu'intégrer cinq normes à la fois.
- **Prochain acte précis :** sur Fracta2, exécuter la batterie de tests existants en lecture/fixture, relever les contrats exacts de `emit → stop → JudgmentResult → resume` et localiser le **premier point où `continuation resolve` dépose un résultat sans faire progresser le calcul initial**. Corriger ce point par réutilisation des primitives, puis rejouer le scénario.
- **Filiation :** travail transverse dans [Cogentia #336](https://github.com/JeanHuguesRobert/cogentia/issues/336), avec raccordements minimaux à Inseme. Les autres chantiers continuent d'avoir leurs propres responsabilités. **Ne pas créer une deuxième queue, un deuxième ledger ou un nouveau Scheduler.**
- **Fin attendue :** preuves exécutables, journaux/reçus locaux et compte rendu PASS/FAIL par scénario ; ne pas fermer le chantier sur documentation seule.

## 1. Question / objectif du paquet

> Peut-on commencer un travail localement, interrompre réellement son calcul pour demander un **Judgment** à un agent intelligent, recevoir le résultat par des voies techniquement différentes, **reprendre le calcul initial**, et exporter/reprendre l'ensemble ailleurs, sans perdre ni l'accounting strict COP, ni la causalité fractale des traces, ni les contrôles locaux, ni la possibilité de sortir définitivement du fournisseur initial ?

Le premier cas de réalité est **la classification d'un document public non sensible du Corpus GitHub** (décision typée : `index`, `source`, `archive`, `needs_more_context`, etc., selon le contrat actuellement utilisé). Il évite emails, paiements, publications tierces et données privées. Les résultats de Judgment restent des candidats évalués, non des modifications du Corpus effectuées sans contrôle.

## 2. Les invariants NON négociables

| Dimension | Obligation observable | Critère de refus |
|---|---|---|
| **CPS / inversion de contrôle** | Le producteur déterministe s'arrête réellement à une frontière de Judgment ; une continuation identifiable porte contexte minimal, cible de retour et schéma de résultat. Un handler résolu **réinjecte** la réponse et poursuit le calcul. | `continuation resolve` ne fait que changer un statut ou déposer un JSON, sans réentrée effective. |
| **Accounting strict COP** | Pour chaque invocation physique : un seul paquet propriétaire de la dépense, `spend_id` unique, unités explicites, budget réservé puis réglé/libéré avec reçu ; totaux consolidés projetés **sans repost des coûts enfants**. | La même dépense est comptée sur le parent et l'enfant ; une consommation inconnue est enregistrée comme zéro ; failover réinitialise un budget. |
| **FractaLog fractal** | Chaque Hop conserve avec son sujet local les faits primaires, causal refs, acteur et preuve d'effet ; les vues globales sont des fédérations/projections, non un second registre mutable. | Trace globale réussie mais événement local/provenance ou correction perdus ; confusion `trace_id` / `packet_ref`. |
| **Localité minimale suffisante** | Le document et les éléments sensibles demeurent chez leur dépositaire ; transport par **référence** ou projection limitée, copie seulement si nécessaire ; frontière de confidentialité et de contrôle locale explicite. | Envoi de tout le corpus/mandat/clé à un provider pour une simple question ; globalisation implicite de la donnée. |
| **Fournisseur substituable** | Contrat logique stable malgré voies différentes : API Magistral (local/routeur), ChatGPT via CPS du navigateur hébergé, puis éventuellement Claude/Grok/humain ou copier-coller ; aucune référence fournisseur requise dans l'identité du paquet. | Identifiant propriétaire de conversation, modèle précis ou SDK détenu par un fournisseur est indispensable pour reprendre. |
| **Portabilité / sortie** | Export portable de continuation, source hashes, contexte, résultats, dépenses et références causales ; import dans une nouvelle localité avec vérification des hashes. Les secrets et pouvoirs **ne sont pas transportés implicitement**. | Sans connexion au fournisseur ou à la base d'origine, le travail devient définitivement ininterprétable. |
| **Autorité** | Un acteur capable n'est pas nécessairement habilité ; mandat, PacketClaim, budget et effet se vérifient dans la localité du prochain acte ; jamais de renforcement lors d'un Hop. | Nom d'outil, AgentCard, Task MCP, authentification ou `taskId` traités comme autorisation. |
| **Optimistic locking / incertitude** | CAS, idempotence et réconciliation sur événements concurrents et réponses répétées ; une sortie d'effet inconnu reste en quarantaine. | Double émission à cause d'un timeout incertain ; retraitement silencieux d'un acte à effet externe. |

**Comptabilité :** `own_spend(P) = Σ spending_lines(P)` ; `consolidated_spend(P) = own_spend(P) + Σ consolidated_spend(downstream)`. Le `Hop` **n'est pas** l'unité comptable et peut produire zéro ou plusieurs lignes de dépense. Les budgets consommés, crédits réservés, factures réelles et estimations restent des notions distinctes. Se reporter au document canonique Inseme, plutôt qu'inventer un deuxième calcul.

## 3. Baseline de code : à réinspecter, sans supposer qu'il est déployé

| Responsabilité | Source à réutiliser | État connu au 17/11/2026 |
|---|---|---|
| Production typée | `scripts/lib/continuation-production-recipes.mjs` | Préparateur pur (P1 #336), pas exécuteur. |
| Continuation locale durable | `scripts/lib/primitive-continuations.mjs`, `scripts/lib/continuation-sqlite-repository.mjs` | CAS, snapshot, réconciliation et reprise locale ; distinguer de la réentrée de l'application appelante. |
| Retour COP | `scripts/lib/cogentia-mcp-judgment-result-host.js`, `scripts/lib/chatgpt-cps-return-evaluator.js`, `scripts/lib/chatgpt-cps-return-wake.js` | Réception et réveils spécialisés ; vérifier **réentrée réelle** pour le scénario choisi. |
| Suspension vers navigateur | `scripts/lib/chatgpt-cps-assignment.js`, `scripts/lib/chatgpt-cps-assigned-dispatch.js`, `scripts/ops/ona-chatgpt-cps-reconcile.mjs` | Chemin CPS signé, spécifique à ChatGPT ; vérifier disponibilité du navigateur, mandat et reçu avant usage. |
| Route locale API | `scripts/lib/ai-router-client.js`, `scripts/lib/openai-conversation-bridge.mjs` | Interface de type OpenAI, gestion de `local_continuation_required` ; le modèle/routeur réel est une capacité technique, non une autorité. |
| Coordination de travail | `scripts/lib/continuation-pull.js` ; `inseme/packages/cop-kernel/src/scheduler.js` | COPScheduler, PacketClaims, intents et résultats, ne pas créer un scheduler concurrent. |
| COP journal et accounting | `inseme/packages/cop-core/src/sqlite-cop-event-store.js`, `inseme/packages/cop-kernel/src/accounting/packetAccounting.js` (vérifier le chemin effectif), `inseme/packages/cop-core/src/execution-budget.js` | Journal canonique et ledger existants ; tester l'enregistrement des dépenses réelles par appel. |
| Steps | `inseme/packages/cop-core/src/packet-task-step-cursor.js` | Curseur atomique, mais ne signifie pas exécution du Step. |
| Export | `scripts/ops/continuation-snapshot-local.mjs` | Snapshots locaux ; étendre seulement si une perte de données est **démontrée**. |
| Interop | `scripts/lib/mcp-tasks-2026-contract.mjs`, `docs/mcp-tasks-cop-bridge.md` | Façade Tasks optionnelle, pas encore de backend COP réel déployé. |

**Préexistences doctrinales :** `research/portable_continuations_and_judgment_boundaries.md`, `research/locality_principle.md`, `docs/cogentia-magistral-boundary.md`, `research/cognitive_packets.md`, `research/propagation_register.md`, `inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md`. La non-découverte d'un principe est d'abord une dette de navigation, pas une autorisation de le réinventer.

## 4. Plan minimal en cinq Hops avec contrôles observables

### H0 — État réel et premier point de rupture (sans effets)

1. Relire les instructions `AGENTS.shared.md`, celles des dépôts actifs et la Skill `continuation-handling`.
2. Localiser un **exécuteur déterministe réel** qui émet une continuation lors du classement de documents ; si le producteur historique ne sait pas reprendre, identifier exactement la fonction/étape manquante plutôt que construire un simulateur qui réussirait artificiellement.
3. Exécuter d'abord les tests de primitives, de préparation, de MCP result et de wake existants dans une DB jetable, puis une reproduction minimaliste de `emit → stop → return → resume`.
4. Matérialiser un rapport `source_present / runnable / authorized / tested` pour chaque route, en séparant état des sources et état des services déployés.

**Sortie H0 :** fail/pass du chemin existant et emplacement précis du premier raccordement manquant, tests à ajouter ; aucun changement imposé de schéma.

### H1 — Retour et réentrée effective (priorité absolue)

Implémenter le plus petit raccordement à un `resume_handler_ref` / `resumption_target` réifiable **avec les primitives existantes**. Injecter un JudgmentResult de fixture avec correlation d'origine et version attendue. Le résultat validé doit déclencher **exactement une** nouvelle exécution de la suite du calcul, sans ressusciter une closure JavaScript d'un processus mort.

Tests : doublon identique, réponse contradictoire, handler absent, crash entre réception et consommation, reprise après redémarrage, et `needs_more_context` produisant une nouvelle continuation légitime au lieu d'un succès fictif.

**Sortie H1 :** test rouge-vert reproductible : `output_artifact_ref` dérivé du résultat, avec provenance de reprise et identifiant de l'acte (et aucun changement externe non autorisé).

### H2 — Deux voies de Judgment réellement substituables

Même question, mêmes contraintes et même contrat de résultat ; deux voies **distinctes** :
- route API de Magistral (`/v1/chat/completions`, y compris fallback local selon capacité/routage en vigueur) ;
- route ChatGPT via CPS navigateur hébergé **seulement** si identité, mandat, contrôle COP, disponibilité de l'interface et effets d'émission sont vérifiés.

Aucune intervention supplémentaire du Principal si les mandats opérationnels déjà applicables couvrent l'acte. Si le second canal est indisponible ou non autorisé, utiliser d'abord un transport **portable par copie/paste ou une fixture étiquetée** ; ne pas prétendre avoir testé ChatGPT en réel. Les fournisseurs futurs (Claude, Grok, etc.) sont **des adaptateurs**, pas des nouvelles familles de continuation.

**Sortie H2 :** test de substituabilité du contrat, comparaison de la provenance, budget unique par invocation physique et changement de fournisseur **sans modification du producteur**.

### H3 — Comptabilité et traçabilité fractales

Lancer le même scénario depuis deux Hops, avec arrêt/redémarrage et duplication de retour. Vérifier : une seule appropriation de coût physique ; correctifs/mesures nouveaux ajoutés, jamais réécriture de l'histoire ; propre vs consolidé recalculable ; `packet_ref`, `task_ref` externe et `trace_id` corrélés mais différents ; coût inconnu enregistré comme inconnu, pas zéro.

**Sortie H3 :** journal local et projection globale dont les montants et relations causales sont reconstituables, avec test de non-double-comptage.

### H4 — Exercice de sortie et adaptateurs standards, strict minimum

Exporter le paquet et ses références, réimporter dans une localité de test indépendante, **sans jetons ni session de fournisseur**, désactiver explicitement le fournisseur qui avait répondu d'abord, puis reprendre avec un autre canal ou un humain. Réconcilier les retours tardifs.

Seulement ensuite : brancher la façade **MCP Tasks** existante au travail durable validé ; envisager **A2A** pour la délégation externe et **OASF** pour une fiche de capacités en lecture seule. **CMMN et agentproto sont des inspirations, pas une exigence pour H4.**

**Sortie H4 :** `export → import → change-provider → resume`, vérifié par un test reproductible. Un blocage dû à un secret non exporté est sain ; l'impossibilité de poursuivre le calcul en utilisant une nouvelle autorisation n'est pas saine.

## 5. Matrice de tests qui interdit de clore le paquet prématurément

| Scénario | Attendu |
|---|---|
| Retour de Judgment valide | Calcul d'origine repris ; résultat visible dans la projection finale |
| `needs_more_context` / jugement incertain | Nouveau besoin explicite, sans clôture artificielle |
| Deux réponses identiques | Une assimilation logique, frais physiques constatés séparément si deux appels ont réellement eu lieu |
| Deux réponses divergentes | Collision ou réconciliation explicite ; pas de `last write wins` silencieux |
| Crash avant l'envoi / après envoi sans ACK | Intention et état d'effet incertain conservés ; aucune réémission aveugle |
| Arrêt/redémarrage de la VM | Reprise par référence stable, non par closure du processus antérieur |
| Parent avec enfant | Own spending ≠ consolidated spending ; aucune ligne physique dupliquée |
| Acteur technique non mandaté | Déclaré atteignable, mais refus d'effectuer l'acte ; aucun budget indûment imputé |
| Changement de localité | Contexte minimal suffit ; l'autorité locale est vérifiée à nouveau |
| Fournisseur supprimé | Travail exportable et reprenable avec une voie alternative ou humaine |
| Trace perdue côté observabilité | Journal COP reste reconstituable ; perte signalée, sans invention de provenance |

Une batterie réussie avec des **fixtures** prouve les contrats et la reprise, **pas** le fonctionnement réel d'un fournisseur externe. Un test via ChatGPT n'est *réel* que si la chaîne navigateur → outil → retour → réveil → reprise est observée et comptabilisée ; sans mandat/claim effectif, noter explicitement la lacune.

## 6. Format minimal de l'observation / Hop report

Au terme de chaque Hop, ajouter un court rapport, avec liens vers commits et tests, plutôt qu'une deuxième étude conceptuelle. Exemple indicatif (pas un nouveau schéma COP imposé) :

```yaml
hop: H1
status: pending  # pass | fail | blocked | pending
observed_at: null
source_commit: null
locality: null
route: null
capability: {advertised: unknown, reachable: unknown, authorized: unknown, tested: unknown}
input_ref: null
continuation_ref: null
judgment_result_ref: null
resume_receipt_ref: null
accounting: {owner_packet_ref: null, spend_refs: [], reconciled: false}
trace: {local_event_refs: [], projection_ref: null, causal_chain_verified: false}
portability: {export_ref: null, import_verified: false, alternative_provider_tested: false}
checks: []
blockers: []
next_action: null
```

Ne jamais publier dans ce document public un prompt privé, un jeton, une donnée sensible, le contenu d'un paquet privé ni une référence permettant d'en deviner l'accès. Conserver les preuves complètes dans leur **localité de garde**, publier des hashes et observations non sensibles.

## 7. Frontières et refus d'architecture

- **Refuser** une deuxième source canonique de tâches ou de dépenses : utiliser le journal COP et ses projections.
- **Refuser** un mapping bijectif artificiel entre `Cognitive Packet`, `COPStep`, `Hop`, `MCP Task`, `A2A Task`, `CMMN Case` et `agentproto Dialog`.
- **Refuser** que les extensions MCP/A2A définissent les responsabilités internes de Magistral, le moteur de jugement, la taxonomie de producteurs ou l'autorité COP.
- **Refuser** une dépendance requise à une API commerciale, au navigateur ChatGPT ou à un format propriétaire pour reprendre un travail localement.
- **Refuser** la sophistication de gouvernance par confirmation répétitive : appliquer les mandats réellement en vigueur, solliciter le Principal seulement à une vraie frontière d'autorité ou d'arbitrage.
- **Refuser** le remplacement d'un résultat réel par un succès de façade (`resolve` sans `resume`, `2xx` sans effet, `taskId` sans journal, `accounting_complete` sans reçu).
- **Refuser** la normalisation de tout travail en une liste préétablie de Steps : un objectif ouvert et la découverte de l'étape suivante restent légitimes.

## 8. Prompt de reprise autonome

> Lis `JeanHuguesRobert/cogentia/research/CPKT-2026-010_cps_judgment_reprise_comptabilite_portabilite.md`, les instructions canoniques et `skills/continuation-handling/SKILL.md`. Reconstitue les états réels dans GitHub et sur les FractaNodes disponibles. Commence par H0, poursuis H1 sans créer de moteur parallèle, puis exécute H2–H4 dans les limites des mandats applicables. Exige preuves de reprise effective, accounting propre/consolidé, traces fractales, localité et sortie vers un autre fournisseur. Ne déduis jamais l'autorisation d'une capacité technique. Lorsque le traitement s'arrête, consigne la prochaine action vérifiable, les références causales et l'état exact des tests.

**Critère d'achèvement global :** *le fournisseur habituel disparaît, mais le traitement d'origine peut continuer ailleurs avec son histoire, ses coûts et ses contrôles intacts.*
