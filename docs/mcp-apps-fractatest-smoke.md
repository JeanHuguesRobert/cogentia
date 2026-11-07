---
title: "MCP Apps — FractaTest: read-only smoke and ChatGPT host verification"
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
  - "docs/cogentia-mcp.md"
  - "docs/cogentia-js-mcp-agent-path.md"
  - "research/cognitive_packets.md"
  - "research/fractacognition_principles.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# MCP Apps — FractaTest : paquet de travail et vérification hôte

## Objectif

Tester **dans ChatGPT**, sans accès privilégié ni effets externes, l'affichage d'une interface MCP Apps réellement fournie par le serveur Cogentia. Distinguer la conformité du serveur, le déploiement, la découverte par ChatGPT, puis le rendu de l'interface. Ne pas simuler une MCP App avec une interface locale qui ne passe pas par le connecteur.

## Rattachement et lots

- Sujet parent : [Cogentia #94 — migration MCP 2026-07-28](https://github.com/JeanHuguesRobert/cogentia/issues/94), puis [#299 — gouvernance et mandats COP](https://github.com/JeanHuguesRobert/cogentia/issues/299).
- **Lot A — Smoke MCP Apps :** ajouter `cogentia_mcp_apps_demo` en lecture seule et la ressource `ui://cogentia/fractatest-demo` ; tester `tools/list`, `tools/call`, `resources/read`, l'absence d'effets, et le repli sans UI. Réalisé localement, non déployé.
- **Lot B — Recette ChatGPT :** mettre en ligne la version validée du MCP sans secrets, actualiser/reconnecter le connecteur ChatGPT, appeler l'outil, vérifier que l'iframe apparaît, cliquer et conserver un reçu. **Non réalisé.** Nécessite la disponibilité de l'outil actualisé dans l'hôte.
- **Lot C — Continuités :** audit de parité entre Core, outil MCP connecté et contrat d'autorisation ; exposer les continuations par outils ordinaires. Réutiliser le Core, aucun magasin concurrent.
- **Lot D — MCP Tasks/MRTR :** vérification des capacités réellement négociées par l'hôte, adaptateurs facultatifs, repli explicite via le même Core et les handles COP. Non commencé ; ne pas prétendre que ChatGPT gère ces extensions sans preuve.

## Contrat technique du démonstrateur

- Tool `cogentia_mcp_apps_demo`, `_meta.ui.resourceUri = ui://cogentia/fractatest-demo`, `visibility = [model, app]`.
- Resource MIME `text/html;profile=mcp-app` ; HTML et JavaScript locaux, aucune connexion sortante, aucun identifiant ni donnée privée.
- `tools/call` retourne une enveloppe structurée `cogentia.mcp_apps_demo.v1` avec `mode=read_only`.
- La ressource inclut `_meta.ui.csp` interdisant les domaines réseau externes.
- Test local : `node scripts/check-mcp-apps-demo.js` ; régression dual-era : `node scripts/check-mcp-dual-era.js` ; smoke ajouté au reçu FBF de CI.

## Critères d'acceptation non confondus

1. **Source :** fichiers et tests locaux validés.
2. **Déploiement :** code effectivement servi par le point MCP, révision connue ; services non modifiés sur simple test source.
3. **Hôte :** ChatGPT découvre le nouvel outil et sait lire sa ressource `ui://`.
4. **UI :** le widget apparaît dans la conversation et son bouton modifie réellement l'affichage.
5. **Gouvernance :** aucun effet externe, aucune autorité implicite ; les extensions futures conservent le contrôle COP.

**Attention :** un smoke MCP passé côté serveur ne constitue PAS un Reality Test de rendu dans ChatGPT. Le connecteur peut nécessiter une reconnexion ou réindexation des outils ; aucune promesse de prise en charge de l'extension Tasks ou MRTR n'est inférée de la seule compatibilité MCP Apps.
