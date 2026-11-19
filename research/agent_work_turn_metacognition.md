---
title: "Agents, travaux, Turns et observation — continuité cognitive gouvernée"
subtitle: "Synthèse architecturale du 19 novembre 2026 : responsabilité, délégation, FractaGenesis, méta-observation et Sleep Cycle"
author: "Jean Hugues Noël Robert, baron Mariani"
ai_assisted_by:
  - "ChatGPT GPT-6 — synthèse architecturale"
date: "2026-11-19"
last_modified_at: "2026-11-19"
version: "0.1.2"
status: "working-paper — synthesis of Principal decisions and hypotheses"
license: "CC BY-SA 4.0"
language: "fr"
document_role: source
document_kind: research-note
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/agent_work_turn_metacognition.md"
tags:
  - cognitive-packet
  - cps
  - cop
  - agent
  - work
  - turn
  - continuation
  - fractagenesis
  - fractacognition
  - sleep-cycle
  - observability
  - fractadashboard
provenance:
  origin_type: conversation
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: unknown
  origin_date: "2026-11-19"
  derived_from:
    - "research/cognitive_packets.md"
    - "research/packet_continuation_machine.md"
    - "research/cognitive_packet_switching.md"
    - "research/fractaxxxx.md"
    - "research/mandate_reasonable_agency.md"
    - "research/individual_and_collective_digital_twins.md"
    - "research/fractacognition_principles.md"
    - "research/memory_and_corpus_sleep_cycle.md"
    - "research/CPKT-2026-006_fix_bugs_first_dashboard_handoff.md"
review:
  status: unreviewed
  reviewed_by: []
---

# Agents, travaux, Turns et observation

## 0. Portée et statut des propositions

Cette note consolide une réflexion du Principal du 19 novembre 2026. Elle relie les doctrines existantes ; elle ne crée ni protocole, ni ordonnanceur, ni base de tâches, ni privilège supplémentaire. Les **invariants conceptuels proposés** ci-dessous n'attestent pas leur réalisation dans les services déployés. Le nom **FractaGenesis est adopté** par le Principal ; ses opérations restent à spécifier et éprouver. **FractaDashboard** désigne ici une surface candidate de navigation, pas un produit déclaré opérationnel.

Sources de sens à conserver : [Cognitive Packets](cognitive_packets.md), [Packet/Continuation Machine](packet_continuation_machine.md), [Cognitive Packet Switching](cognitive_packet_switching.md), [FractaXXXX](fractaxxxx.md), [Mandate — Reasonable Agency](mandate_reasonable_agency.md), [FractaCognition](fractacognition_principles.md), [Corpus Sleep Cycle](memory_and_corpus_sleep_cycle.md), [Fix Bugs First dashboard](CPKT-2026-006_fix_bugs_first_dashboard_handoff.md). Les interfaces et protocoles MCP/A2A sont des surfaces, pas les sources de vérité du travail.

## 1. Ontologie minimale — ne pas confondre les entités

| Entité | Identité et rôle |
| --- | --- |
| **Principal** | Sujet humain ou personne morale qui détermine les finalités et détient l'autorité légitime ; non assimilable à son Twin. |
| **Twin** | Représentation cognitive gouvernée d'un sujet. Un sujet peut posséder plusieurs Twins indépendants, avec différents corpus, systèmes et mandats. |
| **Agent logique** | Entité identifiable, éventuellement persistante sans processus résident, capable d'assumer un travail et d'agir sous un mandat. |
| **Root Agent** | Racine **opérationnelle** d'une chaîne d'agents pour un domaine donné (John dans le CDT personnel JHN), jamais un Principal souverain par simple définition. |
| **Handler / activation** | Exécutant situé, session, processus ou capacité substituable, distinct de l'agent logique. |
| **Travail / Cognitive Packet** | Objet durable portant un objectif, une mémoire propre, une responsabilité, un état et des conditions de retour ; sa matérialisation peut être légère. |
| **Turn de travail** | Activation bornée qui fait progresser le travail, produit des événements, un résultat ou une attente. Ne pas confondre avec le Turn d'interface conversationnelle. |
| **Continuation** | État ou référence suffisants pour reprendre un calcul suspendu ; ne transfère ni automatiquement le travail parent ni son autorité. |
| **PacketClaim** | Coordination temporaire de l'exécution / des écritures incompatibles : ni propriété du travail, ni mandat. |
| **Observateur** | Agent autorisé à lire une projection d'événements et à produire un diagnostic ; n'acquiert pas la conduite du travail observé. |

Les mémoires de l'agent et du travail sont **distinctes** : l'expérience réutilisable d'un agent n'est pas l'historique causal nécessaire à la reprise d'un travail. Le transfert du travail doit conserver cette dernière mémoire sans exposer automatiquement la mémoire privée du précédent agent.

## 2. Affectation unique et chaîne de responsabilité

**Invariant candidat R1 (à tester)** : tout travail *constitué et pris en charge* possède exactement **un agent logique actuellement responsable** de sa progression, de sa coordination et de sa clôture. Les simples idées, propositions ou travaux à admettre n'ont pas besoin d'une affectation fictive. Le responsable peut être inactif ou temporairement privé d'activation.

```text
forall W in accepted_work:
  exists exactly one A: responsible_agent(W) = A
```

Ce n'est **pas** une exclusivité d'exécution. Plusieurs handlers peuvent contribuer, un agent peut conduire plusieurs travaux, plusieurs observateurs peuvent suivre le même travail et des claims compatibles peuvent coexister sur des périmètres distincts.

**Invariant candidat R2** : chaque travail possède une provenance de commande et une finalité reconstructibles. Pour les sous-travaux, un agent mandant est identifié ; à la racine, un Principal humain ou institutionnel peut directement commander le travail de son Root Agent. **Ce cas racine termine la régression** ; il ne faut pas inventer un « super-agent » au-dessus du Principal.

L'arbre des responsabilités et la chaîne des mandats doivent être explorables, mais ne se confondent pas : agents pairs, relations de consultation et résultats multi-parents peuvent former un graphe. Une collaboration latérale ne mutualise ni ne crée des droits. Les mandats délégués ne peuvent amplifier l'autorité de leur auteur.

**Invariant candidat R3** : le transfert de responsabilité est versionné et causal. La proposition à B et son acceptation ne valent pas, à elles seules, transfert de A vers B. La transition effective doit empêcher deux responsables simultanés et préserver une procédure de récupération si A devient indisponible. Une expiration de PacketClaim ne transfère pas automatiquement la responsabilité.

La responsabilité du travail parent reste chez son agent tandis que des enfants accomplissent des sous-travaux bornés. La fin d'un sous-travail ne clôt pas automatiquement le parent ; livraison, réception, acceptation, intégration et reprise sont distinctes.

## 3. Tours, questions et subsidiarité récursive

Un travail peut progresser au cours de plusieurs **Work Turns**. Un Turn se termine notamment par `done`, `progress`, `waiting`, `failed` ou `cancelled` (valeurs illustratives, non schéma COP stabilisé). Le Turn est une **portion d'activité** ; une suspension durable est portée par une Continuation et l'histoire du travail.

Exemple : B est responsable de W2, commandé par A. B ne peut avancer sans jugement et adresse une question à A. A, s'il manque de contexte ou d'autorité, demande à John. John ne sollicite le Principal que si une ambiguïté matérielle ou une décision réservée subsiste. La réponse redescend, corrélée à chaque question, et B reprend un autre Turn de W2. **La question ne dépossède pas B de W2** et **la réponse n'augmente pas son mandat**.

Ce sont des échanges de messages et des continuations, **pas une pile RPC distribuée**. Le mandant peut répondre, décliner, renégocier, solliciter un autre avis ou transmettre la question. L'agent attendant une réponse peut travailler ailleurs. Détecter attentes circulaires, questions déjà satisfaites, expirations, résultats tardifs et questions devenues sans objet.

Les cadres Pi et Nod (n8n) constituent des références d'implémentation intéressantes, avec des définitions de Turn différentes : éviter d'assimiler un model turn, un user-visible turn et un work turn. Voir aussi [MCP Tasks et COP](../docs/mcp-tasks-cop-bridge.md), notamment `input_required`.

## 4. FractaGenesis — filiation plutôt qu'identité forcée

**Nom adopté** : **FractaGenesis**, vocabulaire génératif commun aux paquets et aux acteurs, sans supposer que leurs identités ou leurs responsabilités sont interchangeables.

| Opération conceptuelle | Sens à préciser |
| --- | --- |
| `instantiate` | Produire une instance située à partir d'un prototype. |
| `replicate` | Produire une autre incarnation d'une identité logique conservée, sous contrôle de cohérence. |
| `fork` | Dériver une lignée devenue logiquement indépendante, en préservant sa provenance. |
| `spawn` | Créer un acteur / travail léger, éventuellement éphémère et borné par sa mission. |

Distinguer **FractaPrototype** (modèle réutilisable), **FractaInstance** (incarnation située), **FractaFork** (lignée indépendante), génération de sous-paquets et génération de sous-agents. Distinguer aussi `join` (synchronisation) de `merge` (réconciliation des résultats, notamment de leurs désaccords). Les modes live, snapshot et detached sont candidats, pas des opérations déjà implémentées.

Un agent parent peut créer des sous-travaux sans créer un nouvel agent. Un sous-agent peut travailler sans devenir une nouvelle identité souveraine. Génération et clonage n'accordent aucun droit ni budget supplémentaire. Les distinctions des paquets logiques, éditions, incarnations et missions demeurent celles de [Cognitive Packet Incarnations and Missions](cognitive_packet_incarnations_and_missions.md). Garder l'algèbre évolutive de FractaXXXX ; ne pas fabriquer un service FractaGenesis.

## 5. Multiplicité des Twins et régime posthume

Un même sujet peut posséder **plusieurs Twins indépendants**, qui échangent éventuellement entre eux sous des politiques de divulgation et d'autorité distinctes. Ce ne sont pas nécessairement des répliques d'un même Root Twin, et aucun Twin ne s'identifie ontologiquement au sujet.

Après la mort du sujet humain, les mémoires, Twins et travaux peuvent techniquement subsister. **Cela ne maintient pas automatiquement le mandat personnel antérieur.** La poursuite opérationnelle dépend des directives, instruments et autorités alors applicables ; des héritiers, interprètes désignés, organes institutionnels ou représentants compétents peuvent jouer des rôles distincts, sans acquérir une compétence universelle pour « faire parler » le défunt.

Une ambiguïté substantielle sur la volonté présumée appelle une consultation de l'interlocuteur compétent et une suspension appropriée ; une forte confiance prédictive n'est jamais une autorisation juridique. Respecter [Individual and Collective Digital Twins](individual_and_collective_digital_twins.md), [Act, Mandate and Responsibility](act_mandate_responsibility.md) et [Agent Configuration Layer](agent_configuration_layer.md). Les droits politiques ou l'identité personnelle ne sont pas hérités par simulation.

## 6. FractaDashboard — browser des travaux, pas nouveau registre

**FractaDashboard** est un **nom candidat de surface de lecture** : recherche multi-sources, liste, arbre des sous-travaux et graphe des dépendances / attentes. Il doit réutiliser les projections issues de GitHub Issues, COP, CPS et Operium, en conservant leurs propriétaires et leurs systèmes de référence. Le dashboard Fix Bugs First et les Views Store constituent les premiers points d'intégration.

La syntaxe de filtres peut unifier **labels libres** (ex. `#autonomia`, labels GitHub) et **facettes calculées** (ex. `#responsible:john`, `#for:john`, `#waiting-on:principal`). Une facette calculée ne doit pas devenir un label persistant mensonger lorsque l'état change. Les références publiques et privées doivent rester séparées ; un filtre ne crée aucun droit de lecture.

Vues prioritaires : travaux dont John est responsable ; travaux confiés par John ; attentes et arbitrages nécessitant réellement l'attention du Principal. Montrer les **chaînes d'attente transitives** et les travaux qu'une clarification pourrait débloquer, sans transformer le nombre de descendants bloqués en score universel d'importance.

Source : [GitHub Issues taxonomy](../docs/github-issues-taxonomy.md) et [Fix Bugs First dashboard](CPKT-2026-006_fix_bugs_first_dashboard_handoff.md). Les labels GitHub, les claims COP et les affectations logiques n'ont pas à fusionner dans une base rivale.

## 7. Observer les travaux : push, polling et Sleep Cycle

Les agents observateurs se rapportent à une troisième relation indépendante :

```text
responsible_agent(W) : un
commissioning_ref(W) : provenance de commande
observers(W) : zéro, un ou plusieurs
```

L'observation peut être **réactive** (abonnement au bus d'événements) ou **périodique** (polling du journal / des sources natives). Ces mécanismes convergent vers les **mêmes faits causaux**, à condition de disposer d'un historique suffisant. Poller seulement l'état présent ne reconstruit pas les transitions intermédiaires.

Une première extension du **Corpus Sleep Cycle** peut analyser chaque nuit les travaux modifiés depuis le dernier curseur, puis leurs trajets complets utiles : interruptions, questions, réponses, délais, reprises effectives, délégations, réconciliations, coûts, échecs de méthode, résultats livrés mais non intégrés. Elle produit une **projection** destinée au dashboard et des **apprentissages candidats**, pas de nouvelles vérités automatiques.

Règles minimales :
- conserver `occurred_at`, `recorded_at`, `observed_at` et provenance, pour traiter les arrivées tardives ;
- utiliser curseurs de journal, déduplication, rejouabilité et clé d'idempotence d'analyse ;
- distinguer temps d'attente, de traitement, de coordination, délais volontaires et délais imputables aux fournisseurs ;
- considérer les absences de preuve comme `unknown`, non comme preuve d'inactivité ;
- corréler symptômes et causes, puis tester les corrections ; ne pas noter ni surveiller le Principal ;
- garder l'observation à la **Minimum Sufficient Locality** et ne diffuser les conclusions que dans le périmètre autorisé.

Une première règle déterministe utile : `question -> résultat reçu -> reprise métier effective`. Un résultat marqué résolu mais jamais réinjecté dans le calcul d'origine doit être détectable. Des agents métacognitifs peuvent ensuite rechercher des patterns plus larges. Les observateurs eux-mêmes sont observables ; aucun contrôleur central omniscient n'est requis.

Le [Corpus Sleep Cycle](memory_and_corpus_sleep_cycle.md) et [FractaScheduler](../docs/fracta-scheduler.md) possèdent déjà les points d'entrée nécessaires pour une expérimentation incrémentale. La santé opérationnelle des nœuds relève d'Operium ; la critique des méthodes et des raisonnements de FractaCognition ; COP/CPS fournit les faits et continuations.

## 8. Contrat minimal illustratif (non stabilisé)

```yaml
work_ref: "work:W2"
principal_ref: "principal:person"
responsible_agent_ref: "agent:B"
commissioned_by_agent_ref: "agent:A"
parent_work_ref: "work:W1"
memory_ref: "packet:W2"

assignment:
  revision: 7
  effective_event_ref: "event:assignment-7"

turn:
  ref: "turn:B:17"
  outcome: "waiting"

continuation:
  kind: "clarification"
  addressed_to: "agent:A"
  return_to: "work:W2"
  waiting_on: "answer:Q12"

labels: ["research", "cps"]
```

Ces champs sont des **noms explicatifs**, à mapper par projections sur les schémas COP/Cogentia existants ; ne pas les enregistrer comme nouveau contrat canonique avant un audit des événements et commandes réels.

## 9. Validation empirique et frontières ouvertes

La séquence de Reality Tests la plus informative est :

1. Travail parent affecté à A ; enfant à B. B demande une clarification à A, A à John, et John, si nécessaire, au Principal. Vérifier que **B reste responsable de l'enfant**, que la réponse redescend et que le calcul reprend après perte du handler.
2. Transfert du même travail à un nouvel agent logique : concurrence, acceptation, crash, claim expiré, résultat tardif. Vérifier **exactement un responsable logique**, sans double effet et sans mandat élargi.
3. Générer deux sous-travaux et deux sous-agents ; comparer `instantiate/replicate/fork/spawn` et `join/merge` contre les primitives existantes. Vérifier identité, lignage, budget, mémoire, clôture et désaccord conservé.
4. FractaDashboard en **lecture seule** sur GitHub Issues + Continuations/COP, avec facettes calculées, étiquettes et confidentialité.
5. Une analyse nocturne sur une fenêtre d'événements connue, puis rejeu identique et insertion tardive. Vérifier absence de doublons, corrections datées et diagnostic `answered-but-not-resumed`.
6. Contrôler avec des cas de Twins distincts d'un même sujet et le régime de continuité posthume : **absence de confusion entre représentation, mandats et autorité vivante**.

**État** : unification conceptuelle et critères de preuve, non annonce d'un moteur intégré déployé. Les fondations existent, mais les invariants transversaux (responsabilité unique, navigation unifiée, monitoring cognitif) nécessitent des Reality Tests avant stabilisation.

### Premier pilote d'affectation COP — 19 novembre 2026

La relation **responsible agent / commissioning agent** et sa reconstruction par événements ont reçu un premier support dans [Inseme COP Core](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/src/packet-work-assignment.js) (commit [3afc6f9](https://github.com/JeanHuguesRobert/inseme/commit/3afc6f9159871bb9401192a40dead97241fe0109)). Elle distingue l'agent logique de ses handlers, enregistre une révision unique au moyen de transactions SQLite/CAS, accepte une commission directe du Principal à l'agent racine et tente une régularisation **paresseuse** lors de la reprise d'un Task/Step paquetisé. Une attribution historique insuffisamment étayée engendre une demande de **Judgment** durable ; une réponse LLM reste une proposition et ne constitue pas un mandat. [Contrat de pilote](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/docs/work-assignment.md) et [tests](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/test/packet-work-assignment.node-test.mjs) : compilation réussie, 61 tests du package réussis au moment du commit. **Limites** : ni migration générale de toutes les Issues et Continuations historiques, ni branchement autonome du JudgmentHandler au LLM, ni enforcement de la responsabilité sur toutes les surfaces de travail ; poursuivre dans [Cogentia #341](https://github.com/JeanHuguesRobert/cogentia/issues/341).

## 10. Routage des travaux existants

- [Cogentia #341](https://github.com/JeanHuguesRobert/cogentia/issues/341) — paquet d'implémentation transversal : affectation unique, Work Turns, FractaDashboard en lecture seule et métacognition nocturne.
- [Cogentia #336](https://github.com/JeanHuguesRobert/cogentia/issues/336) — producteurs, contrats et reprise réelle des Continuations.
- [Cogentia #339](https://github.com/JeanHuguesRobert/cogentia/issues/339) — taxonomie et labels GitHub, sans autre backlog.
- [Inseme #194](https://github.com/JeanHuguesRobert/inseme/issues/194) — frontier de travaux et PacketClaims COP, sans scheduler concurrent.
- [Cogentia #261](https://github.com/JeanHuguesRobert/cogentia/issues/261) — Reality Tests de FractaCognition.
- [Cogentia #324](https://github.com/JeanHuguesRobert/cogentia/issues/324) — mandats conversationnels, distincts des instructions.
- [FractaXXXX](fractaxxxx.md) — noms FractaGenesis/FractaPrototype/FractaInstance comme grammaire, pas services nouveaux.
