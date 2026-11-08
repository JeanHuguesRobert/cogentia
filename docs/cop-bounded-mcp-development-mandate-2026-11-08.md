---
title: "COP — mandat de développement MCP réutilisable, limité dans le temps"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-08"
last_modified_at: "2026-11-08"
version: "0.1"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "architecture-decision"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-08"
review:
  status: "unreviewed"
---

# Mandat continu ≠ signature d'effet répétée

## Correction demandée par le Principal

Le mécanisme initial de maintenance imposait une nouvelle signature SSHSIG du Principal pour chaque redémarrage du MCP. Cette répétition était particulièrement mal adaptée à une séquence normale de mise au point nécessitant plusieurs cycles correction → redémarrage → test. Le mandat de maintenance historique accordait par ailleurs la capacité trop large `host.process.run`, même si chaque effet était ponctuellement exact. C'était une mauvaise répartition des frontières de responsabilité et de charge attentionnelle.

**Nouvelle règle :** une seule approbation SSHSIG émise par le Principal pour un **mandat borné dans le temps et dans sa portée** suffit pour les actes récurrents explicitement compris dans cette délégation. Chaque acte est contrôlé, imputé et traçable en aval sans répéter l'approbation humaine. Ce n'est pas une autorisation permanente.

## Politique d'essai retenue

- Identité stable : `mandate:jhn:maintenance@v1`, Principal `principal:jhn`, agent `agent:jhn`.
- Durée : **48 heures** au maximum à compter de la préparation ; validité contrôlée par COP avant chaque acte. Nouvelle période = nouvelle approbation ou amendement approprié, jamais renouvellement silencieux.
- Service autorisé : **uniquement `mcp-cogentia.service`** sur **`node:fracta2`**, en mode root. Capacité **`service.restart`**, sans interpréteur shell ni commande fournie par l'agent.
- Budget total : **12 redémarrages maximum**, avec `max_steps:12` dans le registre COP root-owned ; réservation préalable d'une unité, puis règlement après tentative réussie ou échouée. Le budget constitue un plafond, pas une obligation de consommer les douze opérations.
- Identité de l'issuer : signature SSHSIG réelle du Principal vérifiée au premier enrôlement. Le broker, seul acteur root habilité, refuse l'absence de preuve, l'absence de déclaration protégée, une portée différente, une version ancienne, une expiration, une suspension/révocation ou un budget épuisé.
- Interface : `principal-issuer-client.mjs restart_mcp`, commande **sans paramètres** ; le broker root choisit lui-même `/usr/bin/systemctl restart mcp-cogentia.service`, puis vérifie `is-active`. Pas de nouveau mandat, signature ni grant manuel à chaque redémarrage.
- Reçus : identité du mandat, service, réservation, règlement, solde. Une tentative échouée ou incertaine consomme une unité ; pas de relance automatique d'une opération sans constat.

## Frontières explicites

La **signature initiale** fonde le mandat : les RPC ultérieurs ne possèdent pas de pouvoir d'émission autonome et doivent passer par le broker root protégé et les journaux COP. L'accès au socket Unix du broker relève encore du contexte d'exécution local `ubuntu` : il ne fournit pas, à lui seul, une attestation cryptographique individuelle de chaque processus qui l'emploie. Le risque restant est donc un acteur local non autorisé disposant déjà des privilèges du compte `ubuntu` pendant la fenêtre de 48 heures. Cette délégation étroite et son budget limitent l'exposition, mais ne constituent pas une preuve parfaite d'identité par appel.

Une modification de l'extension du navigateur, un redémarrage d'un autre service, la modification de la configuration système, un envoi d'email, une opération bancaire ou l'exécution d'une commande arbitraire **restent hors mandat**.

## Recette, prérequis et retour au cas bancaire

- Tests SQLite : trois redémarrages simulés sous **le même** mandat puis refus budgétaire, expiration, portée invalide, issuer non fiable, révocation et imputation d'une tentative échouée. Aucune unité root réelle n'a été redémarrée durant ces tests.
- Le broker exige une version root-owned de l'adaptateur et une clé publique enrôlée ; tant que l'issuer n'est pas activé, **le mandat proposé n'est pas en vigueur**.
- Le paquet d'installation antérieur se trouve déjà partiellement déployé en code root-owned : sa reprise doit comparer les octets de l'ancien stage à une archive précédente épinglée avant de remplacer la bibliothèque root par la nouvelle. Ne jamais installer depuis un checkout agent-modifiable sans vérification du paquet.
- Après un premier redémarrage gouverné, recette des capacités OOPIF du Core en lecture sur l'onglet bancaire, puis chemin séparé des identifiants protégés ; aucun secret bancaire n'entre dans ce mandat de maintenance.

Cette correction illustre l'invariant : **autorité humaine ex ante suffisamment expressive, contrôle automatique à chaque acte, compte rendu ex post**.
