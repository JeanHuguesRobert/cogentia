---
title: "MCP Tasks 2026-07-28 — façade de continuations COP"
subtitle: "Négociation standard, suivi durable et interopérabilité avec les agents"
author: unknown
affiliation: unknown
date: null
license: unknown
status: working-paper
last_modified_at: 2026-11-23
language: fr
visibility: public
document_role: source
document_kind: technical-note
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# MCP Tasks : standardiser un savoir-faire d'interaction

L'évolution de [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
illustre la même tendance que le catalogue Cogentia : un agent ne doit pas
réapprendre une convention d'interaction pour chaque nouvelle capacité.
La norme décrit **comment interagir**, pas le résultat métier précis que
l'outil atteindra. L'extension facultative
[Tasks](https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html)
normalise la demande de travail différé, la consultation de son état, la
fourniture d'informations complémentaires et l'annulation coopérative.

Ce protocole n'épuise ni la définition d'une Continuation, ni celle d'un
Cognitive Packet, ni la coordination COP. Il rend ces notions **accessibles
à des clients MCP qui ne connaissent pas Cogentia**.

## Contrat de découverte et négociation

La révision 2026-07-28 est **sans session de protocole** et ne demande plus
le couple classique `initialize` / `initialized`. `server/discover` est
obligatoire côté serveur, facultatif côté client. Les requêtes modernes
transportent leur version et leurs capacités dans `params._meta` ; il ne faut
pas inférer une capacité facultative du seul numéro de version.

Dans `server/discover`, un serveur ayant réellement installé l'extension
annonce :

```json
{"capabilities":{"extensions":{"io.modelcontextprotocol/tasks":{}}}}
```

Le client compatible annonce **sur chaque requête concernée** :

```json
{
  "jsonrpc":"2.0",
  "id":"req-1",
  "method":"tools/call",
  "params":{
    "name":"some_tool",
    "arguments":{"objective":"Produire un inventaire"},
    "_meta":{
      "io.modelcontextprotocol/protocolVersion":"2026-07-28",
      "io.modelcontextprotocol/clientCapabilities":{
        "extensions":{"io.modelcontextprotocol/tasks":{}}
      }
    }
  }
}
```

Il n'est alors **pas nécessaire d'expliquer au client** ce que sont
`taskId`, `tasks/get`, `tasks/update` et `tasks/cancel` : ils ont une
sémantique normalisée que le client a déclaré prendre en charge. Mais
**MCP moderne seul ne suffit pas** : l'annonce de l'extension reste
indépendante et facultative. Les clients anciens conservent leur flux MCP
normal. Une Task n'est pas créée pour chaque `tools/call` : le serveur peut
choisir de retourner directement un résultat `resultType: "complete"`.

## Traduction MCP ↔ COP

| Façade MCP | Substrat COP / Cogentia | Limite à respecter |
|---|---|---|
| `tools/call` | Demande de capacité avec arguments, autorisation et provenance | Une demande ne vaut pas résultat, et n'accorde aucune autorisation supplémentaire |
| `resultType: "task"`, `taskId` | Handle durable corrélé à une continuation ou mission | Ne retourner le handle qu'une fois la Task effectivement créée et interrogeable |
| `tasks/get` | Projection du journal canonique : état, résultat, demandes d'entrée | Chaque lecture est autorisée pour cet appelant ; pas de divulgation d'autres paquets |
| `status: "working"` | Travail en cours / en attente interne | Un `Parked` n'est pas automatiquement un échec définitif |
| `status: "input_required"` | Continuation attendant une réponse ou une clarification | `inputRequests` ne deviennent pas plus fiables en passant par Tasks |
| `tasks/update` | Réponse corrélée à une demande d'entrée pendante | Accusé de prise en compte, pas garantie que le travail a déjà repris |
| `tasks/cancel` | Intention d'annulation et réconciliation | Coopératif et éventuellement concurrent avec la fin du travail |
| `status: "completed"`, `result` | Résultat normalisé et historisé | Peut correspondre à `isError: true` d'un outil ; ne signifie pas succès métier |
| `status: "failed"`, `error` | Échec de la Task elle-même | Distinguer d'une erreur métier dans une Task terminée |

Le `taskId` MCP est un **handle public à portée d'un client**, pas
nécessairement l'identité canonique du Cognitive Packet. Il doit être
non prédictible et relié par un mécanisme de correspondance à une tâche
réelle, sans révéler d'identifiants confidentiels. Il n'est ni un droit
d'exécuter ni une autorisation d'accéder à toutes les continuations.

L'annulation ne supprime pas l'histoire. Le `tasks/cancel` standard est une
**intention coopérative** : son accusé ne prouve pas que le travail ait été
stoppé. Le résultat peut encore arriver, et COP doit pouvoir le réconcilier.
L'extension fournit aussi des notifications facultatives sur les Tasks ; le
polling via `tasks/get` suffit pour un premier adaptateur portable.

## État exact du code au 17 novembre 2026

`cogentia-mcp-core.js` connaît les versions `2025-11-25` et `2026-07-28`.
Le module `scripts/lib/mcp-tasks-2026-contract.mjs` et son raccordement
optionnel à `createMcpCore(...,{mcpTasksAdapter})` ajoutent :

- contrôle de l'annonce `io.modelcontextprotocol/tasks` **par requête** ;
- publication de l'extension côté serveur seulement lorsqu'un adaptateur
  déclarant un stockage durable et les méthodes requises est configuré ;
- traitement des requêtes standard `tasks/get`, `tasks/update`, `tasks/cancel` ;
- retour `resultType:"task"` seulement après création et relecture du
  `taskId` sous le même contexte d'appel ;
- préservation des restrictions existantes d'accès aux outils privés ou
  mutateurs avant toute création de Task ;
- réponse `reconciliation required` si l'issue de création est ambiguë :
  **pas de seconde invocation automatique**.

**Il s'agit d'une façade prête à recevoir un adaptateur, pas encore d'une
Task MCP active sur la production Cogentia.** Aucun `mcpTasksAdapter` persistant
n'est branché au service actuel et aucun `taskId` réel n'est exposé. La
simple présence du code et du support de version ne justifie pas l'annonce
des capacités. Une déclaration d'adaptateur `durable:true` doit être auditée
contre le vrai store, pas simplement crue sur parole. Les tests emploient
un adaptateur fictif *réellement persisté* dans un journal SQLite jetable.

Les travaux restants sont de brancher un adaptateur COP concret :
identifiant opaque et non devinable, liaison sûre à l'appelant, état
reconstructible et résultat conforme à la spécification, opérations
idempotentes, contrôle de confidentialité de chaque `tasks/get/update/cancel`,
annulation et compensation causales, et retour de résultat au parent.
La prise en charge des notifications `notifications/tasks` et des abonnements
`subscriptions/listen` peut être ajoutée indépendamment du polling.

## Point FBF — raccordement progressif au 23 novembre 2026

La façade MCP Tasks est déjà intégrée au noyau Cogentia et ses tests
utilisent le vrai journal événementiel SQLite COP. En revanche, **l'adaptateur
persistant de production n'est pas encore installé** : annoncer le support
effectif de Tasks sur la seule base du numéro de protocole serait un bug de
conformité. Le test de contrat a été réaligné sur les métadonnées obligatoires
de chaque requête MCP moderne. Ses huit tests passent.

Le test COP ne se contente plus d'acquitter fictivement `tasks/update` et
`tasks/cancel` : les demandes d'entrée et d'annulation sont journalisées,
vérifiées après réouverture du store et distinguées de leur effet ultérieur.
Une annulation demandée n'est pas une exécution déjà interrompue.

Trois niveaux doivent être raccordés, sans créer trois identités canoniques :

1. **MCP Tasks** : poignée publique `taskId`, opérations standard de
   consultation, fourniture d'entrée et demande d'annulation, autorisées
   pour le demandeur effectif.
2. **COP** : Paquet Cognitif canonique, événements et résultats persistants,
   coordination, reprise et autorisation. `COPJobScheduler` fournit une vue
   d'ordonnancement mais sa table `jobs` en mémoire n'est pas, à elle seule,
   une garantie de persistance.
3. **l9 (Inox, héritier de l8)** : tâches et continuations locales. La
   révision publique du 23 novembre comporte une `task/class` et des
   méthodes de pause/reprise/fork/spawn ; toutefois `make.task` est encore
   explicitement marqué *stub*. `npm run test:l9` réussit 16/16 tests de
   bootstrap et d'exécution de base, **sans valider la tâche locale complète**.

Le premier test d'intégration pertinent est donc **MCP ↔ COP**, sur un
Paquet existant et un journal COP durable, avec retour `taskId` uniquement
après création attestée, `tasks/get` après redémarrage, `tasks/update`
journalisé, `tasks/cancel` coopératif et même autorité contrôlée à chaque
appel. Le lien **COP ↔ l9** doit ensuite être testé à une frontière locale
effective, après stabilisation du constructeur l9. Ce découpage n'impose
ni nouveau scheduler global, ni identité de travail supplémentaire.

## Reality Test MCP ↔ COP — 23 novembre 2026

**État : validé en bac-à-sable, pas activé sur le serveur de production.**

Le pilote `scripts/lib/mcp-tasks-cop-pilot.mjs` relie désormais le contrat
MCP 2026-07-28 au **journal événementiel SQLite COP existant**, sans nouveau
stockage, sans nouveau scheduler et sans identité canonique de Job.
`taskId` est une poignée opaque ; le travail conserve sa référence de
Paquet Cognitif dans l'événement de création. L'adaptateur n'est pas branché
automatiquement dans `scripts/cogentia-mcp-http.js`.

Le test `scripts/lib/mcp-tasks-cop-pilot.test.mjs` exerce :

- création d'une Task par `tools/call`, annoncée seulement avec un adaptateur
  configuré et l'extension client déclarée ;
- relecture `tasks/get` après fermeture et réouverture du journal COP
  et recréation du noyau MCP ;
- demande d'entrée `input_required`, réponse `tasks/update` journalisée ;
- exécution d'un **vrai outil Cogentia en lecture seule**, stockage COP du
  résultat, livraison par `tasks/get`, et non-réexécution après résultat ;
- `tasks/cancel` comme demande coopérative durable ; si la demande précède
  l'acquisition du travail, le worker confirme `cancelled` sans l'exécuter ;
- lecture et modification limitées à l'identité de l'appelant dans
  l'adaptateur (le mode anonyme n'est autorisé que par le banc de test) ;
- véritable échange HTTP MCP avant et après recréation du serveur de test.

**Résultat observé : 13/13 tests réussis** en exécutant ensemble le pilote
et les tests du contrat existant. Le test HTTP utilise un serveur éphémère
lié au noyau MCP de test, pas le déploiement Cogentia en production.

Limites restantes pour un premier déploiement : adapter le pilote au
routage COP du travail réel, à la récupération des exécutions interrompues
sans double effet, au registre des capacités autorisées et à l'attestation
du Principal et des acteurs du transport HTTP effectif. Le worker de pilote
est déclenché explicitement ; une simple création de Task ne constitue
donc pas encore un ordonnancement autonome. Aucun support Tasks ne doit être
annoncé publiquement avant l'intégration et le test de ces raccordements.

Le raccordement l9 demeure séparé : la suite de bootstrap Inox ne prouve
pas encore le fonctionnement complet de `make.task` et de son scheduling.

## Raccordement à l'ordonnanceur COP — Reality Test du 23 novembre 2026

L'étape suivante du pilote utilise **les deux ordonnanceurs existants dans
Inseme** : `COPJobScheduler` enregistre la vue d'ordonnancement et
`COPScheduler` invoque le handler. L'adaptateur
`scripts/lib/mcp-tasks-cop-scheduler.mjs` projette dans ces composants
les demandes déjà durables dans le journal événementiel COP. Il n'ajoute
ni nouveau scheduler, ni seconde base de données, ni autorité d'exécution.

Un appel MCP `tools/call` peut désormais produire un `taskId` puis, sans
appel manuel au worker, provoquer le dispatch COP d'un véritable outil en
lecture seule et la livraison différée du résultat par `tasks/get`. Le
Reality Test HTTP complet vérifie ce parcours avant et après redémarrage.

**Invariants désormais testés :**

- un état `input_required` bloque effectivement l'admission par COP,
  reste suspendu après redémarrage et ne reprend qu'après
  `tasks/update` et journalisation de la réponse ;
- les tâches durablement créées mais non revendiquées peuvent être
  reprogrammées après redémarrage ; celles déjà revendiquées restent
  en **issue incertaine à réconcilier**, sans nouvelle invocation aveugle ;
- une référence de Paquet Cognitif n'est **pas fabriquée** à partir du
  `taskId` : le journal COP est réel, mais son identifiant de Topic ne
  prouve pas l'existence d'un Paquet canonique distinct ;
- le handler est résolu par COP et ne s'exécute que si l'hôte fournit
  une identité de dispatch admissible ; l'identité stockée dans un
  événement ne constitue pas un jeton d'autorisation.

**Périmètre :** banc d'essai, ordonnanceurs COP et journal SQLite COP ;
la programmation d'une Task ne requiert plus l'appel direct à
`pilot.run()` dans le scénario HTTP. Le banc utilise uniquement
`allowAnonymous` et un résolveur d'identité fictif dans son
environnement isolé. Les suites de contrat, du premier pilote et de
l'ordonnanceur doivent passer ensemble avant intégration.

**Vérification supplémentaire :** le même pilote a été exécuté avec
`apps/platform/mcp/cop/sqliteRuntimeStore.js` d'Inseme et ses tables
portables `cop_events`, au lieu du seul journal SQLite autonome du
noyau COP. La création, le dispatch par COP, la livraison et la relecture
après réouverture du stockage passent également. Les suites MCP Tasks,
pilote et ordonnanceur totalisent désormais **20 tests réussis**.
Cela confirme la compatibilité des interfaces du stockage COP de plateforme
pour ce profil, sans établir le choix du magasin de production.

**Frontière suivante :** identifier le store et le routeur COP effectivement
déployés,
fournir au worker la résolution effective des mandats et des capacités,
réconcilier les claims interrompus par un résultat observable ou un
jugement, et raccorder le bootstrap du service HTTP réel. Le pilote
n'est pas une preuve de conformité de ces composants de production ;
l'extension Tasks doit rester non annoncée tant que le montage n'est
pas effectivement déployé et contrôlé.

## Analogie avec les codes de procédure

Un code de procédure juridique est également un **protocole de mise en œuvre
de capacités institutionnelles**, mais il définit en outre la compétence,
la recevabilité, les délais et les effets normatifs des actes. L'agent qui
sait appliquer ce code peut enchaîner les actes reconnus sans redécouvrir la
procédure à chaque dossier. De même, un agent MCP qui a déclaré Tasks
comprend ses conventions de consultation et de réponse. Les deux usages
bénéficient de la **standardisation de la procédure plutôt que de la
prédétermination des résultats**.

Toutefois, la connaissance d'un code juridique n'habilite pas son lecteur à
exercer toutes les compétences prévues ; symétriquement, connaître un
protocole MCP ne crée ni mandat COP, ni droit de divulguer des données,
ni permission d'utiliser un fournisseur. Le catalogue de protocoles
facilite les opérations sans devenir une nouvelle source d'autorité.

Suivi : [Cogentia #336](https://github.com/JeanHuguesRobert/cogentia/issues/336).
