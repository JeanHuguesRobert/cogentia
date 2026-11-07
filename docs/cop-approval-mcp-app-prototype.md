---
title: "COP — Prototype MCP Apps de revue d'autorisation proportionnée"
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
  - "docs/cop-trusted-principal-issuer-bridge.md"
  - "research/integration/proportionate_privileged_maintenance_2026-11-07.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Revue d'effet COP dans ChatGPT — séparation interface / autorité

## Source, intention, périmètre

Voir [#299](https://github.com/JeanHuguesRobert/cogentia/issues/299) (mandats COP et gouvernance), [#94](https://github.com/JeanHuguesRobert/cogentia/issues/94) (interopérabilité MCP Apps) et [FractaTest](mcp-apps-fractatest-smoke.md). La première interface FractaTest a passé son test de rendu et de bouton dans ChatGPT le 7 novembre 2026, après un retry. L'opération répétitive de signature SSH à chaque redémarrage MCP révèle un coût attentionnel disproportionné pour de la maintenance bornée.

Objectif : **un clic de confirmation humaine pour les seuls effets B qui le requièrent**, et exécution autonome A si le mandat durable déjà émis couvre effectivement la classe d'effet. La classification A/B/C ne constitue jamais un mandat : les restrictions de secret, budget, tiers et non-régression demeurent.

## Prototype livrable (source, non déployé)

- `cogentia_cop_approval_preview` est un outil **en lecture seule** qui projette `ui://cogentia/cop-approval-preview-v1`.
- Cette interface affiche une opération **illustrative**, et explique les contrôles encore nécessaires. Elle ne transmet pas de clic d'approbation au serveur ; aucun challenge, jeton, signature, émission, budget ou effet n'est créé.
- Repli textuel explicite `authorizes:false`, `grants_authority:false`, `execution:false` ; vérification `node scripts/check-cop-approval-preview.js`.
- Comme FractaTest, les ressources `resources/read` portent `ttlMs:0` et `cacheScope:private` même sans marqueur de protocole moderne ; interface autonome, sans réseau externe.

Cette étape valide seulement le contrat d'interface et la pédagogie du contrôle. **Aucune autorisation réelle n'est délivrable depuis ChatGPT aujourd'hui.** Ne pas présenter les boutons visuels comme preuve de présence humaine.

## Chemin restant avant une première confirmation réelle

1. **Source protégée :** lire une proposition d'effet émise par l'issuer root actuel, en lecture seule, avec identifiant opaque, hash et expiration ; ne jamais accepter une proposition inventée par le navigateur, le LLM ou le client MCP.
2. **Présence authentifiée :** associer une session humaine indépendante (OAuth/OIDC avec scope d'approbation émis au Principal, et step-up lié à l'effet exact ; ou session SSH personnelle sur le ThinkPad). La connexion ChatGPT seule n'est pas cette attestation.
3. **Challenge durable :** utiliser les primitives existantes `principal-approval-challenge.js` et `principal-step-up.js`, le journal COP canonique, le verrou version/budget et l'anti-rejeu. Ne créer aucun deuxième registre d'autorité.
4. **Issuer root :** seul le service root-owned confronte identité, mandat, version, révocation, budget, empreinte et preuve de geste, puis délivre un grant unique consommable par le broker existant. Aucun canal MCP ne reçoit un raccourci `sudo`.
5. **Reçu et recette :** distinguer demande présentée, clic local, attestation de présence, autorisation émise, effet exécuté, réconciliation budgétaire et état réel. Tester refus sur mauvais Principal, vieux hash, ancienne version, mandat révoqué, expiration, clic rejoué, stockage absent, manque de budget et absence de step-up.

**Critère de clôture opérationnelle :** pour un redémarrage de service déjà borné et couvert par mandat A/B, le Principal réalise au plus une confirmation légère authentifiée si elle est nécessaire ; le système exécute, constate, comptabilise et restaure sans étapes SSH manuelles répétitives. Les opérations C restent sous authentification indépendante renforcée.

## Non-régressions et exploitation

Ne pas redémarrer `mcp-cogentia.service` pour le seul prototype non émetteur : cela réclamerait la procédure de signature que ce chantier vise à rendre moins fréquente. Garder la MCP Apps FractaTest fonctionnelle. Aucun changement du courtier root, aucune extension de mandat, aucune dépendance au shell bootstrap. Pour les changements GitHub Actions futurs, respecter la double voie FBF : statut d'infrastructure distinct du résultat de tâche.
