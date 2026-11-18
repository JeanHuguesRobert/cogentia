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

## 9. Point de contrôle d'exécution — 17 novembre 2026 (Cogentia #336)

**Statut : OPEN, acceptance globale non démontrée.** Ces essais ont été
réalisés sur Fracta2 avec des fichiers publics et bases SQLite jetables.
Ils ne prouvent ni que les services de production chargent cette version,
ni qu'un fournisseur réel a été appelé. Aucun email, publication de Corpus
ou autre communication externe n'a été produit par les essais.

### H0 — Premier défaut reproduit : PASS

Le producteur réel index.document_role_judgment suspendait l'indexeur
pour un document public de rôle indéterminé. Avant la correction,
cmdContinuationResolve marquait la continuation resolved avec
result_available=true et delivered=false, sans cible de réentrée,
sans exécution métier ni slot de résultat. La batterie préexistante de
continuations, SQLite, production et retour donnait 27/27 PASS sans
couvrir la réentrée métier.

### H1 — Réentrée effective : PASS sur Fracta2 isolé

Sources modifiées : scripts/cogentia.js et
scripts/lib/continuation-sqlite-repository.mjs.
Source créée : scripts/lib/public-index-judgment-reentry.mjs.
Tests créés : scripts/lib/public-index-judgment-reentry.test.mjs.

Le producteur porte désormais un resumption_target de type handler et
l'empreinte SHA-256 du document public. Le retour Judgment validé déclenche
le découpage réel du document par la fonction chunkMarkdown de l'indexeur
initial, conserve un artefact de fragments dans le slot SQLite originel
et produit une référence de reçu. L'index update suivant consomme
cet artefact, construit des fragments recherchables, débloque le document
et ne recrée pas le Judgment initial. La source documentaire n'est
pas automatiquement modifiée.

Reprise sur nouveau processus après crash entre résolution et consommation :
PASS. Deux retours identiques, même concurrents : une seule réentrée.
Deux retours divergents, même concurrents : conflit CAS et alternative
conservée localement avec statut reconciliation_required ; jamais de
last-write-wins. Handler absent et source altérée : refus. Décision
needs_more_context : nouvelle continuation causale active, sans fausse
conclusion. Onze tests sur onze PASS. Le verdict public, limité à la visibilité,
ne fabrique pas un rôle source : il ouvre une demande plus précise. Une
source modifiée crée une demande épinglée à la nouvelle version plutôt que
de réutiliser une continuation active devenue obsolète.

L'adaptateur est volontairement limité à index.document_role_judgment
et à des sources publiques. Il ne convertit pas automatiquement les
continuations historiques dépourvues d'exécuteur.

### H2 — Substituabilité : PASS avec fixtures ; live NON PROUVÉ

Les voies explicitement simulées magistral-api-fixture et
chatgpt-cps-fixture respectent un même contrat indépendant du fournisseur.
Elles produisent les mêmes fragments depuis le même document. Après
import dans une autre localité, human-copy-fixture satisfait également
ce contrat, sans session ou jeton du fournisseur initial.

Aucun appel réel à Magistral API ni au navigateur ChatGPT CPS n'a été
effectué dans cet essai. Disponibilité, acteur, mandat, PacketClaim,
autorisation d'effet, budgets et reçus du canal réel restent à vérifier.
Le coût d'un fournisseur non sollicité est NON APPLICABLE à cette fixture,
et non une consommation physique enregistrée comme zéro.

### H3 — Accounting et traçabilité : noyau PASS, intégration EN ATTENTE

Les tests ciblés Inseme COP kernel existants donnent 55/55 PASS :
packetAccounting.test.js, strict-accounting-adversarial.test.js et
accounting.test.js. Ils vérifient dépenses propres/consolidées,
non-double-comptage, événements équilibrés, conflits et réconciliation.

Ce parcours de reprise n'a produit aucune invocation fournisseur
physique. Ses reçus et artefacts sont dans la primitive SQLite, sans
second ledger. Il reste à prouver que des dépenses physiques réellement
engagées sont réservées et réglées une seule fois sur le Packet propriétaire,
puis reconstituables depuis le journal COP et FractaLog. La réussite
des tests unitaires du noyau n'est PAS cette preuve d'intégration.

### H4 — Portabilité : PASS local ; autorité COP inter-nœuds EN ATTENTE

La primitive snapshot / importSnapshot transporte les identités,
révisions, historiques, sources, résultats et slots avec vérification
des empreintes. Sur deux bases SQLite indépendantes, une continuation
résolue ailleurs reprend réellement son calcul ; un paquet encore suspendu
peut recevoir un Judgment human-copy-fixture après suppression des
variables de fournisseur. L'original n'est pas réécrit silencieusement.

Non démontrés : réadmission du mandat et du PacketClaim dans la nouvelle
localité, export des dépenses COP réelles et des reçus FractaLog, gestion
des résultats tardifs lors d'un transfert de responsabilité.

### Capacités observées

| Voie | Source | Accessible | Autorité COP de cet effet | Reality Test |
|---|---|---|---|---|
| Indexeur / SQLite local | présente | oui Fracta2 | fixture non admise COP | reprise + index update |
| Accounting Inseme | présente | tests exécutables | fixture, sans fournisseur live | 55 tests |
| API Magistral | présente | service indiqué actif, endpoint non exercé | non vérifiée | fixture seulement |
| ChatGPT navigateur CPS | présente | navigateur non exercé | non vérifiée | fixture seulement |
| Snapshot inter-localité | présente | oui, SQLite jetable | autorité non transportée | import + réentrée |

**Bilan : 27 tests préexistants + 11 tests de ce parcours + 55 tests COP =
93 succès ciblés.** Pas de schéma, Scheduler, ledger ni moteur workflow
concurrent ajouté.

**Prochain travail utile :** faire parvenir un Judgment réellement admis par
COP au même handler de réentrée ; prouver réservation, consommation
physique connue ou explicitement inconnue, règlement et reçu unique ;
reconstituer les événements locaux et leur projection fractale, puis
rejouer une migration avec réadmission du mandat et gestion du retour tardif.
Conserver le paquet et le chantier #336 ouverts jusque-là.


## 10. Deuxième passe — retour COP admis vers la réentrée métier (17 novembre 2026)

**État maintenu : OPEN, avec nouveaux résultats de réalité sur des bases jetables.**
Cette passe corrige un défaut sur le pont ONA/CPS déjà existant :
`legacy-public-judgment-resident.js` et
`legacy-public-judgment-settlement.js`. Elle ne déploie pas de nouveau
Scheduler et ne lance aucune requête vers un navigateur ou fournisseur réel.

### H1/H3 — Rejet du faux succès et reprise récupérable

**Défaut reproduit par deux tests rouges avant correction.**

1. Le résident déclarait `local_resolution_confirmed` dans le journal COP
   si un adaptateur local se contentait de retourner `{ok:true}`, même
   sans modification du SQLite local ni exécution du handler métier.
2. Après résolution dans SQLite mais avant la réentrée, un redémarrage
   pouvait enregistrer `local_resolution_confirmed` et cesser de surveiller
   le travail, sans aucun artefact calculé.

**Correction, sans schéma ni registre supplémentaire :**
- pour une continuation dotée d'une cible handler, le résident relit le
  même SQLite local et vérifie le statut `resolved`, `resumed=true`,
  `delivered=true`, le slot mémorisé, l'empreinte SHA-256 de la source et
  la concordance du reçu et de l'artefact ;
- le reçu COP final porte maintenant `local_work_status=resumed`,
  `local_output_artifact_ref` et `local_resume_receipt_ref`, avec
  causalité explicite vers le reçu `returned` déjà enregistré ;
- un résultat COP seulement `returned`, mais non `accepted` et non
  achevé par le handler/parent-join, ne suffit pas ;
- dans l'intervalle de crash, le résident réévalue l'admission COP avant
  de relancer le même CLI de reprise : l'opération est idempotente et
  sa consommation locale est revérifiée ;
- un ancien reçu COP qui prétendrait confirmer une continuation ciblée
  sans reprise vérifiée est signalé, et non considéré comme un succès ;
- une collision sur le même identifiant de reçu COP avec un contenu
  incompatible est explicitement refusée.

### H2/H3 — Réalité du contrat MCP/COP, sans prétendre à un fournisseur live

La suite `scripts/lib/public-index-cop-resident-reentry.test.mjs`
fait suivre un document public par l'indexeur réel jusqu'à sa continuation,
puis parcourt l'architecture **réelle de code** :

`COP/continuation → MCP continuation_result_submit → COP validation →
acceptation/réconciliation → résident ONA → CLI continuation resolve →
handler de réentrée → slot SQLite → index update → fragments recherchables`.

Un test utilise réellement les fonctions de noyau pour émettre une
**MandateDeclaration signée par une clé de fixture**, vérifier sa signature
par un acteur de test, réserver `max_steps=1` dans le budget d'exécution
COP, obtenir un `PacketClaim`, puis faire recevoir et traiter un
`step_result` par le véritable hôte MCP local, sans navigateur ni fournisseur
externe. La réservation est réglée **une seule fois**, y compris après
soumission répétée. L'historique COP, son engagement de topic et le reçu de
réentrée locale sont vérifiés. L'indexation reprend dans un processus
distinct : ce n'est ni un accusé de réception ni un simple passage à
`resolved`.

**Limite majeure :** le mandat de fixture est signé par une clé de
test, pas par le Principal. Le Judgment est simulé en amont du MCP
(notamment le texte `answer`). Cette vérification prouve le contrat
d'admission et la comptabilité de l'unité `max_steps`, **pas** la dépense
monétaire d'une invocation physique, la livraison du navigateur hébergé
ou le fonctionnement du service de production. Les dépenses monétaires
réelles restent inconnues et ne sont pas enregistrées comme zéro.

### Suites, observabilité et limites

- Tests de résistance : résultat accepté sans effet local, crash après
  résolution, reprise réelle sur nouveau processus, refus de reçu local
  altéré, soumission MCP répétée, règlement budgétaire unique, causalité
  entre reçu COP et artefact local.
- Les deux suites de réentrée sont ajoutées au contrôle
  `pnpm test:continuation-routing-core` pour éviter les régressions
  lors des modifications futures.
- **H4 testé plus loin :** snapshot de la continuation locale importé dans
  une seconde base SQLite, source publique identique, et journal COP neuf.
  Sans autorité locale, `preparePublicLegacyJudgmentCps` refuse la
  délégation et ne crée aucun événement. Avec une **nouvelle signature
  indépendante de fixture**, un budget de destination et un nouveau
  PacketClaim, le canal MCP de fixture accepte le Judgment, règle une seule
  unité, le résident reprend l'indexeur **dans cette nouvelle localité**,
  et le SQLite d'origine conserve son statut antérieur. Aucun jeton ou
  pouvoir de la source n'a été transféré. Ce test porte sur deux localités
  isolées sur Fracta2, **pas** encore sur un transfert réel inter-nœuds.
- Une vérification négative additionnelle refuse de confirmer dans COP une
  continuation localement reprise lorsque son événement `returned` n'a
  pas été accepté par le système CPS.
- Fracta2 : services Cogentia, MCP Cogentia et Magistral déclarés actifs
  lors du diagnostic ; inspection en lecture seule du *work frontier* :
  412 continuations locales actives, 26 CPS déclarées, 0 affectation prête
  à être dispatchée, 0 wake prêt et 1 livraison incertaine préservée.
  Ce tableau ne confère aucune admission COP à une opération nouvelle.
- La mise à jour de sources **ne constitue pas le déploiement** :
  vérifier les révisions effectivement chargées avant tout redémarrage
  ou envoi et passer par le contrôle opérationnel existant.
- Reste ouvert : essai véritable ChatGPT via le navigateur CPS autorisé
  et/ou Magistral sous mandat admis ; ventilation de chaque consommation
  fournisseur réelle vers un unique Packet propriétaire, propre/consolidé,
  trace FractaLog fédérée ; export/import du contrôle COP et réadmission
  de l'autorité dans une autre FractaLocality ; retours tardifs après
  transfert entre localités.

**Prochaine action :** inspecter les contrats de mandats et les budgets
de l'environnement cible, puis effectuer une seule exécution fournisseur
réelle et bornée lorsque la chaîne complète de reçus est disponible.
Ne pas fermer le paquet ni l'Issue #336 sur les seuls résultats de fixtures.

## 11. H4 — Reconstitution du journal COP dans une seconde localité (17 novembre 2026)

**Nouvelle preuve publiée dans Inseme** :
[commit `ff5ac68`](https://github.com/JeanHuguesRobert/inseme/commit/ff5ac68fa17e13cee0a079a9cd4540abec0b7b9b),
`packages/cop-core/test/sqlite-cop-journal-portability.node-test.mjs`.
Ce test ne crée ni ledger, ni Scheduler, ni nouveau format d'export :
il réemploie le `SqliteCopEventStore`, son `replay`/`appendBatch`,
ses engagements de topics et la projection budgétaire COP déjà existants.

- **Historique et causalité : PASS, fixture.** Événements historiques
  transférés par valeur entre deux bases SQLite distinctes, conservation
  vérifiée des identités, `parent_event_ids`, états de continuation et
  engagements cryptographiques par topic (`auditCommitments`).
- **Budget historique : PASS, fixture.** Grant, réservation puis règlement
  `max_steps=1` reconstitués dans la seconde base. Réimport du même journal
  idempotent sans deuxième règlement ; événement altéré avec hash périmé
  rejeté sans modifier les engagements.
- **Autorité : préservation du refus, pas transfert.** Un budget de
  destination nouveau et dépourvu de grant local refuse sa réservation.
  Le grant historique exporté n'est **pas** une habilitation démontrée
  à accomplir de nouveaux actes dans la nouvelle localité.
- **Validation :** 15/15 tests PASS dans les suites SQLite ciblées Inseme,
  dont le nouveau test ; `pnpm test:continuation-routing-core` Cogentia
  sur sources committées : **23/23 PASS**. Cela prolonge les tests COP→
  réentrée du commit Cogentia `4b1009fe` sans les assimiler à un essai live.

**Limite persistante :** ce transfert de journal est une reconstruction
historique, non une migration atomique des mandats, PacketClaims, dépenses
physiques ou effets externes entre FractaNodes. Il reste à prouver une
réadmission locale indépendante, le règlement des coûts fournisseurs réels,
la traçabilité FractaLog de ces actes, la réconciliation des retours tardifs
et une nouvelle exécution autorisée avec fournisseur substitué.
**CPKT-2026-010 et #336 demeurent ouverts.**

## 12. Troisième passe — reprise effective d'un Judgment **réel** déjà retourné (17 novembre 2026)

**Statut du chantier : toujours OPEN.** Ce contrôle utilise les reçus du
navigateur ChatGPT effectivement enregistrés en production, sans feindre
qu'un nouveau prompt aurait été émis pendant cette passe.

### 12.1 Prévol du canal et blocage de la nouvelle émission

- Fracta2 : le mandat signé JHN **v5** accorde
  `browser.chatgpt.turn` et `cogentia.continuation.result.submit`.
  Le worker ONA, avec son fichier secret **propre au job**, confirme
  `granted=true`, `provider_permitted=true`,
  `budget_admitted=true`. Aucun jeton n'a été extrait ou affiché.
- Le vieux tab historique échoue avec la cause diagnostiquée
  `chatgpt_target_changed`. La commande John/COP `ensure_tab`
  a trouvé le tab `94450717` ; une seconde lecture gouvernée a établi
  un composeur **stable, vide et sans génération en cours**.
  Les deux opérations disposaient de reçus COP et n'ont soumis
  **aucun message au modèle**.
- Le journal recense un enfant legacy
  `ctn_chatgpt_browser_3c19231e839be86362855e6cd87e7dc8`
  avec **un clic UI confirmé à 04:30:40 UTC** mais toujours **aucun**
  résultat MCP `returned`. Il ne peut être assimilé à un échec
  `pre_submit`, ni être réémis, libéré ou déclaré terminé sur une
  simple supposition. L'autre attente
  `ctn_chatgpt_browser_41f023c6f0492e434557a7d638fcc075`
  reste en quarantaine conservatrice. Le *single-flight* CPS interdit
  donc à juste titre un nouveau dispatch tant que l'envoi confirmé
  non retourné n'a pas reçu de disposition gouvernée. Le résultat
  peut encore revenir tardivement : aucune donnée n'a été effacée.

### 12.2 Réparation ciblée d'un ancien contrat, plutôt qu'un deuxième envoi

Les Judgments documentaires hérités ne possédaient pas le nouveau
`resumption_target`. Le prévol réel de l'historique COP a trouvé cinq
résultats legacy acceptés dont les sources restent publiées et dont les
empreintes correspondent encore au résultat reçu. **Un seul** a été
choisi pour cette démonstration.

Le nouvel adaptateur
`scripts/lib/legacy-public-index-reentry-backfill.mjs` et sa CLI
`scripts/ops/backfill-accepted-public-judgment-reentry.mjs` :

1. Vérifient conjointement le résultat MCP retourné, l'acceptation COP,
   la clôture du handler CPS, la jonction enfant/parent, le reçu de
   résolution COP, la décision et sa raison, la version publique
   `origin/main` du fichier, l'empreinte source et l'identité du
   document local déjà `resolved`.
2. Refusent sans mutation un reçu manquant, une divergence de source
   ou de décision, ou une autre cible de handler.
3. Ajoutent au **même SQLite local** le contrat du handler déjà existant
   `handler:public-document-index-judgment/v1` et l'empreinte approuvée,
   sous compare-and-swap. L'historique de décision original est conservé.
4. Lancent la véritable commande `continuation reenter`, qui utilise
   l'ancien `chunkMarkdown`, et vérifient son résultat mémorisé.
5. Écrivent un **reçu complémentaire** COP
   `local_reentry_verified`, causalement rattaché au résultat et à
   l'accusé d'origine. Le reçu ancien `local_resolution_confirmed`
   demeure immuable ; le résident sait reconnaître les deux faits.
6. Produisent une observation réelle
   `fractalog.act-record/v1` vérifiée, avec acteur, localité,
   source, référence de l'artefact, causalité et effets locaux.
   Son champ `provider_effects=0` porte **uniquement sur la nouvelle
   réentrée locale**, pas sur l'appel ChatGPT historique.

**Exécution en production :**

- Paquet : `ctn_2639cf2d`.
- Document : `cogentia/patterns/packet-backed-projection/PRIOR_ART.md`.
- Source SHA-256 : `7d53d1a27e3a09d6e7a19c11fcadc0b1464b47682810d27f836b17716b8fb3f8`.
- Décision : `source`, reçue du vrai enfant CPS
  `ctn_chatgpt_browser_fcc43114a47ea2a1c4bd63dc82ce3de5`.
- **Reprise réelle : PASS** ; 15 fragments calculés et mémorisés dans
  `reentry:public-document-index` ; `return_state.resumed=true` et
  `delivered=true`.
- Reçu complémentaire :
  `legacy-role-late-reentry:722fe5c787035cfd774456804761941c0d96`.
- FractaLog :
  `fractalog:legacy-index-reentry:722fe5c787035cfd774456804761941c0d96`,
  `act_phase=observed`; document et journal COP validés.
- Rejeu de la même commande : `already_resumed`, 15 fragments
  inchangés, mêmes reçus, **aucune nouvelle dépense fournisseur**.

**Accounting COP d'origine constaté (source canonique) :**
un clic navigateur confirmé ; un `returned`, un `accepted`,
un `handler_completed` ; une réservation de budget `max_steps=1`,
un règlement `max_steps=1`, aucun release. Le nouveau travail local
ne réserve ni ne facture une deuxième exécution de ce Judgment.
Le coût financier fournisseur (en USD/EUR) **n'est pas connu** :
un budget `max_steps` est un quota d'exécution, non une facture ;
ne surtout pas l'interpréter comme montant nul. Le FractaLog
historique fournisseur n'a pas été reconstruit artificiellement.

### 12.3 Acceptation de cette passe et limites restantes

Les tests comprennent le vrai handler dans un processus séparé,
un reçu de test COP avec historique ancien, une réparation conditionnelle,
le rejet d'une résolution sans reçu original, l'idempotence et le
FractaLog vérifiable. Un seul paquet de production a été modifié ;
aucun fichier source public, aucun mandat COP, aucun fournisseur,
aucun compte de tiers n'a été modifié.

**Reste à faire pour H2/H3/H4 complets :** une **nouvelle** émission
fournisseur distincte quand le paquet cliqué/attendant sera réconcilié
sans effacement de preuve ni seconde soumission ; une imputation
monétaire réelle si les métriques de fournisseur le permettent ;
la remontée FractaLog du Hop fournisseur puis la vue agrégée
propre/consolidée ; enfin migration effective entre deux hôtes
avec nouvelle admission locale et traitement des retours tardifs.
Les 15 fragments sont vérifiés dans l'artefact de continuation :
**leur publication dans l'index global n'est pas revendiquée**,
afin de ne pas perturber les chantiers concurrents d'indexation.

## 13. Quatrième passe — cause du retour manquant et récupération du claim (18 novembre 2026)

### Diagnostic réel avant nouvelle émission

Le navigateur gouverné John/COP a énuméré les onglets hébergés en
lecture seule, puis inspecté uniquement les trois conversations marquées
comme Judgments. L'onglet `94450708` contient bien le paquet
`ctn_chatgpt_browser_3c19231e839be86362855e6cd87e7dc8`.
Son assistant a généré une réponse documentaire structurée
(`decision=index` et justification sur un article public du magazine
1755), mais l'appel de l'outil Cogentia a échoué :

> `claim_not_valid` — aucun reçu MCP de livraison réussie.

La vraie continuation enfant est reliée au parent
`ctn_20989422` (`barons-Mariani/projects/1755/magazine/2026-10-09-une-cote-pour-la-constitution.md`).
Sa source publique publiée est inchangée (SHA-256
`f9c9646b71b8dfc7404af584fb0e0cf3af6a9420b0eb2383f1878edb2494e941`).

**Cause FBF :** le `PacketClaim` déclaré à l'époque **1** a expiré
le 16/11/2026 à 21:54 UTC. Le dispatcher a correctement récupéré
un claim époque **2** avant le clic John confirmé du
17/11 à **04:30:40 UTC**, mais le récepteur MCP
`cogentia-mcp-judgment-result-host.js` vérifiait
**exclusivement le claim original époque 1** de la déclaration immuable.
Le claim époque 2 a lui aussi expiré depuis. Ni un nouveau prompt ni
une mise à zéro de l'historique ne sont des corrections légitimes.

### Correction générique sous contrôle COP

- `scripts/lib/cps-effective-result-claim.mjs` projette la chaîne
  exacte `declared claim → recovery_claim_rebound → éventuelle
  late_return_claim_rebound` depuis le **même journal COP** ;
  vérifie la génération, l'acteur, les époques, le claim actuellement
  détenu, son expiration et les références causales. Le récepteur MCP
  utilise cette projection au lieu d'un claim obsolète.
  Aucune expiration n'est ignorée, aucun grant n'est inventé.
- `scripts/lib/cps-visible-result-recovery.mjs` récupère uniquement
  une **réponse déjà émise** après un clic confirmé, dans la conversation
  propriétaire. Il vérifie le paquet, sa source publique inchangée,
  la réservation initiale, une réponse unique au format attendu,
  et **un reçu de lecture John réellement réglé dans COP**.
  Il conserve l'empreinte du texte visible, sans transcrire
  l'ensemble de la conversation. Sous admission signée et permission
  fournisseur indépendantes, il réclame **un nouvel et unique
  PacketClaim**, puis lie ce claim à l'ancienne livraison et à
  l'observation par un événement causal distinct.
- `scripts/ops/reconcile-cps-visible-browser-result.mjs` est une
  recette opératoire réutilisable `--preview / --apply` :
  `--apply` exécute uniquement une observation John du navigateur,
  **jamais un nouveau clic Send**, puis présente le Judgment
  reconstruit au **vrai canal MCP** avec l'authentification JHN,
  sa corrélation d'origine et une `usage_observation` indiquant
  explicitement `direct_model_tool_submission=false`.
  L'issue `returned` doit être vérifiée avant tout succès revendiqué.
  Un résultat sans reçu reste bloqué, même si le modèle « a répondu ».
- Un FractaLog idempotent `fractalog.act-record/v1` représente le
  **retour reconstruit** : références du clic historique, de la lecture
  John, du nouveau claim, du reçu MCP `returned` et du règlement
  `max_steps=1`, sans imputer artificiellement une dépense fournisseur
  nouvelle ou inventer son coût monétaire d'origine.

**Tests :** le contrôleur effectif refuse un claim expiré, un acteur
étranger, un faux événement sans causalité et une génération différente.
Le scénario complet en SQLite jetable utilise une vraie délégation
signée de fixture, une lecture John avec reçu budgétaire, un claim
repris à l'époque suivante, le vrai récepteur MCP, la clôture du COP
Scheduler, le retour au vrai handler d'indexation, le FractaLog et
l'idempotence du règlement COP. Les coûts `max_steps` distincts de
la lecture John et du Judgment sont comptés séparément.

**État à ce stade de publication du code :** prévisualisation
*production* `eligible_for_visible_recovery` confirmée **sans mutation**.
Le correctif du récepteur doit être chargé par le serveur MCP avant
toute soumission du résultat de production. Une simple suite verte
ne doit pas être confondue avec cette admission réelle ; consignation
des reçus du nouvel essai à suivre si le déploiement est possible.
