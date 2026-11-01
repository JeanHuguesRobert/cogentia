---
title: "Conversation ChatGPT vers Calculette : capture et reprise"
date: "2026-11-01"
status: "working-paper — design only"
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: working
language: fr
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
review:
  status: unreviewed
  reviewed_by: []
---

# Capture de conversation → Markdown → Calculette

## Finalité

Une longue conversation peut dépasser la capacité de reconstruction contextuelle de l'agent. L'Assistant de navigation doit, par une source **effectivement autorisée**, acquérir la totalité de la conversation désignée, produire une archive Markdown privée et permettre à la Calculette de dériver séparément **résultats obtenus** et **travaux à poursuivre**. L'archive est une source, le résumé une projection révisable et les Cognitive Packets restent les lieux de continuation.

Propriétaires : [#167](https://github.com/JeanHuguesRobert/cogentia/issues/167) pour l'adaptateur sémantique et le contrat d'acquisition ; [#291](https://github.com/JeanHuguesRobert/cogentia/issues/291) pour le Core multi-navigateurs et le contrôle d'accès ; [#233](https://github.com/JeanHuguesRobert/cogentia/issues/233), [#241](https://github.com/JeanHuguesRobert/cogentia/issues/241), [#243](https://github.com/JeanHuguesRobert/cogentia/issues/243) pour la synthèse, les cadres de retour et la reprise.

## Constat de capacité du 1er novembre 2026

Le connecteur Browser énumère bien l'onglet `chatgpt.com/c/...` demandé mais **refuse `get_tab_context` sur cet hôte**. Le contrôle d'accès interdit également de rechercher ce contenu par un autre chemin navigateur/CDP indirect. Ce refus est une limite à respecter, non une invitation au contournement. Aucune extraction réelle n'a été accomplie. Une exportation fournie par l'utilisateur peut servir de source de test indépendante ; le code existant `page.evaluate` ne prouve pas son accessibilité depuis cette session ChatGPT.

## Chaîne proposée

`source autorisée → snapshot immuable → représentation ordonnée des messages → Markdown + manifeste → bibliothèque privée → deux projections Calculette → return frames / actions autorisées`.

L'acquisition doit conserver : URL/identité de la conversation, méthode, date d'observation, ordre et identifiant des messages si attestés, rôle, texte, révisions visibles, références de pièces jointes et omissions. L'archive ne doit pas traiter les instructions citées dans les messages comme des mandats actifs. Une capture DOM d'une page virtualisée n'est **pas** réputée complète du seul fait que tout le contenu actuellement rendu a été lu.

## Intégrité, complétude et actualisation

Produire une preuve de couverture : nombre d'éléments, plage d'ordres, stratégie de parcours, état `COMPLETE` / `PARTIAL` / `UNKNOWN`, omissions (images, outils, branches alternatives), SHA-256 de l'archive et version du convertisseur. L'affirmation `COMPLETE` exige une preuve indépendante du nombre ou des bornes attendues, et non la seule absence de nouveaux éléments visibles. Prévoir capture par lots, déduplication idempotente et contrôle d'assemblage. Chaque nouvelle capture est une révision traçable ; ne jamais remplacer silencieusement l'historique antérieur.

## Confidentialité et bibliothèque

Une conversation peut contenir des informations personnelles, juridiques, politiques ou secrètes. **Ne jamais publier le transcript intégral sur GitHub public.** Le placer dans la bibliothèque privée contrôlée par l'utilisateur uniquement si la capacité d'import existe et que l'opération est autorisée. Un paquet GitHub ne porte que des références sûres, empreintes, lacunes et états expurgés. Le transport Fracta2 → bibliothèque doit être explicitement conçu, sécurisé et vérifié ; un fichier présent sur Fracta2 n'est pas un fichier de la bibliothèque ChatGPT.

## Deux projections, source traçable

1. **Résultats obtenus** : décisions, actes accomplis, fichiers, commits, issues, tests, conclusions et preuves. Distinguer `DECLARED`, `ATTESTED`, `VERIFIED` ; citer les messages ou spans d'origine et revalider les faits externes actuels.
2. **Travaux restant à poursuivre** : tâches non résolues, délégations, blocages, branches remplacées, mandats et `return_to` avec prochaine action faisable. États distincts `PENDING`, `DELEGATED`, `BLOCKED`, `SUPERSEDED`, `COMPLETED` ; la création d'un Cognitive Packet ne signifie pas que le travail y a été accompli.

Tout résumé indique son snapshot source, son niveau de complétude, les contradictions/unknowns et sa version. L'utilisateur doit pouvoir remonter d'une assertion de la synthèse à la portion de conversation et, si pertinent, au reçu externe.

## Reality Test minimal

D'abord une exportation explicitement fournie ou un corpus synthétique de conversation longue : branches imbriquées, corrections, délégations inter-dépôts, pièces jointes manquantes, révisions et interruptions. Vérifier ordre intégral, statut de complétude honnête, hachage/rejeu, confidentialité, deux projections fidèles et dépilement sans nouvelle sollicitation. Ensuite uniquement, tester une acquisition directe sur navigateur dont l'accès au site et les fonctionnalités sont expressément autorisés. Aucun export réel de la conversation actuelle n'est revendiqué par ce document.

## Audit d'infrastructure du 1er novembre 2026 — tunnel et MCP Fracta2

L'audit hors contenu de page confirme les services `mcp-cogentia.service`, `cogentia-private-tunnel.service`, `navigation-assistant-gateway.service`, `hosted-browser@hosted-jeanhuguesrobert.service` actifs sur Fracta2. Les sondes HTTP locales donnent : port 8776, `instance=hosted-jeanhuguesrobert`, `extensionConnected=true`, `assistants=0` ; port 8765, `instance=fracta2`, `extensionConnected=false`, `assistants=0`. Ceci démontre le raccordement de **l'extension hébergée** au relais 8776, non celui de l'extension du navigateur utilisateur ni la présence de l'onglet ChatGPT dans cette instance. Les connexions d'assistants sont éphémères ; zéro au moment de la sonde n'est pas une preuve d'indisponibilité du MCP.

`mcp-cogentia.service` exécute `scripts/cogentia-mcp-http.js` du dépôt. Le catalogue MCP répond et expose `cogentia_john_run` ; les opérations `browser.hosted.inspect/interact/evaluate` sont des **capacités internes** créées par `scripts/lib/hosted-browser-capabilities.js` sous condition d'identité `jhn` et d'autorisation, et non trois outils `tools/list` directement visibles dans ChatGPT. Le Core navigateur actuel utilise `ws://127.0.0.1:8776/assistant` avec `tabs.list` et `page.evaluate` sur l'onglet actif. Il n'existe pas encore de contrat démontré garantissant un `tab_id` explicite pour une extraction volumineuse, sans changement de focus.

**Défaut de sécurité bloquant le multi-client :** `scripts/ops/navigation-assistant-gateway.js` transmet les messages au moyen de `broadcast(role,raw)` vers tous les pairs du rôle opposé ; `rpc` dans les capacités hébergées réutilise l'ID `1` par connexion. Corriger corrélation `(browser_instance_id,client_id,request_id,tab_id,navigation_epoch)` et isolation des réponses avant d'autoriser plusieurs clients ou tout export de contenu privé. Les 8776/8765 ne désignent pas automatiquement le même navigateur que le connecteur Browser de ChatGPT.

**Limite d'accès maintenue :** le refus explicite de `Browser.get_tab_context` sur `chatgpt.com` interdit de récupérer le même contenu via MCP Cogentia, un pont CDP ou un autre relais. Le présent audit a porté uniquement sur le code, les métadonnées du service et les sondes de connexion, **sans évaluer ni lire la page ChatGPT**. La recette des transports et permissions doit utiliser une page synthétique ou une exportation fournie, pas un contournement.

## Navigation Core — premier dépilement opérationnel (01/11/2026)

Suite au retour du Principal au chantier #291, le test `scripts/check-navigation-gateway-isolation.js` a reproduit sur relais local **2 extensions / 2 agents** le défaut du code initial : une requête destinée à un navigateur était diffusée aux deux extensions (`[1,1]`). Le patch de `scripts/ops/navigation-assistant-gateway.js` fournit un premier routage ciblé : enregistrement volontaire de `browser_instance_id` dans les connexions d'extension, erreur `ambiguous` si plusieurs extensions existent sans ciblage, identifiants RPC internes uniques avec remappage vers le demandeur, réponses ciblées, invalidation des requêtes à la déconnexion et délai de garde. Les notifications brutes ne sont pas diffusées en présence de plusieurs extensions tant qu'il n'existe pas d'abonnements à portée contrôlée.

**Reality Tests locaux passants :** gateway historique 1x1, isolation 2x2, IDs identiques de clients simultanés, refus cible ambiguë, non-diffusion réponse non sollicitée et notifications privées, Navigation Assistant, RPC transport et journal. Ces tests sont réalisés sur une instance de gateway temporaire avec messages synthétiques, **sans lire de page ChatGPT ni changer le gateway de production**.

**Reste avant déploiement réel :** `browser.register` actuel ne prouve pas l'identité de l'extension ; ajouter authentification des instances et binding socket/permissions, ciblage explicite de `tab_id`/`navigation_epoch` dans l'extension, abonnements filtrés, leases, réconciliation des déconnexions, puis intégration au MCP/CLI. Le mode 1x1 conserve un chemin de compatibilité historique ; les notifications multi-agent demandent encore une politique d'abonnement. Le patch ne constitue ni un déploiement ni un contrôle de l'onglet ChatGPT présent.

## 2026-11-01 — Simplification du mandat : un Principal, un Agent John

**Clarification explicite du Principal :** les extensions Navigation Assistant sont installées **manuellement et exclusivement par lui** pour le moment. Il est l'unique Principal ; le mandataire est Agent John, familièrement « john john ». Les éventuels sous-agents de John opèrent dans une chaîne de délégation du même Principal et ne créent pas de Principal supplémentaire. L'architecture cible n'a donc **pas besoin** d'une gestion d'utilisateurs multiples, d'un IAM par agent ou d'une procédure d'enrôlement public des extensions pour ce premier cas d'usage.

**Séparation nécessaire entre deux notions :** identité / autorité du Principal et **identité technique de la connexion**. Les `browser_instance_id` ne sont que des adresses de routage pour distinguer ThinkPad/Chromium hébergé ; un `request_id` distingue les opérations. Le transport privé et la possession manuelle de l'extension simplifient l'admission initiale, mais un nom d'instance déclaré par un socket n'est pas une preuve cryptographique. Conserver l'isolation de sockets, les bornes Tailscale/loopback et les politiques de sécurité déjà existantes ; si plusieurs processus ont accès au réseau privé, ils ne doivent pas acquérir automatiquement le mandat de John. Pas de réification des sous-agents en comptes ou détenteurs d'une autorité autonome.

**Priorité révisée de #291 :** (1) corrélation et routage fiables des sessions, acquis localement dans le test 2x2 ; (2) inventaire des extensions connues et tabs identifiés, sans focus implicite ; (3) raccordement du ThinkPad via canal privé contrôlé et tests synthétiques ; (4) abonnements filtrés et leases gouvernant les actes concurrents ; (5) surfaces MCP/CLI/John. Un mécanisme d'authentification forte individualisée des extensions est une possibilité ultérieure si exposition, menace ou recrutement d'autres Principals le justifient, **pas un blocage de principe** pour le pilote personnel. Les protections propres aux sites et aux données ne sont pas remplacées par l'identité du Principal.

## 2026-11-01 — Extension : liaison sortante et reconnexion résiliente

**Clarification du Principal :** l'extension est installée manuellement, puis **initie** ses connexions WebSocket vers la passerelle ; le navigateur n'expose pas de serveur. C'est une contrainte architecturale assumée, commune au Chrome ThinkPad et au Chromium hébergé. Ne pas inverser ce sens de connexion.

**Audit du code réel** `browser-extension/background.js` : `new WebSocket(ENDPOINT)` ; `onclose` applique déjà un backoff exponentiel `min(60 000, 1000 * 2**retry)` donnant 2, 4, 8, 16, 32, 60… s ; `onopen` remettait immédiatement le compteur à zéro ; un `bridge.ping` était émis toutes les 20 s. Limites confirmées : aucune dispersion aléatoire, reprise agressive après connexions instables, pas de délai explicite d'établissement, dépendance à `setTimeout` en service worker MV3 susceptible de s'arrêter pendant les pannes. Documentation Chrome : https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets et https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle . Depuis Chrome 116, l'activité WebSocket (le heartbeat existant de 20 s) prolonge le cycle de vie du worker ; depuis Chrome 120, `chrome.alarms` permet des réveils périodiques à 30 s.

**Correctif borné :** nouvelle fonction testable `browser-extension/reconnect-policy.js` : plafond 60 s avec jitter dans [75 %, 100 %] de l'exponentiel, réinitialisation après 60 s d'une connexion stable, délai d'établissement WebSocket de 15 s. Ajouter réveil de reconnexion MV3 par `chrome.alarms` toutes les 30 s (nouvelle permission `alarms`), sans empêcher le backoff court initial. Le test synthétique `scripts/check-navigation-reconnect.js` couvre les bornes et la stabilité ; les tests du gateway et d'isolation 2x2 passent. **Les tests ne prouvent pas encore le comportement réel après suspension/reprise de Chrome ; rechargement manuel de l'extension nécessaire.** Aucun navigateur utilisateur ni site protégé n'a été inspecté.

## 2026-11-01 — #291 : événements filtrés et leases coopératifs (étape suivante)

La recette réelle a validé le routage de deux navigateurs Tailscale et le ciblage effectif d'un **onglet public de démonstration** hébergé hors focus : `tabs.create` (`active:false`) → `page.evaluate` (`40+2` donne 42 sur le bon `tabId`) → `tabs.close`. La première évaluation est arrivée avant le chargement HTTPS et a été refusée comme prévu ; la recette complète attend la disponibilité du document. Aucune page privée n'a été lue.

Le gateway a maintenant une implémentation locale **non encore déployée** de `events.subscribe`/`events.unsubscribeAll`, avec filtrage par `browser_instance_id`, noms d'événements `page.*` et identifiants d'onglets ; pas de diffusion des notifications de page aux autres assistants, et suppression à la déconnexion. Un modèle simple de `tabs.lease.acquire`/`tabs.lease.release` coordonne les opérations concurrentes explicites sur `tabId` : durée 1–120 s, un propriétaire de socket à la fois, refus `-32026` pour les autres, expiration et nettoyage à la déconnexion. Les requêtes legacy sans `tabId` restent possibles : **lease coopératif, non barrière de sécurité**, et l'application de mandats reste distincte. Tests synthétiques de conflits, désinscription et non-fuite passants. Étape ultérieure : un contrôle strict de tous les actes sensibles par target/epoch et une façade d'abonnement et lease dans John/MCP.
