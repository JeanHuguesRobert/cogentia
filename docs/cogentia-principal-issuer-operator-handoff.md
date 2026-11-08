---
title: "Raccordement Principal — intervention initiale ThinkPad pour issuer COP"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.1"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "runbook"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "docs/cop-trusted-principal-issuer-bridge.md"
  - "docs/cogentia-super-install.md"
  - "docs/mcp-apps-fractatest-smoke.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Première installation d'une autorité COP protégée

**Mise à jour 8 novembre 2026 :** la procédure historique ci-dessous exigeait inutilement une signature par redémarrage du MCP. Elle est remplacée pour ce chantier par un mandat unique signé de **48 heures et 12 redémarrages** du seul `mcp-cogentia.service`, contrôlé à chaque exécution par COP. Voir [décision de portée](cop-bounded-mcp-development-mandate-2026-11-08.md). Ne pas utiliser la procédure `prepare/issue/run` pour cette maintenance récurrente ; l'entrée est désormais `principal-issuer-client.mjs restart_mcp` après l'enrôlement signé initial et l'installation de l'issuer root. Les autres demandes privilégiées restent soumises à leurs mandats propres.



**Destinataire** : Principal sur son ThinkPad, et agent Cogentia pilotant Fracta2. **État : procédure préparée et testée sans privilèges ; aucune activation `root` réalisée.**

## État et préconditions

Le broker `cogentia-super` actuellement actif est un service root distinct du MCP normal. Son registre d'autorisations est inaccessible au compte `ubuntu`. L'ancien COP SQLite `john-root-v1.sqlite` appartient à `ubuntu` : **ne jamais recopier ses mandats ou grants en tant qu'autorité root**. L'installation crée au besoin un COP canonique vide, root-owned, qui ne permet rien avant une déclaration signée. La voie générale de crise / bootstrap ne reçoit aucune autorité nouvelle du seul fait de cette installation.

L'agent peut effectuer sans Principal la construction (`python3 scripts/super/build-principal-issuer-bundle.py /tmp/principal-issuer.tar.gz`) et la vérification (`python3 scripts/super/verify-principal-issuer-bundle.py /tmp/principal-issuer.tar.gz <sha256>`), ainsi que la proposition non signée (`node scripts/super/prepare-maintenance-mandate.mjs /tmp/cogentia-maintenance-proposal.json`). Le paquet est reproductible, sa liste de fichiers est fermée, et les scripts ne demandent pas de secrets.

## L'unique étape d'activation privilégiée

Le Principal identifie sur le ThinkPad **la clé SSH privée qu'il contrôle effectivement** et sa clé publique correspondante, puis contrôle cette dernière et la copie sur Fracta2 dans un fichier de transit. Il calcule **localement** l'empreinte SHA256 exacte de ce fichier public. Ne transmettre à Fracta2 **que la clé publique** : la clé privée ne doit jamais être copiée ni montrée à l'agent.

L'installateur indépendant `scripts/super/install-principal-issuer-bundle.py` doit être obtenu par le ThinkPad à partir du **commit GitHub explicitement approuvé**, inspecté, puis transmis par stdin à une session SSH `sudo python3 -` sur Fracta2. Il accepte seulement le paquet dont le SHA256 a été explicitement fixé et dont le manifeste interne correspond à ses fichiers, ainsi qu'une clé publique correspondant au SHA256 localement contrôlé. **Sa phase par défaut est une prévisualisation sans installation.** L'option `--activate` exige la confirmation et le contrôle root opérés sur le ThinkPad ; elle installe les modules dans un arbre exclusivement root-owned, conserve le broker précédent pour récupération, crée le cas échéant un COP root-owned vide et redémarre le seul service `cogentia-super`.

**Ne jamais lancer la version de l'installateur située dans le checkout agent-modifiable avec `sudo` sans vérification indépendante de son code.** La session SSH et la revue humaine portent la provenance d'installation. La commande finale doit incorporer les empreintes réelles de l'archive et de la clé, pas des chaînes données par le modèle sans contrôle.

## Mandat initial : approbation réellement signée

La clé publique seule ne donne aucun pouvoir. L'agent prépare `mandate:jhn:maintenance@v1`, borné à `host.process.run` en mode `super` sur `node:fracta2`, non délégable, 12 étapes au maximum, sur 30 jours. Le Principal télécharge la proposition sur son ThinkPad, en examine le contenu exact, puis utilise `ssh-keygen -Y sign` avec son SSH privé existant et le namespace **`cogentia-maintenance-mandate-v1`**. Seuls la proposition et le fichier `.sig` reviennent vers Fracta2. L'agent lance alors `node scripts/super/principal-issuer-client.mjs enroll PROPOSITION.json SIGNATURE.sig` ; le broker vérifie à nouveau contre la clé root-owned et enregistre atomiquement les événements de mandat et de budget dans son COP protégé.

Un mandat ne constitue **pas** un grant `sudo`. Chaque effet privilégié reste préparé et signé à part tant que le canal de confirmation légère avec preuve de présence humaine n'est pas installé :

1. `principal-issuer-client.mjs prepare 'COMMANDE_EXACTE' 'RECOVERY_REF'` réserve une unité sous le mandat, puis produit la proposition canonique à signer.
2. Le Principal signe cette proposition sous `cogentia-super-effect-v1` sur son ThinkPad et retourne le fichier de signature ; `principal-issuer-client.mjs issue PROPOSITION.json SIGNATURE.sig` inscrit une autorisation à usage unique dans le registre root du broker.
3. `principal-issuer-client.mjs run AUTHORIZATION_ID PROPOSITION.json` consomme le droit, exécute uniquement l'effet exact, produit un reçu et vérifie les conséquences. Une reprise après incertitude exige vérification du reçu, non une deuxième émission.

Pour les actes B récurrents, la signature SSH par opération demeure un **repli provisoire**, plus contraignant qu'une simple confirmation. Le raccordement ultérieur à une approbation OAuth avec identité et présence humaine vérifiées est distinct et nécessaire pour obtenir l'ergonomie visée ; MCP Apps seul ne prouve pas l'identité du Principal.

## Vérification après installation

Contrôler le statut du broker et son reçu d'enrôlement, puis la réservation et la consommation d'un grant sur l'acte exact autorisé. Pour le redémarrage de `mcp-cogentia.service`, vérifier `systemctl is-active`, la réponse `/tools` contenant `cogentia_mcp_apps_demo` et `cogentia_risk_assess`, puis **seulement alors** solliciter le rechargement manuel des plugins ChatGPT et afficher réellement la MCP App. Conserver le reçu COP et le chemin de restauration du broker précédent.

**Aucun secret, commande root générique, publication externe ou droit de crise n'est automatiquement autorisé par ce runbook.**
