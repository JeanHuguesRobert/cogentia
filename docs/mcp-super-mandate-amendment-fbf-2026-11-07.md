---
title: "FBF — MCP Private, mandat amendable et autorité d'exécution super"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.1"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "technical-note"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "docs/mcp-apps-fractatest-smoke.md"
  - "docs/cogentia-super-install.md"
  - "docs/cogentia-mcp.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# FBF — Mandat évolutif et autorisation super

## Constat réel

Le 7 novembre 2026, pour déployer le smoke MCP Apps (`f034fec`), l'utilisateur a autorisé explicitement le redémarrage de `mcp-cogentia.service`. La voie `normal` a retourné « Interactive authentication required ». Cogentia Private a correctement préparé le payload et produit une autorisation #171 `authority_origin=mcp_jhn_attested_mutate`, sous `principal:jhn`, pour l'acte exact. Le courtier root a refusé `cop_authorization_denied` ; une nouvelle tentative par le MCP Unix `super` a été également refusée. Le serveur actif n'a pas été redémarré.

## Deux frontières indépendantes

1. L'**amendement de mandat** : conserver le `mandate_id`, émettre `vN+1` dans COP, imputer au Principal, conserver preuve d'approbation et lien vers la déclaration précédente. Implémenté dans Inseme [`daaeffb`](https://github.com/JeanHuguesRobert/inseme/commit/daaeffb) avec `amendMandate(store, input, {verifyPrincipalApproval})` ; aucun mandat de production n'a été amendé. Le vérificateur d'issuer doit être indépendant du modèle et de la seule session MCP.
2. L'**émission d'un effet privilégié** : le broker root ne consomme que les autorisations enregistrées dans son store root-owned, avec `authority_origin=principal|verified_mission`, réservation COP, correspondance exacte du hash, Principal, acteur, mandat, cible et durée. L'origine de la session MCP (`mcp_jhn_attested_mutate`) ne satisfait volontairement pas cette condition. Ne PAS ajouter cette origine à l'allowlist du broker.

Le mandat de transport `mandate:chatgpt-corpus-coding` **n'est pas** automatiquement une déclaration d'autorité root ; la preuve d'un échange de chat autorisant un acte n'équivaut pas à une signature ou attestation acceptée par l'issuer de confiance. L'autorité demandée pour relancer *un service précis* ne peut pas devenir un droit sudo général.

## Reste à implémenter (bloquant pour le déploiement)

- Offrir au Principal un workflow **PREPARE → revue de l'amendement exact → approbation indépendante → issuer COP enregistré → vérification de version et de budget** ; éviter de multiplier les identifiants de mandats et ne jamais copier les signatures antérieures.
- Assurer l'admission atomique des nouvelles versions par le store autoritatif en présence de plusieurs processus (le helper Inseme assume pour l'instant un traitement séquentiel).
- Permettre à un issuer de confiance de produire une autorisation d'effet **root-owned**, limitée à la commande `sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service`, au bon acteur/cible, à usage unique, avec reçu de consommation. Ne pas fabriquer cette preuve depuis une chaîne de texte ou une simple autorisation #171 issue de MCP.
- Vérifier le `cop_authorization_denied` et une consommation réussie par le même broker ; ne pas recommencer l'effet sans vérifier le reçu et l'état réel.
- Enfin, vérifier `tools/list` sur le MCP vivant, puis faire recharger les plugins ChatGPT et réellement afficher l'interface.

**État au 2026-11-07 :** code MCP Apps poussé, tests locaux verts, correctif d'amendement COP poussé, root issuer bridge non réalisé, service non redémarré, widget ChatGPT non observé. Ne pas confondre intention, capacité, autorisation et effet.
