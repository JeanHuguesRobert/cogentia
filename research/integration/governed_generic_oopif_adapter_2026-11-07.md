---
title: "Navigation COP — adaptateur CDP générique pour iframes interprocessus"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.1"
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

# Adaptateur CDP multi-contextes gouverné : recette et limites

## Objectif

Rendre possible l’exécution de **bibliothèques JavaScript du Core**, déjà soumises au mandat et au budget COP, dans une iframe d’origine distincte ou Chromium OOPIF, **sans réinstaller ni enrichir l'extension**. Ne jamais convertir l’accès CDP en une autorisation autonome : le transport ne décide ni du sens de l’acte ni de son admissibilité. L'objectif pratique demeure la lecture d'un message de La Banque Postale, puis son ingestion privée dans Gmail ; aucune connexion bancaire ni copie de message n'a encore été effectuée.

## Implémentation source

- `scripts/lib/browser-frame-cdp-transport.js` : ouvre une session sous bail sur l'onglet de l'instance de navigateur nommée ; pose via la primitive générique **existante** `page.evaluate` un nonce éphémère non énumérable dans cet onglet, puis retrouve la cible CDP par **preuve du nonce** (une URL identique ne suffit pas). Refuse les cibles absentes/ambiguës, les endpoints non locaux, les URL changées et les onglets déplacés ; efface le marqueur après l'opération lorsque possible.
- Pour une iframe dans le processus principal : `Page.getFrameTree`, `Page.createIsolatedWorld`, puis `Runtime.evaluate(contextId)` avec contrôle du couple `frameId/origin` avant l'exécution.
- Pour un OOPIF : `Target.getTargets` et attachement **générique** `Target.attachToTarget(flatten:true)` à la session de la sous-frame, exclusivement si `parentId` et `parentFrameId` correspondent à la cible racine sélectionnée. Une origine différente, un ID ambigu ou une navigation invalide entraînent un refus. Aucun script spécifique à La Banque Postale dans l'extension.
- `browser.hosted.inspect(action=frame_tree|frame_structure)` : capacités de lecture, sous contrôle COP de lecture ; retour seulement des identifiants opaques, origines et métadonnées de champs, **sans valeur saisie**, contenu bancaire, corps de page ni cookies. Un nonce transient dans le contexte JS du document est utilisé pour l'attestation technique d'onglet ; ne pas le confondre avec une attestation cryptographique du navigateur ou un mandat.
- `browser.form.fill` : la capacité sémantique **déjà définie**, avec `frame_id` et `expected_frame_origin` facultatifs, peut invoquer la bibliothèque Core. Le chemin d'exécution à effet reste derrière la vérification **distincte et signée** `executeJohnCanonicalForm` et une réservation du budget. Le contrat valide les paramètres et refuse explicitement les autorisations de portée différente.

## Recettes obtenues

- `node scripts/check-governed-frame-transport-reality.js` : démarre un **Chromium distinct** avec profil temporaire, deux origines HTTPS locales, un simulacre de passerelle transportant les RPC génériques de l'extension, et une iframe **OOPIF** isolée par Chrome. Le vrai transport Core `createHostedFrameTransport` lie la tab gateway à la target CDP via nonce, vérifie `parentId/parentFrameId`, lit la structure par `browser.hosted.inspect`, puis insère 17 caractères fictifs via `browser.form.fill`. Aucune soumission, aucun secret, aucune modification du navigateur hébergé. Deux exécutions consécutives réussies après stabilisation du chargement ; contrôles négatifs sur URL et origine incompatibles.
- `node scripts/check-john-form-assist-cop.js` : mandat **fictif signé** dans un registre **temporaire**, démontre préflight, réservation, exécution d'une capacité simulée, reçu, imputation de budget, refus de rejeu et révocation, y compris arguments d'une iframe. Ceci prouve le contrôle d'accès COP au niveau du code, **pas** une écriture bancaire autorisée en production.
- `node scripts/check-john-form-mcp-opt-in.js` : corrigé pour utiliser un registre COP temporaire. Attention : l'ancienne version du test, liée à `/var/lib/cogentia/cop/john-root-v1.sqlite`, pouvait exécuter et comptabiliser une demande de test en production si un mandat de formulaire valide était apparu. Un essai antérieur a renvoyé `form_result_not_confirmed` ; sa comptabilisation éventuelle est à réconcilier dans le registre. Ne plus lancer l'ancienne version contre un registre réel.
- Tests unitaires ciblés, rétrocompatibilité du pont générique `page.evaluate`, et tests MCP dual-era passent.

## Limites qui interdisent une conclusion prématurée

1. **Code source publié ≠ déploiement** : ce nouvel adaptateur n'est pas encore chargé dans le service MCP de production. Une recette dans un Chromium jetable n'est pas une réussite sur l'onglet bancaire.
2. `browser.form.fill` est exclusivement **non secret** : les champs `autocomplete=username`, `password`, OTP, carte bancaire sont exclus des recettes ordinaires. Le canal `credential.lookup/fill` doit être indépendant (coffre → navigateur), sans chaîne d'identifiant dans des arguments ou journaux visibles au modèle.
3. L'adaptateur CDP utilise un port local de diagnostic lié à une instance de navigateur. Une instance mal configurée, des onglets non corrélés ou plusieurs cibles identiques doivent refuser l'exécution ; jamais de reprise par correspondance approximative.
4. La sémantique d'une recette JS à effet reste la responsabilité du **contrôle COP préalable** ; la permission de coder et la présence d'un endpoint CDP ne suffisent pas à intervenir sur un système bancaire ou à publier un message.
5. L'authentification renforcée et la messagerie bancaire restent dans la session contrôlée par le Principal. Aucun courriel envoyé ; aucune action financière.

**Prochaine opération utile :** déployer la version du **Core seul** par une procédure reconnue et dûment autorisée (sans reload de l'extension), vérifier `frame_tree` et `frame_structure` en lecture via `cogentia_john_run` avec un reçu canonique, puis finaliser le canal d'identifiants protégés. Si le runtime ne dispose pas du mandat de déploiement, documenter le blocage précis plutôt que de substituer du CDP direct à l'admission COP.
