---
title: "FBF — recette iframe réelle et diagnostic COP de la navigation bancaire"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.2"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "reality-test"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Reality Test iframe, puis FBF du reçu COP

**Note corrective :** l’architecture de sélection de frames proposée le matin dans l’extension a été retirée du code source dans la tranche FBF suivante. Voir [bibliothèque JavaScript stable](navigation_stable_eval_library_fbf_2026-11-07.md). Le Reality Test Chrome et les reçus COP positifs restent valides, mais le chemin de déploiement d’une nouvelle extension n’est plus retenu.


## 1. Vraie navigation test, sans session personnelle

`node scripts/check-real-iframe-cdp.js` démarre une **instance Chromium headless distincte** avec profil temporaire et deux serveurs HTTP locaux (origines différentes car ports distincts). Le test appelle de véritables commandes CDP : `Page.getFrameTree`, `Page.createIsolatedWorld`, `Runtime.evaluate` du code de focus borné dans le contexte iframe et `Input.insertText`. Vérification indépendante de la valeur **fictive** `fixture-only-2026`. Résultat observé : `ok:true`, 2 frames, origine vérifiée, focus confirmé, 16 caractères insérés, relecture identique, `submitted:false`. Chromium hébergé du Principal inchangé ; aucun mot de passe, numéro de compte ni identifiant bancaire utilisé.

**Limites :** les deux origines ne sont pas un test OOPIF multi-processus ni une preuve de compatibilité de toutes les pages bancaires ; l'extension en production n'a pas été rechargée. Il s'agit d'une recette du mécanisme CDP réel, non d'une recette complète de la chaîne extension installée + gateway + COP + vault.

## 2. Analyse FBF du faux blocage COP

Deux essais initiaux via `cogentia_john_run(browser.hosted.inspect)` ont retourné `canonical_execution_receipt_unconfirmed`. Le diagnostic du code montre que ce libellé recouvrait indistinctement un appel exécuté avec `john.run.failed` (et réservation ensuite soldée), l'absence d'un reçu de fin et certains invalid-request.

**Causes concrètes côté appelant :**

1. L'invocation courte `cogentia_john_run` ne proposait aucun champ pour les arguments de lecture propres à l'outil (`action`, `tab_id`). « Inspecter les onglets » dans le texte du prompt ne transmet pas `action:'tabs'` : une capacité déterministe reçoit `{}` et peut échouer.
2. La première tentative de `request` manuel omettait plusieurs champs obligatoires du contrat `john.request.v1` (`budget.id`, `max_subagents`, `max_elapsed_ms`), d'où `invalid_request`, masqué par le même message générique.

**Test réel positif, sous autorité existante :** requête complète avec `principal:jhn`, `capability:browser.hosted.inspect`, `input.arguments:{action:'tabs',include_url:false}`, `max_steps:4`, `max_tool_calls:1`, `max_subagents:0`, `max_elapsed_ms:12000`, zéro effet et `handler.kind:'capability_once'`. Retour `ok:true`, `john.tool.receipt` et `john.run.completed`, 2 étapes soldées, 1 appel, 0 effets externes, `canonical_accounting.mandate_ref='mandate:jhn:john-root'`. Les onglets du navigateur hébergé ont été retrouvés.

**Seconde observation réelle :** `input.arguments:{action:'structure',tab_id:94450226}` a retourné `ok:true` et un reçu COP, avec une page bancaire comprenant cinq iframes, dont une à l'origine `https://voscomptesenligne.labanquepostale.fr`, et aucun champ bancaire lu. L'iframe de connexion est un **candidat** fondé sur l'origine, non une identité de champ encore vérifiée. Il faut la future `page.frames.list` avant de sélectionner une frame. Aucune saisie bancaire n'a eu lieu.

## 3. Correctifs FBF source, non déployés

- `john-read-argument-gate.js` : validation en amont d'un `read_arguments` optionnel sur les seules capacités `browser.hosted.inspect` et `browser.navigation.instances`. Interdiction des noms de champs arbitraires, actions inconnues, sélecteurs mal formés et usage avec requête brute. Aucun nouvel effet ou mandat.
- `john-cop-read-failure.js` : différence entre `canonical_execution_failed` (avec `failure_code` typé/sanitisé, ex. `BROWSER_ACTION_NOT_ALLOWED` ou `invalid_request`) et l'absence réelle de reçu de terminaison. Le règlement COP ne doit pas être déclaré réussi si le handler a échoué ; ne pas divulguer les corps des erreurs, URL ou credentials. Le budget consommé reste traçable.
- Tests ciblés de validation et d'erreurs, tests de compatibilité du MCP, et test réel dans Chromium indépendant.

**Aucune modification du courtier root, des règles d'autorité, du mandat ou du budget.** Déployer par le mécanisme COP habituel lors d'une tranche contrôlée ; ne pas prétendre que le serveur MCP actuellement chargé utilise déjà ce nouveau schéma. La recette suivante est celle de l'extension réellement installée sur une iframe fictive, puis celle de la voie `credential.fill` adaptée aux secrets, indépendamment du modèle. Le transfert d'un message bancaire à Gmail n'est pas encore accompli.
