---
title: "COP consent — shared CLI / MCP Apps / A2A packet contract"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: operational
document_kind: technical-note
visibility: public
language: fr
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "research/integration/jhn_supabase_principal_vault_mandates_2026-11-09.md"
  - "docs/cop-approval-mcp-app-prototype.md"
---

# Intention de consentement COP — surfaces multiples, autorité unique

## Objectif et délimitation

Une proposition COP de type `cop.mandate-amendment.proposal/v1` doit être
lisible et révisable par un Principal via une CLI ou une MCP App, puis à terme
via A2A et d'autres interfaces. L'interface ne détient jamais le droit de
s'inventer une identité, une signature, un mandat ni un grant : la même
proposition, la même empreinte et les mêmes vérifications gouvernent tous
les transports.

**Livré dans ce lot :**

- `scripts/lib/cop-proposal-digest.js` : sérialisation JSON déterministe par
  clés triées, empreinte SHA-256 du contenu canonique ; utilisée à la fois
  par le pont d'amendement et le paquet inter-surface.
- `scripts/lib/cop-consent-packet.js` : `copReviewPacket(proposal)` pour
  afficher une proposition et `copConsentIntent(packet, decision)` pour
  former une intention `approve` / `refuse`. Les paquets rendent
  `authority:none`, `issuer_verified:false`, `grants_mandate_authority:false`.
  L'intention n'est **pas une approbation COP** et ne déclenche aucun effet.
- `node scripts/cogentia.js cop consent review --from <proposal.json> --json` :
  revue lisible et machine-readable d'une proposition contenue dans un fichier.
- `node scripts/cogentia.js cop consent decide --from <proposal.json>
  --decision approve|refuse --json` : confirmation de l'intention sur terminal
  interactif avec vérification d'un préfixe de l'empreinte ; retourne un paquet
  sans signature. Un appel sans terminal échoue fermé. Rien n'est écrit au
  journal COP par cette simple intention.
- `cogentia_cop_consent_review` : nouvel outil **MCP privé en lecture seule**,
  attaché à `ui://cogentia/cop-consent-review-v1`. Il présente la proposition,
  le motif, la version et l'empreinte. Deux boutons permettent l'expression
  favorable ou défavorable ; la MCP App transmet ensuite un `ui/message`
  explicite à la conversation hôte. C'est une intention, non une preuve
  d'identité ou d'autorisation.
- La ressource MCP est autonome, sans `fetch()`, URL extérieure, jeton ni
  accès aux valeurs du Vault. Un client sans MCP Apps conserve le résultat
  structuré et sa description textuelle. L'outil n'est pas annoncé dans le
  catalogue public anonyme.

## Pourquoi le clic ne peut pas immédiatement émettre un mandat

La connexion ChatGPT, un clic `ui/message` et un token technique de tunnel
ne prouvent pas qu'un acte précis a été confirmé depuis une session de
`jhr@baronsmariani.org` vérifiée par Supabase Auth. La source `proposal`
transmise à ce nouvel outil est également **non attestée** : un agent pourrait
la construire. La présentation de la bonne empreinte ne suffit pas à prouver
qu'un émetteur indépendant la tient pour la proposition authentique.

Le pont `createJhnSupabaseMandateApprovalService` déjà codé attend une vraie
confirmation `verifyExactApproval` avec `payload_hash` identique, preuve
consommée à usage unique et rattachement au compte JHN. La création d'un
mandat initial exige en plus l'attribution vérifiée du budget canonique.

**Passage en production des approbations :** (1) serveur d'approbation dans
une session Supabase Auth effectivement contrôlée par le Principal ; (2)
challenge immuable émis depuis le registre COP canonique et non depuis les
arguments d'un agent ; (3) preuve d'approbation transactionnelle émise ou
validée par le serveur après présence humaine ; (4) écriture atomique versionnée
et comptabilisation COP avec anti-rejeu ; (5) recette réelle de refus et effet.

Cette architecture réutilise les bibliothèques de `principal-approval-challenge`,
`principal-step-up` et `vault-anchored-mandate-amendment` ; elle ne crée pas
une seconde chaîne de confiance ni un système de droits spécifique à MCP Apps.

## Déploiement / recette

Les bibliothèques et les deux surfaces sont publiables sans accès aux secrets.
Le nouvel outil et la nouvelle ressource MCP nécessitent **le redémarrage du
service MCP**, puis l'actualisation du connecteur privé ChatGPT et une nouvelle
conversation (le catalogue des outils d'une ancienne conversation peut rester
figé, FBF 2026-11-09). Ne pas revendiquer d'affichage dans ChatGPT avant
constatation réelle ; un test local `tools/list`/`tools/call`/`resources/read`
ne prouve pas la disponibilité dans l'interface ChatGPT.

Tests : `node scripts/check-cop-consent-surface.js` et
`node --test scripts/lib/cop-consent-packet.test.js
scripts/lib/cop-consent-cli.test.js`. La création et la consommation de
mandats de production sont délibérément hors périmètre de ce lot.
