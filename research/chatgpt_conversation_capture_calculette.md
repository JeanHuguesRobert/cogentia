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
