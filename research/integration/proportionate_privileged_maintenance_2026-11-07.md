---
title: "Maintenance privilégiée proportionnée — capacité, réversibilité et preuve d'approbation"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.2"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "research-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/integration/proportionate_privileged_maintenance_2026-11-07.md"
related_documents:
  - "research/integration/john_proportionate_delegation_2026-11-06.md"
  - "research/integration/fractanet_principal_trust_2026-11-05.md"
  - "research/mandate_reasonable_agency.md"
  - "docs/mcp-super-mandate-amendment-fbf-2026-11-07.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Maintenance privilégiée proportionnée : ni sudo magique, ni bureaucratie

## Événement initiateur

Le Principal a expressément demandé à ses agents de redémarrer `mcp-cogentia.service` pour exposer une démonstration MCP Apps. Le code Git est versionné, les tests ciblés du serveur passent, mais le courtier `super` refuse l'autorisation provenant seulement de la session de transport MCP. Le service fonctionne toujours sur l'ancienne révision. La volonté explicitée par le Principal est de réduire la friction des opérations sans risque durable significatif et de réserver l'approbation forte depuis son ThinkPad aux actes réellement graves.

## Règle de jugement : évaluer les conséquences, non les mots-clés

Le recours à `sudo` n'est pas en soi une classe de risque ; inversement, une opération non privilégiée peut causer des pertes graves (publication, transfert, destruction de clés ou de données). L'impact se mesure notamment par l'interruption de capacité, la durabilité des effets, la preuve d'un chemin de récupération indépendant, les dépendances croisées, les expositions privées/externes et le coût des erreurs. L'abstraction de contrôle ne doit pas ajouter plus de dommage (attention humaine perdue, blocages, opportunités manquées) qu'elle n'en évite.

| Régime | Condition | Intervention du Principal | Autorité / reçu |
|---|---|---|---|
| **A — ordinaire mandaté** | Interne, à faible exposition, récupération indépendante prouvée, dans mandat/budget | Aucune approbation répétée | Mandat courant et reçu d'effet ; jamais d'extension d'autorité induite |
| **B — maintenance bornée** | Opération privilégiée mais précisément délimitée ; indisponibilité transitoire admissible ; recovery indépendant ; pas d'effet externe engageant | **Une confirmation simple** du delta/effet réel, au moyen d'un canal humain dont l'identité/présence est effectivement attestée ; possible à travers une UI d'approbation existante | Même COP : proposition EXPOSE, challenge, approbation attribuable, grant exact à usage unique, réservation et reçu, sans nouvelle lignée de mandats |
| **C — critique / réduction durable des capacités** | Perte plausible de données non récupérables, clés, réseau, accès SSH, politique de sécurité, sauvegardes, contrôle COP, ou engagements de tiers | Authentification renforcée, éventuellement commande depuis ThinkPad / SSH signé, ou refus | Preuve forte du Principal, version/portée verrouillées, mesure de récupération et justification ; même COP |

**Le seuil B/C peut dépendre du contexte et varier dans le temps.** Le service peut être le seul canal d'accès distant : son redémarrage n'est alors pas banal. L'absence de preuve de recovery interdit de qualifier B par simple optimisme. Le risque n'est pas mathématiquement nul ; il peut être raisonnablement négligeable par rapport à la valeur du travail.

## Trois surfaces MCP, trois régimes opérationnels à ne pas confondre

Dans le déploiement Fractanet, distinguer les **surfaces de connexion** des **niveaux d'autorisation des actes**. On dispose de :

1. **MCP Cogentia** — interface sémantique ordinaire, mandatée, dont les travaux sont des Cognitive Packets et leurs continuations ; fonctionnement normal A ou B selon l'effet.
2. **MCP Cogentia Private** — accès aux capacités et contextes privés du Principal avec contrôles d'identité, mandat, budget, droits et effet ; ce n'est ni un consentement générique ni un accès `root` implicite. Une maintenance bornée peut relever de B.
3. **MCP Unix Shell temporaire de bootstrap, à terme voie de secours / *break-glass*** — surface générique d'exécution, à conserver indépendante des services dont elle peut réparer les défaillances. Lorsqu'elle sert à **récupérer une capacité importante réellement cassée**, c'est le régime exceptionnel de crise, **non une solution pratique aux refus de permission ordinaires**. Le contrôle doit être plus strict, avec décision humaine manuelle presque toujours requise, idéalement depuis un appareil du Principal indépendant de l'incident (par exemple son ThinkPad). Ce MCP n'est pas une troisième source de souveraineté : il consomme des autorisations COP ou un chemin d'urgence explicitement attribué, journalisé et réconcilié.

Une panne du contrôle COP ou de son émetteur de confiance crée un cas particulier : la restauration peut nécessiter une autorisation *break-glass* fondée sur une identité du Principal établie **hors du composant en panne**. On ne peut pas demander au service cassé de certifier sa propre restauration. La procédure d'urgence doit être préparée tant que le système est sain, avec protection des preuves hors du périmètre compromis ; son usage doit rester rare et révisable.

### Reçu minimal d'une récupération de crise

- **Déclencheur et nécessité** : capacité réellement indisponible, impact constaté, alternatives A/B essayées et raisons de leur insuffisance.
- **Imputation et autorité** : Principal identifiable, opérateur, mandat d'urgence ou preuve d'approbation hors bande, portée, durée et justification d'accès élevé ; refus si le lien de confiance n'est pas vérifiable.
- **Préparation** : cible, commande/changement exact, dépendances et chemin de retour, éléments de santé avant intervention ; préservation des traces et des données originales quand elles sont à risque.
- **Exécution** : identifiant d'acte unique, corrélation avec le paquet, canal utilisé, horodatages, résultat, éventuelles commandes supplémentaires et écart expliqué. Éviter de journaliser mots de passe, clés ou données sensibles ; protéger la confidentialité et l'intégrité du journal.
- **Vérification** : capacité restaurée ou non, contrôles de sécurité, perte résiduelle, comptes/réservations et reconciliation COP a posteriori si l'autorité normale était indisponible ; rapport au Principal et retrait des privilèges temporaires.

**Proportionnalité même en crise** : la traçabilité renforcée n'est pas une obligation de rédiger un dossier avant de restaurer un service vital ; capturer automatiquement les traces accessibles, exiger la décision humaine décisive, puis compléter la réconciliation aussitôt que l'infrastructure le permet. Ne pas transformer un problème de disponibilité ordinaire ou une autorisation insuffisante en « crise » pour accéder au shell d'urgence.

## Cas concret du serveur MCP

`systemctl restart mcp-cogentia.service` n'est *pas* un simple reload : systemd arrête et relance le service. Le service courant possède `Restart=always`, mais cette politique n'assure pas à elle seule la reprise d'un service mal configuré ; l'option ne garantit pas le redémarrage après tout échec de `systemctl restart`. L'exécutable provient d'un dépôt sous l'utilisateur `ubuntu`; l'agent doit donc aussi qualifier la révision Git destinée à être chargée. Le MCP expose des chemins d'accès à des environnements privés ; un redémarrage peut temporairement interrompre des connexions ChatGPT, et un code malveillant dans le dépôt peut provoquer des effets plus graves. Les contrôles utiles sont : révision identifiée, tests, service actif avant, chemin de récupération indépendant du MCP redémarré, supervision, santé après, reçu. Quand ces conditions sont vérifiées, le redémarrage peut relever de **B** ; il n'est pas automatiquement C parce qu'il requiert sudo.

## Friction minimale, une seule autorité COP

1. **À réaliser une seule fois (bootstrap fiable) :** enrôler un canal authentifié du Principal, utilisant de préférence une identité déjà prouvée par SSH personnel ou OAuth individuel, auprès d'un *issuer* COP protégé indépendamment du code non privilégié. L'issuer sait distinguer confirmation légère (B) et signature/step-up fort (C) ; le canal ChatGPT ordinaire et les en-têtes de tunnel ne prouvent pas l'identité humaine à eux seuls. **Ne pas obliger le Principal à taper sudo pour chaque déploiement.**
2. **À chaque acte B non couvert par autonomie A :** l'agent montre uniquement la finalité, la cible, les effets attendus, la récupération, et la commande ou le changement exactement proposé. Une confirmation depuis une UI **liée à une authentification de présence humaine** suffit ; un bouton MCP Apps non authentifié indépendamment ne suffit pas. Le callback serveur vérifie `issuer`, `principal`, `challenge`, hash, fraîcheur et usage unique ; un simple message du modèle ne devient pas une signature.
3. **En interne :** reprendre `principal-approval-challenge.js`, `createPrincipalStepUpVerifier()` et `amendMandate` plutôt que forker un registre. Si le mandat courant couvre l'action, ne **pas** l'amender. S'il ne la couvre pas, obtenir un delta de mandat `vN+1` avec preuve du Principal, et ensuite l'autorisation de l'effet. L'issue d'un mandat n'est pas l'issue d'un effet et ne doit pas l'absorber.
4. **Au point d'exécution :** broker `super` exige le grant COP exact émis par son issuer de confiance, réservation, identité/mandat/version/budget/target/commande et nonce ; émet un reçu. Pas d'autorité fabriquée par un outil MCP ni d'ajout de `mcp_jhn_attested_mutate` à l'allowlist root. Les capacités sémantiques privilégiées restent composables, pas une liste croissante de mots-clés `sudo` ou un shell ouvert sans gate.
5. **Après l'effet :** santé du service, comparatif de la capacité annoncée, date/identité de l'approbation, éventuel rollback ; n'interroger le Principal de nouveau que si le recovery ou la décision importante est réellement impossible autrement.

## Tâche bloquante et geste humain de bootstrap

**Aujourd'hui :** la pièce manquante n'est pas une approbation conversationnelle supplémentaire, mais un issuer de confiance *déployé* capable d'écrire une autorisation COP consommable par le broker root-owned. Le code source sait vérifier des signatures SSH et des confirmations OAuth liées à une transaction, mais la surface humaine de confirmation et son raccordement productif à l'issuer ne sont pas établis.

**Prochain travail de coding :** préparer un installateur à portée bornée, idempotent et inspectable, qui ne se déclenche pas implicitement, puis demander au Principal une intervention **unique** depuis son ThinkPad pour enrôler son approbateur/issuer indépendant. Ne lui fournir la commande qu'une fois ses changements et sa portée exacts contrôlés. Ensuite, seules les vraies décisions de catégorie B/C réclament une action, pas du SSH de routine.

Critères d'acceptation : une tentative initialement refusée pour manque de preuve B est autorisée par la confirmation indépendante exacte, refusée en cas de faux canal, de réutilisation, de modification du payload ou d'expiration ; l'acte `systemctl restart mcp-cogentia.service` est constaté sans perte durable et apparaît dans le journal COP. Une simple approbation de chat n'est jamais traitée comme preuve d'issuer indépendante.

**Ne pas confondre :** documenter une politique B n'active pas le service ; une fonction source `amendMandate` n'enrôle pas le Principal, ne configure pas l'issuer et n'autorise pas `sudo` en production.
