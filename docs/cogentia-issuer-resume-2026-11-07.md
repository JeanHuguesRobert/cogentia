---
title: "FBF — reprise d'une installation partielle de l'issuer COP"
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
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Réconcilier l'issuer COP avant l'activation du Core OOPIF

**Addendum du 8 novembre 2026 :** le mandat de maintenance est désormais limité à `service.restart` du seul `mcp-cogentia.service`, pendant 48 heures et avec 12 unités au total. Il **ne requiert plus de signature individuelle** pour chaque redémarrage après l'enrôlement initial. Le paquet root et son empreinte doivent correspondre au nouveau code, avec remplacement du stage historique par comparaison exacte contre l'ancienne archive. Se reporter à [la décision actuelle](cop-bounded-mcp-development-mandate-2026-11-08.md) ; les séquences de signatures par effet ci-dessous sont conservées uniquement comme historique, non comme marche à suivre.



## Objectif immédiat

Activer le Core `5301f9a` dans `mcp-cogentia.service`, puis utiliser les nouvelles capacités de lecture `browser.hosted.inspect(action=frame_tree|frame_structure)` pour vérifier l'iframe La Banque Postale sans secret. L'extension hébergée **ne doit pas être modifiée ou redémarrée**. L'acte de maintenance `systemctl restart mcp-cogentia.service` exige une autorisation root indépendante du simple consentement dans ChatGPT.

## État réel observé sur Fracta2

- Service `mcp-cogentia.service` actif (utilisateur `ubuntu`), source sous `/srv/cogentia/repos/cogentia`. HEAD `5301f9a` au moment du premier contrôle.
- Broker `cogentia-super.service` actif sous `root`. Son accès est possible, mais le check COP indique `issuer_verified:false`, `payload_bound:false`, `budget_reserved:false` : aucune autorisation exécutable trouvée.
- Arborescence `/usr/local/libexec/cogentia-super/issuer/repos` déjà installée, root-owned, **18/18 fichiers strictement identiques** à l'archive canonique ; le manifeste n'est pas présent hors de l'archive. En revanche, `/etc/cogentia-super/principal-issuer.pub` et `/var/lib/cogentia-super/canonical-authority.sqlite` sont absents. Il s'agit d'un amorçage partiel, pas d'un issuer actif.
- `cogentia_host_process_prepare` a préparé en lecture seule l'effet exact `sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service` sur `node:fracta2`/`unix-process`, `super`, délai 30000 ms, hash `sha256:87064869cb8b1987fd34127aa2f5c4c57da7b393e29d7ead1371445126a82d39`. Le résultat est `EXPOSE`, **pas un grant**.

## Correction FBF publiée

`install-principal-issuer-bundle.py --activate --resume-verified-stage` exige une activation root explicite, les deux SHA256 de l'archive et de la clé publique contrôlées depuis le ThinkPad, et compare **exactement** le contenu déjà mis en place sous `/usr/local/libexec/cogentia-super/issuer` au paquet vérifié. Tout fichier supplémentaire, lien symbolique, différence d'octets, mauvais propriétaire ou permission d'écriture groupe/autres entraîne le refus. Il installe ensuite la clé publique et le registre COP sous root, sans générer de mandat ni de grant, puis vérifie le seul service `cogentia-super`. Le mode sans `--activate` n'installe rien.

Tests `scripts/super/principal-issuer-bundle.test.py` (déterminisme, refus d'archive modifiée, exactitude du stage, refus des fichiers ajoutés, modifiés et liens symboliques) et comparaison du véritable arbre déjà installé passent. Aucun `sudo`, aucune édition root n'a été utilisée dans ce traitement.

### Préparation non privilégiée réalisée

Sur Fracta2 :

- Archive : `/tmp/cogentia-maintenance-handoff-20261107/root-issuer.tar.gz` (19 membres, SHA256 `6272b7bfc0ec155eafeef244f201d5541a874361ec9e3febbc11f958d89f20e0`).
- Projet de mandat : `/tmp/cogentia-maintenance-handoff-20261107/maintenance-v1.json` (`mandate:jhn:maintenance@v1`, 12 étapes, trente jours ; doit être signé depuis le ThinkPad dans son intervalle de validité).

Ces objets n'autorisent rien. Avant l'activation root, le Principal doit choisir et vérifier sa clé publique SSH depuis le ThinkPad, contrôler l'installateur GitHub au commit dédié, puis fournir l'approbation indépendante. **Ne jamais importer ni transmettre la clé privée à l'agent.** Après l'activation : signer et enregistrer le mandat initial, préparer une proposition d'effet root issue du broker, la signer sous `cogentia-super-effect-v1`, émettre et consommer le grant exact, vérifier le reçu et la santé du MCP. `cogentia_host_process_prepare` n'est pas un substitut à la réservation signée du broker.

## Reste bloquant

La présence du code root ne remplace pas la clé publique du Principal, l'enrôlement du mandat signé ni la preuve d'effet à usage unique. Sans ce canal humain indépendant, ne pas déclencher `systemctl restart` via shell direct, sudo ou `host_process_run` non attesté. Ce blocage est d'autorité, non une impossibilité technique. Il évite que l'agent puisse réécrire les règles de l'issuer puis s'autoriser lui-même.

Après déploiement seulement, reprendre [#291](https://github.com/JeanHuguesRobert/cogentia/issues/291) : lecture redigée de l'iframe La Banque Postale et ensuite canal protégé `credential.fill` pour la connexion ; aucun contenu bancaire n'est encore transféré à Gmail.
