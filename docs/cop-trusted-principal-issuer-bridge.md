---
title: "COP — Pont de confiance Principal, signature et émission privilégiée"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.2"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "technical-note"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "docs/cop-proportionate-risk-implementation.md"
  - "docs/cogentia-super-install.md"
  - "research/integration/fractanet_principal_trust_2026-11-05.md"
  - "research/integration/proportionate_privileged_maintenance_2026-11-07.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Pont d'issuer — réalisé et restant

## Réalisé, avec tests

- `scripts/super/principal-effect-issuer.mjs` : vérifie une approbation SSHSIG indépendante sous namespace `cogentia-super-effect-v1`, la signature des octets canoniques de la proposition, Principal, acteur, validité courte, mandat/version, réservation identifiée, cible, `super`, hash de la commande exacte, récupération déclarée. Il ne crée PAS de grant.
- `scripts/lib/principal-super-effect-admission.js` : compose cette vérification avec **le véritable évaluateur** de mandat du paquet Inseme COP et l'existence des événements de réservation/financement dans un magasin COP. Il ne crée PAS de grant. `issuerVerified=true` n'est qu'une dépendance injectée par un *issuer* protégé ; l'exposer au client serait une vulnérabilité. Les magasins non protégés ne conviennent pas à la production.
- Tests incluant une signature Ed25519 générée par `ssh-keygen -Y sign` et vérifiée par `ssh-keygen -Y verify`, y compris refus des octets modifiés, mauvaises cibles, expiration, mandat/version ou réservation erronés.
- Suite de tests enregistrée dans le FBF CI sans exposer de clé ni de secret réel.

## 7 novembre — Verrou anti-rejeu COP (réalisé dans le code)

- L'admission `admitSignedSuperEffect` vérifie maintenant les événements terminaux : une réservation historiquement émise mais **libérée ou soldée** ne peut plus servir à émettre un effet privilégié.
- `claimSignedSuperEffect` enregistre un événement `PrivilegedEffectClaim` unique dans **le même journal COP**, sur un topic dédié à l'identifiant de réservation. L'append explicite `seq=1` rend une deuxième émission impossible pour un store disposant d'une contrainte atomique `(topic, seq)` ; test vérifié avec deux handles sur un fichier SQLite Inseme réel.
- Un reçu `COP_CLAIMED_NOT_ISSUED` est délibérément distinct d'un grant root : une panne entre la claim COP et l'émission root laisse un acte non exécuté et **non rejouable automatiquement**. Une reprise nécessitera une réconciliation gouvernée du paquet et de la réservation, sans re-signature implicite.
- **Limite de confiance déterminante :** les tests peuvent injecter des simulateurs d'issuer et de vérification de signature. Ces fonctions ne sont **pas une surface MCP**, et leur seul résultat n'établit pas l'identité du Principal. En production, seuls du code et une clé publique installés sous le contrôle root, avec accès au registre COP également protégé, pourront les appeler. Ne pas propager un booléen `issuerVerified` reçu d'un client comme preuve.

## Dernière frontière avant activation

1. Installer sous propriété `root`, indépendamment du dépôt modifiable par `ubuntu`, une version auditée du vérificateur, de son registre COP et des clés publiques de confiance. Aucun code exécutable privilégié ne doit être importé depuis un dépôt non protégé.
2. Établir une véritable identité de Principal enrôlée une fois depuis le ThinkPad. La signature SSH constitue un premier canal fort ; pour les actes B, une UI OAuth/approbation légère pourra produire des assertions de présence humaine exactes via `createPrincipalStepUpVerifier`, après installation d'un issuer humain réellement vérifié. Une simple session ChatGPT ou un bouton d'app ne suffit pas.
3. Réaliser une admission transactionnelle **mandat actif + version + budget réservé non consommé + issuer approuvé + hash exact**, puis inscrire un grant à usage unique dans le registre root-owned lu par `cogentia-super`. Le contrôle refuse désormais une réservation soldée ou libérée et prend un verrou de claim à usage unique dans COP ; il reste à vérifier l'atomicité transversale et la cohérence entre ce journal et le registre root-owned du courtier, sans laisser une panne intermédiaire provoquer une double exécution.
4. Consommer le grant par le broker, obtenir un reçu corrélé, constater l'état réel de `mcp-cogentia.service`, puis seulement demander la reconnexion ChatGPT et vérifier les deux nouveaux outils (`cogentia_mcp_apps_demo`, `cogentia_risk_assess`).
5. Préparer une procédure d'installation unique, inspectable et indépendante du MCP que l'on redémarre, à exécuter depuis le ThinkPad. Aucune commande de bootstrap ne doit être demandée tant que sa portée et sa récupération ne sont pas prouvées.

Ce lot établit **l'admission préparatoire réelle** ; il n'achève pas l'émission sécurisée en production. On ne doit pas assimiler `grants_authority=false` à une activation et il est interdit d'élargir la liste des origines acceptées par le courtier pour masquer l'absence d'émetteur vérifié.
