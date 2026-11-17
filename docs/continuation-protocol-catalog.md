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
