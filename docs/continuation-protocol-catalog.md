---
title: "Catalogue facultatif des protocoles de continuation"
subtitle: "Conventions connues, implémentations vérifiées, continuation ouverte"
status: working-paper
last_modified_at: 2026-11-17
language: fr
visibility: public
document_role: architecture
document_kind: technical-note
---

# Catalogue facultatif des protocoles de continuation

**Principe : une Continuation peut décrire n'importe quel travail restant à
accomplir ; un protocole connu en facilite l'interprétation, sans constituer
une condition de validité de la Continuation.** Un paquet cognitif peut
transporter la description nécessaire par copie ou par référence, y compris
quand aucun catalogue n'est présent. Ceci conserve la règle de diffusion
sans serveur ni registre de [Cognitive Packets §7.3](../research/cognitive_packets.md).

## Trois abstractions à ne pas confondre

1. **Continuation** — relation entre un état du travail et les possibilités de
   reprise ; elle peut être un retour de fonction implicite, un curseur local,
   un script successeur, une demande à un LLM, une intention ouverte, etc.
2. **Protocole de continuation** — convention *facultative* et versionnée :
   description, champs attendus, interprétation, résultat, préconditions et
   traitement des incertitudes. Une Continuation inconnue reste interprétable
   par une personne ou un agent, sans prétendre qu'un exécuteur existe.
3. **Implémentation / acteur** — interprète concret pouvant exécuter tout ou
   partie du protocole sur un FractaNode. La disponibilité de l'implémentation,
   les permissions COP, le budget, le PacketClaim et la preuve de ses effets
   sont **indépendants** de l'identification du protocole.

Il faut aussi distinguer la **classe du producteur** (pourquoi il externalise
le travail : attente, jugement, composition, etc.), la **forme de reprise**
(où reprendre) et le **protocole d'interprétation** (convention partagée pour
comprendre la forme et ses résultats). Un même producteur peut proposer
plusieurs protocoles ; un même protocole peut être utilisé par plusieurs
producteurs, voire interprété par un humain sans logiciel spécialisé.

## Un catalogue ouvert, non obligatoire

La bibliothèque pure `scripts/lib/continuation-protocol-catalog.mjs` publie
`createContinuationProtocolCatalog({extensions: []})` et la liste descriptive
`KNOWN_CONTINUATION_PROTOCOLS`. Aucun registre central, connexion, daemon,
file, schéma de paquet obligatoire ou nouvel émetteur de mandat n'est requis.

```bash
node scripts/ops/list-continuation-protocols.mjs
node scripts/ops/list-continuation-protocols.mjs --id=cogentia.open-objective/v1
```

Chaque fiche contient un identifiant versionné, une définition sémantique,
un exemple de payload, l'état **précis** de l'implémentation, le lien vers le
code ou la recherche existante, les conditions de résultat et la frontière
d'autorité. `inspect({protocol_id, payload})` vérifie seulement si une
**description** respecte les exigences minimales d'un protocole connu.
`execution_authorized` reste `false` par construction. Un identifiant inconnu
retourne `unrecognized_protocol` et `interpretation_required`, **pas** une
invalidité de la Continuation ou une commande d'exécution.

Un paquet peut déclarer, à titre purement indicatif :

```yaml
continuation:
  protocol_ref: cogentia.open-objective/v1
  protocol_payload:
    objective: "Trouver la prochaine action utile"
    context_ref: packet:research
```

L'absence de `protocol_ref` est admise et normale. Le champ ci-dessus est une
**convention recommandée**, pas un nouveau champ obligatoire de
`cop/continuation` ni une migration du corpus existant.

## Protocoles initialement recensés

| Protocole | Interprétation | Niveau d'implémentation réellement vérifié |
|---|---|---|
| `cop.packet-task-step-cursor/v1` | Faire avancer un curseur de `COPStep` dans l'historique d'un paquet | Curseur CAS persistant réel ; **pas** d'exécuteur de Step |
| `cogentia.process-command/v1` | Nouveau programme ou script + arguments | Validateur de descripteur ; **pas** d'exécution générique |
| `cogentia.handler-resume/v1` | Reprise par un handler référencé | Validateur de descripteur ; résolution/exécution spécifiques au runtime |
| `cogentia.typed-judgment/v1` | Question ou prompt et contrat de réponse | Adaptateur CPS réel **spécialisé** pour documents publics |
| `cogentia.open-objective/v1` | Objectif ouvert sans séquence prescrite | Convention descriptive, sans interprète général |
| `cop.packet-parent-continuation/v1` | Filier un enfant et gérer le `join` au parent | Composition COP effective sous événement causal |
| `cop.continuation-result/v1` | Recevoir/corréler un résultat | Observateur de résultat, distinct de `resolved`/`assimilated` |
| `cogentia.await-dependency/v1` | Attendre une ressource ou une condition | Convention documentée, pas de réveil générique |

Aucune de ces huit fiches ne prétend épuiser les représentations possibles.
En particulier, `return` natif, `call/cc` en mémoire et closures JavaScript
ordinaires **n'ont aucun besoin** d'un protocole sérialisé ni d'un enregistrement
COP. Leurs contextes internes ne sont pas transportables tels quels.

## Inspirations provenant des protocoles d'interaction existants (17/11/2026)

**Important : invocation, transport, continuation durable et COP ne sont pas
le même niveau de protocole.** Une opération MCP, un appel Unix ou une
requête HTTP sont des méthodes d'interaction qui peuvent servir de *support*
à une continuation. Le travail restant et ses critères de résolution ne sont
pas automatiquement définis par ces seuls appels. Pour le catalogue, proposer
une **fiche d'adaptateur interopérable** avec un contrat de normalisation,
plutôt que de déclarer tous les appels RPC comme de nouvelles entités COP.

| Protocole externe connu | Convention qu'on peut réutiliser | Partie à fournir pour une continuation distribuée |
|---|---|---|
| **Unix process/pipe** | `program + argv + env + cwd`, `stdin`, `stdout`, `stderr`, code de sortie, signal, délai | Identité du travail, garde des effets, checkpoints, résultat interprété, éventuelle reprise après crash |
| **MCP `tools/call`** | Outil découvert, argument `inputSchema`, résultat (dont `structuredContent`), `isError`, JSON-RPC | Correlation avec la continuation d'origine, retour/réentrée du parent, gestion des effets incertains |
| **MCP Tasks extension (2026-07-28)** | `resultType: task`, identifiant `taskId`, `tasks/get`, `tasks/update`, `tasks/cancel`, polling et résultat différé | Négociation effective de l'extension, traduction de l'identifiant distant en référence locale pérenne, TTL, réconciliation après déconnexion |
| **MCP Multi Round-Trip Requests (2026-07-28)** | `resultType: input_required`, demandes complémentaires, `request_state` et `input_responses` pour reprendre l'appel | Valider l'origine de la demande, son éventuelle autorité, associer la réponse à l'appel suspendu sans confusion avec un nouveau mandat |
| **HTTP/OpenAPI** | `method`, URL, en-têtes, schémas requête/réponse, code HTTP et description `operationId` | Distinguer réponse de transport, opération acceptée, effet réalisé et fin du travail ; gérer idempotence, timeout, suivi différé |
| **gRPC** | RPC unaire et streaming client/serveur/bidirectionnel, status et métadonnées | Encadrer les checkpoints, le résultat d'un flux inachevé et la reprise après rupture de connexion |
| **Webhooks / événements** | Push d'événement et identifiant de livraison (`X-GitHub-Delivery`), vérification d'authenticité, livraison potentiellement répétée | Corrélation causale à la continuation, déduplication, attente conditionnelle et réconciliation en cas de silence |
| **Workflow / états métier** | Transitions, conditions, branches, compensations et critères d'achèvement | Adapter la sémantique métier sans prétendre que le catalogue lui-même est un nouvel ordonnanceur |

La même interface de haut niveau peut interpréter ces formes **sans écraser
leurs différences** :

```text
Continuation (ce qui reste à faire)
    └── protocole d'interprétation facultatif, versionné
          └── adaptateur d'interaction (Unix, MCP, HTTP, ...)
                └── effet réel, seulement si admis
          ↖ résultat / signal / état différé / erreur / incertitude
    ↖ interprétation, historisation et réentrée de la continuation d'origine
```

Un adaptateur spécialisé devrait au minimum décrire : `prepare` (enveloppe et
arguments), `invoke` (capacité technique ; **jamais** autorisée implicitement),
`observe` (réponse, erreur ou incertitude), `correlate` (identifiant de
l'opération et résultat), `normalize` (sémantique de retour dans le paquet) et
une politique explicite de `retry/resume/abort`. Il ne faut **pas** forcer un
prototype commun de fonction à tous ces transports : le streaming, les
callbacks et les résultats différés peuvent réclamer des méthodes différentes.

### État réel dans les dépôts

- **Unix : déjà exécutable dans un contexte gouverné** —
  `scripts/lib/unix-process-provider.js` réalise la capacité existante
  `host.process.run` (captures de sorties, code/signal, délai). Les contrôles
  d'autorité sont dans le routeur de capacités, *pas* dans la reconnaissance
  du protocole. Inseme dispose aussi de
  `packages/cop-kernel/src/stdio.js`, avec lecture/écriture de Cognitive
  Packets sur des flux de processus.
- **MCP : déjà un transport d'effets existant** —
  `scripts/ops/run-chatgpt-cps-browser-loop.mjs` utilise effectivement
  `tools/call`, JSON-RPC et le résultat structuré de `cogentia_john_run`.
  Son cœur `scripts/lib/cogentia-mcp-core.js` connaît effectivement les
  révisions **2025-11-25** et **2026-07-28** et implémente
  `server/discover`. En revanche l'inspection du cœur ne trouve pas de
  traitement `tasks/get`, `tasks/update`, `tasks/cancel` ni de reprise
  `input_required` ; **l'extension Tasks et MRTR ne sont pas implémentées
  par ce chemin vérifié**. La négociation du cœur moderne n'est donc pas une
  preuve de compatibilité avec ces extensions, lesquelles demandent une
  découverte explicite et des tests bout en bout distincts.
- **HTTP/OpenAPI, gRPC, webhooks** : sources d'inspiration et candidats
  d'adaptateurs ; cette note **n'installe aucun** adaptateur supplémentaire.

### Précautions de sémantique

Un `exit_code=0` confirme normalement la fin réussie d'un **processus selon
sa convention**, pas la réalisation de l'objectif cognitif. Une réponse
`tools/call` avec `isError=false` ne prouve pas un effet durable, pas plus
qu'un `2xx` HTTP ne garantit un travail métier accompli. Inversement,
`stderr` peut contenir des traces purement informatives. En MCP, il ne faut
pas confondre l'ID d'une requête JSON-RPC avec un identifiant de
continuation durable ou une clé d'idempotence métier.

Les **Tasks MCP** sont un modèle directement pertinent mais facultatif :
leur identifiant durable, leurs statuts et leur consultation diffèrent d'un
simple appel synchrone. Le **MRTR** ressemble à une continuation à entrée
requise, avec état opaque réinjecté lors de l'appel suivant. Chaque évolution
MCP est liée à une version de protocole et à une négociation effective ; ne
pas transposer aveuglément une ancienne spécification à un serveur actuel.

Sources normatives et pratiques :
[MCP 2026-07-28 — modèle général](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/index.mdx),
[MCP Tasks extension](https://tasks.extensions.modelcontextprotocol.io/specification/2026-07-28/tasks),
[MCP MRTR](https://blog.modelcontextprotocol.io/posts/2026-07-28/),
[MCP stdio](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/stdio.mdx),
[OpenAPI](https://spec.openapis.org/oas/v3.1),
[gRPC](https://grpc.io/docs/what-is-grpc/core-concepts/),
[GitHub webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks).

## Ajouter un protocole sans modifier l'infrastructure

Un acteur peut fournir la description d'une convention supplémentaire :

```js
import {createContinuationProtocolCatalog} from
  '../scripts/lib/continuation-protocol-catalog.mjs';

const catalog=createContinuationProtocolCatalog({extensions:[{
  protocol_id:'example.human-instruction/v1',
  title:'Instruction libre',
  semantics:'Une personne ou un agent interprète le travail encore à faire.',
  completion:'Rapporter les résultats et, si nécessaire, une nouvelle continuation.',
  payload_example:{instruction:'Poursuivre les recherches'},
}]});

catalog.inspect({protocol_id:'example.human-instruction/v1',
  payload:{instruction:'Examiner les sources restantes'}});
// known: true, payload_valid: null, execution_authorized: false
```

Une extension locale est **auto-décrite, non installée** : son ajout ne charge
pas de code, n'installe pas de validateur arbitraire, n'autorise pas de modèle
ou de shell, et ne modifie aucun registre global. Pour une prise en charge
réelle, il faut fournir un interprète distinct, des tests, des règles
explicites d'admission et des reçus conformes à la politique des effets.

## Règles de compatibilité et d'évolution

- **Versionner les changements incompatibles** d'interprétation ou de
  résultat (`.../v2`), sans réécrire les anciens paquets.
- Un producteur peut annoncer un protocole **par référence** et, si la
  destination ne le connaît pas, joindre **par copie** les instructions
  nécessaires à son interprétation. L'auto-description n'est pas une preuve
  de vérité ou de provenance.
- Le routage peut préférer un interprète connu, mais la connaissance du
  protocole n'implique **ni disponibilité**, **ni droit d'exécuter**.
- Les effets incertains, les réémissions, la température `Parked` et les
  reprises concurrentes restent régis par les mécanismes existants de COP ;
  le catalogue ne constitue **pas une deuxième autorité**.
- Ne pas inférer un protocole du seul texte d'une continuation ancienne :
  attribuer `unrecognized` ou `needs_producer_evidence` lorsque nécessaire.
- Composer plusieurs protocoles est permis, mais chaque transition conserve
  son identité, son résultat et les preuves nécessaires à la réconciliation.

Ce catalogue fournit **la documentation et la validation des conventions**, pas
un exécuteur universel de tâches. L'objectif du chantier
[Cogentia #336](https://github.com/JeanHuguesRobert/cogentia/issues/336) reste
le raccordement progressif de producteurs et d'interprètes concrets, sans
forcer toutes les continuations à devenir des paquets gouvernés.
