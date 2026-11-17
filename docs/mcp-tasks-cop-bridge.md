---
title: "MCP Tasks 2026-07-28 — façade de continuations COP"
subtitle: "Négociation standard, suivi durable et interopérabilité avec les agents"
status: working-paper
last_modified_at: 2026-11-17
language: fr
visibility: public
document_role: architecture
document_kind: technical-note
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
