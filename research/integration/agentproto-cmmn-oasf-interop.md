---
title: "Agentproto, CMMN et OASF — convergence autour des continuations de travaux cognitifs"
subtitle: "Corrélation inter-dialogues, planification adaptative des dossiers et découverte des compétences"
status: working-paper
version: "1"
date: 2026-11-17
last_modified_at: "2026-11-17"
language: fr
visibility: public
document_role: research
provenance:
  origin_type: research
  derived_from:
    - https://datatracker.ietf.org/wg/agentproto/charter/
    - https://www.omg.org/spec/CMMN/1.1
    - https://github.com/agntcy/oasf/releases
---

# Agentproto, CMMN et OASF : trois couches complémentaires, pas trois nouveaux moteurs

**Conclusion** : concevoir des *projections/interop adapters* autour du Cognitive Packet et de COP, sans convertir les objets de chacune des trois normes en objets canoniques COP. Les continuations restent potentiellement ouvertes : le prochain travail peut être inconnu lors de la création du paquet. Conserver le rôle de la source canonique (journal/Packet) et ne pas inférer une autorité de l'identification d'un dialogue ou de la publication d'une capacité.

**État de la recherche au 17 novembre 2026** :
- **agentproto** : WG IETF actif (charte approuvée le 8 octobre 2026). Aucun protocole de gestion des dialogues final publié ; les documents cités ci-dessous sont des *Internet-Drafts*, non des RFC.
- **CMMN** : norme OMG *Case Management Model and Notation* version 1.1 adoptée en décembre 2016, avec méta-modèle, notation et représentations d'échange XMI/XSD.
- **OASF** : *Open Agentic Schema Framework* 1.1.0 publié le 10 juillet 2026, sous AGNTCY ; schémas JSON versionnés, taxonomies skills/domains et modules d'intégration.

## 1. Agentproto : continuité des interactions, pas continuité du contexte mental

Source normative de périmètre : [Charte IETF agentproto approuvée](https://datatracker.ietf.org/wg/agentproto/charter/). Elle normalise les métadonnées de **dialogue** (identité, corrélation, cycle de vie, liens inter-dialogues et propagation entre participants, transports et frontières de confiance) en réutilisant des transports/IETF existants. Elle **exclut** mémoire LLM, documents, prompts, planification et logique métier. Elle prévoit que MCP et A2A puissent transporter ces métadonnées, sans les remplacer. Les identifiants de dialogue sont des informations potentiellement traçantes : minimisation, séparation des périmètres et relation de corrélation vérifiable sont nécessaires.

Le 16 novembre 2026, le projet individuel [*Context and Correlation Management Architecture for Distributed Agentic Activities* -01](https://datatracker.ietf.org/doc/draft-agentproto-context-management-architecture/) distingue **Activity**, **Dialog**, **Task**, **Resource** et état de gestion **DMS**, ainsi que les relations `delegated-from`, `continuation-of`, `replaces`. Une nouvelle identité de dialogue peut être reliée à l'ancienne par `continuation-of` sans être la même session logique. Ce vocabulaire est **proposé**, pas encore prescrit par un RFC. Le projet [*Agent Dialog Propagation Protocol* -00](https://datatracker.ietf.org/doc/draft-zahed-agentdiaproto/) est paru le 17 novembre : entre autres invariants, identifier un dialogue ne donne pas le droit d'y participer et une interruption de connexion ne doit pas achever le dialogue.

**Implications COP** :
1. `packet_ref` demeure l'identité locale du travail ; `dialog_ref` désigne une interaction particulière, et `task_ref` une opération de l'interface externe. Ils ne sont **pas** synonymes.
2. Une même activité peut mobiliser plusieurs dialogues MCP/A2A, de même qu'un dialogue peut aboutir à plusieurs Hops ; une transition de transport ne crée pas nécessairement un nouveau Cognitive Packet.
3. Chaque nouveau lien `continuation-of`, `delegated-from` ou `replaces` est un **fait de corrélation avec provenance** et une politique de divulgation, non une preuve d'identité, un mandat ou une permission de lire tout le contexte.
4. Les liens sont interprétables par copie/référence et reconstruits depuis les faits existants ; éviter la création d'un deuxième registre distribué de corrélation en parallèle du journal COP.

**Travaux voisins à suivre, NON normatifs** : [Signed Handoff Context -02, 15/11](https://datatracker.ietf.org/doc/draft-srivastava-agentproto-handoff-context/) (offres et statuts signés, chaînage par hash entre Hops), [PACE Authorization -00, 16/11](https://datatracker.ietf.org/doc/draft-nandakumar-agentproto-pace-authz/) (délégation bornée, checkpoint d'approbation et révocation), [TRAIL -00](https://datatracker.ietf.org/doc/draft-nassar-agentproto-trail/) (records d'effets infalsifiables / supervision externe). Ils constituent du prior art voisin des paquetages, du COP mandat/claim/receipt et de l'optimistic locking ; ne pas leur attribuer l'adhésion formelle de l'IETF ni annoncer leur compatibilité opérationnelle.

Le [projet de cas d'usage agentproto -07](https://datatracker.ietf.org/doc/draft-agentic-ai-usecases-requirements/) pointe la difficulté des délégations **multi-hop** et de la propagation des annulations. Son propos sur les sessions MCP reflète une photographie de versions : notre intégration MCP moderne 2026-07-28 est stateless et ne doit pas être remodelée comme une session obligatoire.

## 2. CMMN : le bon modèle conceptuel des travaux ouverts

Norme primaire : [OMG CMMN 1.1](https://www.omg.org/spec/CMMN/1.1) ; [PDF §4, §5](https://www.omg.org/spec/CMMN/1.1/PDF). CMMN modélise le **Case** qui évolue selon les nouvelles informations ; les acteurs peuvent sélectionner les tâches et leur ordre **au moment de l'exécution**, contrairement au workflow totalement prédéfini. Son `CaseFile` contient les données utiles, ses `Stages` regroupent des travaux, ses `Milestones` décrivent des jalons et ses `Sentries` attendent des événements/conditions pour permettre ou terminer des tâches. `PlanningTable` + `DiscretionaryItem` permettent à un *case worker* d'ajouter un travail non initialement obligatoire. Les tâches peuvent inclure des `HumanTask`, `ProcessTask`, `DecisionTask` et des sous-dossiers (`CaseTask`).

| CMMN | Lecture plausible en Cogentia/COP | Distinction stricte |
|---|---|---|
| Case / CasePlan | dossier ou travail racine, éventuellement paquet `umbrella` | un Case n'est pas systématiquement **un** Packet |
| CaseFile / CaseFileItem | corpus de faits, sources et pièces accessibles par référence | ne garantit pas l'immutabilité ou la causalité du journal COP |
| Stage, Milestone | étapes conceptuelles/jalons et états projetés | pas une exécution automatique ni un droit d'opérer |
| Sentry (événement et/ou condition) | condition d'éveil d'une Continuation ; revalidation de dépendances | ne garantit pas à elle seule le réveil ni la disponibilité du fournisseur |
| PlanningTable / DiscretionaryItem | propositions de continuation / tâches facultatives ajoutées lors des Hops | exige des règles explicites de sélection, versions et politique d'autorité |
| HumanTask | demande de clarification ou jugement humain | n'implique pas qu'un principal doit confirmer tout micro-acte |
| ProcessTask / DecisionTask | procédure scriptée / décision structurée | exécution et effet restent séparés du descriptif |

**Important** : dans CMMN, le plan offre des possibilités connues, mais le texte du standard souligne que le dossier ne peut pas toujours être orchestré par une **séquence prédéfinie**. Une continuation libre (objectif à préciser, observation à recueillir) peut dépasser même ce catalogue de tâches facultatives. CMMN devrait servir de **protocole de travail spécialisé**, pas de syntaxe obligatoire pour tout paquet.

Notre [curseur `task_step` linéaire existant](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/src/packet-task-step-cursor.js) est le cas déterministe. La projection CMMN doit permettre, *sans modifier ce curseur sous le manteau*, d'ajouter explicitement une tâche candidate, de fixer la version de plan attendue, de rapporter la sélection, le résultat, l'annulation ou la condition d'activation sous forme de faits ajoutés au Packet. Un `DiscretionaryItem` ne devient **pas** un `PacketClaim` ou une permission par sa seule présence.

**Exemple** : dossier d'un Livre Vivant consacré à l'Orta. Le plan de départ connaît les vérifications éditoriales ; la découverte d'un document inédit ajoute une possibilité « confronter cette source » ; une `Sentry` liée à la réception et à la qualification du document rend le travail éligible ; l'agent choisit un protocole de recherche, écrit la provenance et actualise le reste à faire. Aucun besoin de convertir la totalité du livre en liste figée de COPSteps.

## 3. OASF : classifier des agents et faciliter leur découverte

Source : [AGNTCY OASF](https://github.com/agntcy/oasf), [schéma `record`](https://github.com/agntcy/oasf/blob/main/schema/objects/record.json), [guide officiel](https://docs.agntcy.org/oasf/agent-record-guide/), [releases v1.1](https://github.com/agntcy/oasf/releases). L'enregistrement OASF possède des champs structurés tels que `name`, `version`, `schema_version`, `description`, `authors`, `created_at`, `skills`, et des domaines, localisateurs et modules selon besoins. Les *skills* et les *domains* ont des noms de catégories hiérarchiques et des identifiants. Le validateur vérifie la **forme de la déclaration**, pas que l'agent exécutera correctement une mission ou qu'il dispose d'un mandat pour ce principal.

Version 1.1.0 (10 juillet 2026) : **18 catégories majeures de skills**, enrichissement massif de la taxonomie, objet `discovery` destiné à exprimer skills et domains hors d'une fiche `record`, notamment pour des Agent Cards. Attention aux **changements de catégories et de nombreux UID** : stocker version de schéma et taxonomie, prévoir migration et ne pas deviner le sens d'un UID isolé. Les modules d'intégration peuvent concerner **MCP**, **A2A** et **Agent Skills**. Le [SDK AGNTCY](https://docs.agntcy.org/oasf/oasf-sdk/) dispose de validation et traduction en configurations MCP ou Agent Cards A2A ; cela reste un outil technique, pas une délégation d'effet.

**Positionnement** : OASF décrit **un producteur/interprète possible** et ses moyens techniques, non une continuation concrète. Un Cognitive Packet peut avoir un besoin décrit dans des compétences OASF ; le routeur compare cela aux fiches disponibles, puis **vérifie séparément la présence du fournisseur, l'identité, l'autorité, la disponibilité et le test réel**. Ne pas forcer la taxonomie interne des *classes de producteurs de continuations* (`judgment_boundary`, `data_dependency`, etc.) à devenir des skills OASF : ce sont deux dimensions orthogonales.

Un catalogue Cogentia des *protocoles de continuation* est aussi distinct de la taxonomie OASF : le catalogue décrit *comment poursuivre un travail*, OASF décrit *qui se présente comme capable* d'y contribuer. Exemple : le même protocole `typed_judgment` peut être pris en charge par plusieurs agents avec différents domaines OASF.

## 4. Vue de convergence, sans nouvelle infrastructure canonique

```text
Cognitive Packet / COP journal : faits, traces, provenance, continuations,
                                 mandats / claims / effets réconciliés
            |
            | travail restant + conditions d'éveil et de réussite
            v
CMMN-like planning : étapes connues OU nouvelles tâches facultatives
            |
            | compétence nécessaire, portée, confidentialité
            v
OASF discovery : fiches de candidats (skills, domains, interfaces MCP/A2A)
            |
            | choix d'un interlocuteur autorisé et disponible
            v
agentproto-like correlation : dialog_ref, relation avec dialogue parent,
                              propagation minimale à travers le Hop
            |
            | MCP Tools/Tasks, A2A Tasks ou autre protocol porteur
            v
Résultat observé -> corrélation au Packet -> journal et prochain reste à faire
```

Ces couches ne forment **pas** une pipeline obligatoire : une continuation locale peut exécuter un prochain `COPStep` sans OASF, sans dialogue externe et sans CMMN. Les descriptions ouvertes n'exigent pas de nouveau type de paquets, et un paquet reste valide même sans catalogue central.

### Correspondances d'identité proposées, à NE PAS présenter comme norme commune

| Identité | Porte sur | Ne doit jamais être assimilée automatiquement à |
|---|---|---|
| `packet_ref` | travail cognitif canonique / unité de transport | dialogId, Task MCP/A2A, Case CMMN |
| `case_ref` | dossier/projection de plan CMMN (facultatif) | journal causal, mandat ou Packet individuel |
| `dialog_ref` | échange et sa filiation entre participants | permission d'accès, mémoire ou référence globale d'utilisateur |
| `task_ref` externe | opération d'un protocole / fournisseur | claim COP ou continuation canonique |
| `agent_ref` / OASF record | acteur qui annonce ses capacités | preuve d'habilitation, disponibilité ou résultat garanti |
| `effect_receipt_ref` | fait vérifié d'un acte effectué | fin de l'objectif cognitif, qui reste un jugement distinct |

## 5. Décisions et tests recommandés

1. **Sans nouvelle entité canonique** : documenter les correspondances comme projections sur le Packet, pas comme des bases ni schedulers parallèles.
2. **OASF en lecture seule d'abord** : générer une fiche publique à partir de **capacités réellement présentes** ; valider contre un schéma OASF 1.1 épinglé ; distinguer annoncée / atteignable / autorisée / testée. Aucune publication d'informations privées dans les champs d'annotation.
3. **CMMN en projection sans moteur** : démontrer un dossier avec une `Sentry`, une tâche discrétionnaire et une étape connue ; vérifier qu'un événement tardif déclenche une proposition de continuation sans double exécution et que le plan évolue après crash.
4. **Agentproto sans prétention RFC** : tester la perte de transport et la reprise du même travail avec un nouveau dialogue, lignée explicite et minimalement divulguée, sans autoriser via possession d'un dialogId. Respecter les scopes et les liens de type `continuation-of` distincts du maintien de la même identité de dialogue.
5. **Reality test de bout en bout** : un paquet de travail, deux agents, découverte des compétences, dialogue de transfert A2A/MCP, restitution d'un résultat, nouvel Hop et lecture de l'histoire complète après interruption. Aucun nouveau moteur de tâches.
6. **Veille des brouillons IETF** : comparer régulièrement PACE, signed handoff, TRAIL et la charte approuvée ; ne pas intégrer leurs drafts comme protocole adopté ni revendiquer une priorité historique sans examen des dates.

**Limites explicites** : ce document est une cartographie de prior art et de candidats de raccordement. Il ne réalise pas la validation effective d'une fiche OASF générée, n'implémente aucun moteur CMMN, n'intègre aucun wire format agentproto (encore en chantier), et ne modifie ni le MCP en production ni les droits COP.

**Related** : [Cognitive Packets](../cognitive_packets.md), [Catalogue des protocoles de continuation](../../docs/continuation-protocol-catalog.md), [MCP Tasks et COP](../../docs/mcp-tasks-cop-bridge.md), [Cogentia #336](https://github.com/JeanHuguesRobert/cogentia/issues/336).
