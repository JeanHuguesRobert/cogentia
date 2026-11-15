---
title: "Première offre Cogentia Personal Digital Twin — Noël 2026"
subtitle: "Augmenter un agent conversationnel existant plutôt qu'en imposer un nouveau"
date: "2026-11-15"
last_modified_at: "2026-11-15"
document_role: operational
document_kind: product-brief
visibility: public
lifecycle_state: working
language: fr
status: working-paper
related_documents:
  - ../research/ia_pour_tous_ia_pour_chacun.md
  - jhn-chatgpt-remote-turn.md
  - ../research/agent_john_identity.md
---

# Première offre Cogentia Personal Digital Twin — Noël 2026

## Promesse candidate

> **Transformer votre agent conversationnel en un véritable double numérique augmenté de vous-même.**

Le bénéfice n'est pas de « parler à une autre IA ». Il est de donner à l'agent que l'utilisateur connaît déjà une mémoire durable gouvernée, une continuité entre conversations et interruptions, un corpus personnel contrôlable, une capacité de délégation sous mandat, des preuves et corrections traçables, et la possibilité de révoquer ou déplacer son double numérique. Le « double » reste une représentation opérationnelle, jamais la personne elle-même.

Cogentia fournit le socle ouvert ; une éventuelle prestation d'installation, d'hébergement ou d'exploitation reste distincte. Aucun prix ni SLA commercial n'est encore décidé.

## Échéance déjà décidée : 25 décembre 2026

La décision de convergence du **31 octobre 2026**, consignée dans [IA pour tous, IA pour chacun](../research/ia_pour_tous_ia_pour_chacun.md), fixe au **25 décembre 2026** la cible des premiers jumeaux destinés à **d'autres personnes que le concepteur**. Il s'agit d'une première disponibilité expérimentale robuste et à capacités bornées, pas d'une promesse de maturité complète.

L'objectif connexe d'« âge adulte » d'Agent John à Noël, évoqué dans [Intent](../research/intent.md), est un horizon de maturité plus large ; il ne remplace pas le critère pratique du premier pilote externe.

## Stratégie de plateformes

| Plateforme | État au 15 novembre 2026 | Travail restant |
| --- | --- | --- |
| ChatGPT (Brave + Navigation Assistant + MCP) | Deux tours successifs réellement pilotés, résultats corrélés et reçus COP sur JHN | Déclenchement autonome persistant, installation isolée pour un second Principal |
| Autres agents conversationnels populaires | Cible ultérieure, non livrée | Adaptateurs, autorisations et reprise propres à chaque fournisseur |
| Tout agent prenant en charge MCP | Objectif de généricité, non démontré | Contrat d'interopérabilité, authentification, résultats intermédiaires et finaux, corrélation, idempotence, vérification de compatibilité réelle |

La simple connaissance de MCP par un agent ne garantit ni disponibilité de l'outil dans son interface, ni appel effectif, ni relance du tour. Lorsqu'un outil est absent, ne pas fabriquer son reçu.

## Première offre de déploiement : VPS

Un **VPS adapté** peut héberger une installation Cogentia/CPS par utilisateur, avec le corpus et ses index, l'identité, les mandats et les budgets, les connecteurs, le journal des événements et, si nécessaire, le navigateur Brave hébergé avec Navigation Assistant.

La première procédure d'installation doit inclure : provisionnement, mises à jour, stockage des secrets, isolation du Principal, import initial volontaire, sauvegarde et restauration, export/révocation, supervision minimale et documentation des dépendances externes. Le choix VPS n'interdit pas de futures offres locales ou mutualisées. **Ne pas annoncer de minimum CPU/RAM, de prix ou de garantie de disponibilité sans mesures.**

## Critères d'acceptation du pilote Noël

1. Une personne volontaire **autre que le concepteur** possède son instance, son identité, ses données et ses mandats, sans hériter des droits ni du corpus JHN.
2. Son agent ChatGPT peut poursuivre une mission bornée sur plusieurs tours sans lui demander systématiquement « continuons », avec réception et corrélation COP de chaque étape.
3. Le nœud peut redémarrer sans perdre le mandat, la mémoire ou la possibilité de reprise. L'utilisateur peut examiner les preuves et reconnaître ce qui n'est pas achevé.
4. Le Principal peut restreindre ou révoquer les autorisations, exporter les données et récupérer son travail après une panne ; les effets externes restent bornés.
5. Installation et restauration sont reproductibles pour une personne extérieure au développement, sans intervention improvisée du concepteur sur ses données.

## Chemin critique — avant le 25 décembre

- **P0** : rendre la relance réellement autonome par un ordonnanceur CPS persistant, au-delà de la télécommande exécutée par un contrôleur encore actif.
- **P0** : isoler plusieurs Principaux ; consentements et signatures, sauvegarde, restauration, révocation et secrets vérifiés.
- **P0** : empaqueter l'installation VPS et mesurer ses ressources sur un pilote réel.
- **P1** : rendre intelligibles pour l'utilisateur le mandat, son état, les résultats, les limites et le coût.
- **Après le pilote** : élargir aux autres agents et travailler l'adaptateur MCP générique, sans compromettre la première livraison.

**Critère de succès :** une autre personne reçoit un double opérationnel distinct, lui confie une mission, retrouve des résultats et peut reprendre ou révoquer le mandat après une interruption.

**Règle anti-dérive :** le positionnement commercial ne doit pas devenir un prétexte pour retarder Noël en cherchant simultanément une prise en charge universelle des agents. Priorité à un premier jumeau réellement transmissible.
