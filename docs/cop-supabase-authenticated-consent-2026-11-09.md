---
title: "COP — confirmation authentifiée Supabase JHN sur proposition canonique"
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
  - "docs/cop-consent-cli-mcp-app-2026-11-09.md"
  - "research/integration/jhn_supabase_principal_vault_mandates_2026-11-09.md"
---

# Authentifier la décision — sans donner d'autorité à MCP Apps

La recette MCP Apps `01901e6` a vérifié **annoncé, accessible, affiché,
interactif**. Les deux clics envoyés par `ui/message` restent des intentions
non authentifiées : ils ne doivent pas devenir des mandats via un raccourci.

La liaison `instances.principal_id` JHN est maintenant constatée dans Supabase.
Le nouveau code réutilise `createJhnSupabaseMandateApprovalService`,
`createVaultPrincipalPreflight`, `createJhnAuthSessionVerifier` et
`amendMandate()` du COP Inseme canonique. Aucune nouvelle table de mandats ni
nouvel émetteur hors journal COP n'est créée.

## Backend canonique (code et tests livrés)

`createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock})`
propose quatre opérations pour le processus **protégé de l'issuer** :

- `request({mandate,ttl_ms})` : reconstruit la proposition depuis une
  déclaration COP existante et active (`amendMandate` en mode de préparation
  sans écriture), calcule son hash déterministe et inscrit
  `PrincipalConsentRequested` dans **le même journal COP**. Elle est
  réservée au serveur de confiance, jamais à des arguments MCP ordinaires.
- `inspect({challenge_id})` : lit la proposition, le hash, l'expiration et
  l'état. La façade HTTP exige déjà la session authentifiée pour toute lecture.
- `decide({challenge_id,payload_hash,session,decision})` : confirme, via
  Supabase Auth `getUser`, que la session appartient au Principal lié au
  `principal_id` canonique ; vérifie l'empreinte et la durée, puis inscrit
  soit `PrincipalConsentApproved`, soit `PrincipalConsentRefused`, de manière
  atomique en séquence 2. Cette étape **n'émet pas de mandat**.
- `apply({challenge_id,session})` : capacité **strictement serveur** : exige
  une approbation persistée, recontrôle Supabase et l'état COP, consomme
  l'approbation en séquence 3 (`PrincipalConsentConsumed`, anti-rejeu), puis
  appelle `amendMandate` en revérifiant version, révocation et hash exact.
  Un refus ou une expiration ne peut jamais être appliqué.

Le processus doit être le **seul écrivain de confiance autorisé à émettre**
ces événements, et l'instance COP réelle doit être choisie/isolée sans
recopier un store en mémoire ou présenter une SQLite pilote comme production.
Un écrivain arbitraire ayant accès au journal pourrait falsifier des
événements : les objets du journal ne se prouvent pas eux-mêmes.

## Adaptateur HTTP et surface humaine

`createJhnConsentHttpHandler({workflow,origin})` offre seulement :

- `GET /api/cop/principal-consent/<challenge_id>` — revue de la demande,
  **Bearer Supabase Auth vérifié** requis.
- `POST /api/cop/principal-consent/<challenge_id>` — `{payload_hash,decision}`
  (`approve` ou `refuse`) ; même session et origine HTTPS vérifiées.

**Aucune route HTTP d'émission de mandat n'est exposée.** La décision
est une trace authentifiée ; l'application d'un mandat doit être orchestrée
par le processus protégé, avec ses propres règles et budgets.

La page React Inseme `src/pages/CopPrincipalConsentPage.jsx`, routée à
`/cop/consent/:challengeId`, utilise la session existante du Principal,
affiche le mandat exact, la version, le motif, les actions et l'empreinte,
puis propose confirmer/refuser. En cas d'absence de session, de backend ou
de résultat valide, elle échoue fermé. Aucun mot de passe n'est demandé
par Cogentia ; Inseme conserve la responsabilité de sa propre connexion.

## Frontière non encore franchie

**La présence du code n'est pas un déploiement réel.** Le nouveau handler
HTTP n'est **pas encore monté sur l'origine HTTPS réellement utilisée par
Inseme** ; le chemin `/api/cop/principal-consent/*` ne doit pas être
annoncé comme actif. La page React n'est pas publiée sur le site. Aucun
challenge authentique n'est créé depuis une MCP App ni envoyé à cette page.
Le registre de test SQLite est indépendant du journal COP déployé.

Pour effectuer le premier essai de bout en bout, il reste à :

1. Confirmer l'origine HTTPS Inseme et établir un routage réseau privé et
   authentifié vers **un seul** service d'issuer COP qui possède le registre
   canonique en écriture ; garder service-role et tokens hors des navigateurs.
2. Rendre le handler accessible uniquement sur cette origine, en veillant
   au contrôle de méthode, taille des requêtes, autorisation et anti-CSRF.
3. Déclencher un challenge depuis l'issuer sur une **proposition réelle mais
   sans effet externe**, puis n'envoyer que son identifiant opaque vers la
   page Inseme ; ne jamais émettre un challenge d'autorité simplement parce
   qu'un LLM a demandé un scope.
4. Vérifier en présence du Principal : affichage du hash original,
   authentification Supabase, clic réel, événement canonique, refus du rejeu,
   revalidation COP, budget et reçu. La MCP App pourra transmettre le lien
   de confirmation, mais son clic seul restera sans autorité.

Les tests source `jhn-canonical-consent-workflow.test.js` et
`jhn-consent-http-handler.test.js` couvrent approbation, refus, lecture
protégée, mauvaise session, origine croisée, hash divergent, expiration,
révocation, rejeu et absence de mutation en cas de refus.
