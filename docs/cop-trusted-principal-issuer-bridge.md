---
title: "COP — Pont de confiance Principal, signature et émission privilégiée"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.3"
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

## 7 novembre — Émetteur root et chemin d'enrôlement signés (source et prévisualisation)

L'infrastructure source complète désormais les primitives précédentes :

- `root-maintenance-mandate.mjs` accepte **une première déclaration v1 signée indépendamment** de `mandate:jhn:maintenance`, dans une portée limitée (`host.process.run`, nœud Fracta2, `super`, budget au plus 50 étapes et validité bornée). Elle crée atomiquement déclaration et budget dans le COP **root-owned**, sans produire de grant d'effet.
- `root-super-prepare.mjs` vérifie le mandat, réserve une étape COP, fabrique la proposition exacte à signer sous `cogentia-super-effect-v1`, et rend le travail traçable. Une réservation non revendiquée peut être libérée après expiration ; une claim déjà émise impose la réconciliation.
- `root-principal-effect-issue.mjs` vérifie la signature SSHSIG sur l'effet exact, la réservation courante et la claim unique, puis prépare un grant consommable dans le magasin de l'unique courtier `root`. Ce code refuse l'exécution hors du répertoire source root-owned et des magasins protégés.
- Le même processus `cogentia-super` expose les opérations internes `enroll`, `prepare`, `issue`, `run`. Aucune n'accepte une provenance d'autorité déclarée par le client à la place d'une signature réelle ; seul `run` exécute l'acte, après consommation de son grant. Les opérations d'issuer ne doivent jamais être ajoutées en tant que raccourcis de mutation MCP non authentifiés.
- `build-principal-issuer-bundle.py` produit un paquet déterministe de la fermeture des sources ; `verify-principal-issuer-bundle.py` valide la liste blanche et les hashes de chaque fichier. `install-principal-issuer-bundle.py` reste en prévisualisation par défaut et exige `--activate`, le privilège root et les empreintes explicites de l'archive et de la clé publique ; aucun mandat n'est généré par l'installation.

Les tests locaux prouvent une signature SSH réelle, un enrôlement canonique dans SQLite, une préparation bornée, une claim unique et la séparation `COP_CLAIMED_NOT_ISSUED` / `ROOT_GRANT_ISSUED_NOT_EXECUTED`. Ils ne démontrent pas encore une installation root ni un effet système sur Fracta2. **Une approbation de commande effectuée dans ChatGPT reste insuffisante pour attester une présence humaine au courtier.** À ce stade, SSHSIG depuis le ThinkPad est le canal initial ; un approbateur OAuth avec présence humaine vérifiée pourra ensuite diminuer le nombre de signatures manuelles pour la maintenance B.

## Dernière frontière avant activation

1. Depuis une session SSH du ThinkPad authentifiant le Principal, contrôler le paquet construit **après commit Git**, sa SHA256, et la SHA256 de la clé SSH effectivement contrôlée par l'humain ; installer une fois la version root-owned avec le script à activation explicite. Aucun code privilégié ne doit être importé depuis un dépôt non protégé.
2. Établir le mandat COP initial par une **proposition v1 effectivement signée sur le ThinkPad** (`cogentia-maintenance-mandate-v1`) et l'enregistrer dans le store protégé ; l'installation de la clé publique ne crée pas en elle-même ce mandat. Les futures évolutions doivent utiliser un amendement signé du même identifiant. Pour les actes B, une UI OAuth/approbation légère pourra produire une assertion de présence humaine exacte après enrôlement d'un issuer dédié ; une simple session ChatGPT ou un bouton d'app ne suffit pas.
3. Réaliser une admission transactionnelle **mandat actif + version + budget réservé non consommé + issuer approuvé + hash exact**, puis inscrire un grant à usage unique dans le registre root-owned lu par `cogentia-super`. Le contrôle refuse désormais une réservation soldée ou libérée et prend un verrou de claim à usage unique dans COP ; il reste à vérifier l'atomicité transversale et la cohérence entre ce journal et le registre root-owned du courtier, sans laisser une panne intermédiaire provoquer une double exécution.
4. Consommer le grant par le broker, obtenir un reçu corrélé, constater l'état réel de `mcp-cogentia.service`, puis seulement demander la reconnexion ChatGPT et vérifier les deux nouveaux outils (`cogentia_mcp_apps_demo`, `cogentia_risk_assess`).
5. Préparer une procédure d'installation unique, inspectable et indépendante du MCP que l'on redémarre, à exécuter depuis le ThinkPad. Aucune commande de bootstrap ne doit être demandée tant que sa portée et sa récupération ne sont pas prouvées.

Ce lot établit **l'admission préparatoire réelle** ; il n'achève pas l'émission sécurisée en production. On ne doit pas assimiler `grants_authority=false` à une activation et il est interdit d'élargir la liste des origines acceptées par le courtier pour masquer l'absence d'émetteur vérifié.
