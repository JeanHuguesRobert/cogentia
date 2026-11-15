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

**Avantage économique structurant : l'inférence conversationnelle s'appuie sur ce dont dispose déjà l'usager** (compte, abonnement éventuel, quotas et fonctionnalités accessibles dans son agent habituel), au lieu d'exiger par défaut un second abonnement ou une facturation de jetons par Cogentia. Ce n'est **pas** une promesse d'usage illimité ni de coût total nul : les conditions du fournisseur, les plafonds d'utilisation, le VPS et son navigateur hébergé, le stockage, les sauvegardes et les embeddings restent à distinguer. La solution ne doit pas présupposer qu'un abonnement conversationnel donne accès à une API payante.

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

Un **VPS adapté** peut héberger une installation Cogentia/CPS par utilisateur, avec le corpus et ses index, l'identité, les mandats et les budgets, les connecteurs, le journal des événements **et son propre navigateur hébergé** (Brave/Chromium + Navigation Assistant pour la première intégration ChatGPT).

**Le navigateur hébergé est un composant indispensable du packaging initial de cette solution de télécommande**, pas une option à conserver indéfiniment sur l'infrastructure du concepteur. L'hébergement des navigateurs des usagers sur les machines JHN est strictement transitoire, réservé au prototypage et aux essais actuels. Chaque pilote externe doit pouvoir disposer de son navigateur isolé, sauvegardé et administrable dans son environnement VPS (ou dans une infrastructure explicitement dédiée qu'il contrôle), sans dépendance durable à `browser.fractavolta.com`. Cette exigence n'interdit pas d'autres architectures futures si un fournisseur rend un navigateur superflu.

La première procédure d'installation doit inclure : provisionnement, mises à jour, stockage des secrets, isolation du Principal, import initial volontaire, sauvegarde et restauration, export/révocation, supervision minimale et documentation des dépendances externes. Le choix VPS n'interdit pas de futures offres locales ou mutualisées. **Ne pas annoncer de minimum CPU/RAM, de prix ou de garantie de disponibilité sans mesures.**

## Prérequis structurels de la première version

Le pilote de Noël 2026 **n'est pas un produit autonome ne demandant qu'un compte ChatGPT**. Dans l'architecture actuelle, l'usager doit disposer des éléments suivants, ou les faire provisionner et contrôler pour son propre compte :

| Prérequis | Usage actuel | Conséquence pour l'installation |
| --- | --- | --- |
| Compte sur un agent conversationnel compatible, **ChatGPT d'abord** | Interface de conversation et capacités d'inférence déjà acquises par l'usager | Connexion effective, outils disponibles, quotas et limites vérifiés |
| **Compte GitHub** | Corpus personnel, dépôts et Git comme support de versionnage, audit et échange | Création/configuration des dépôts, permissions et révocation ; aucun jeton partagé entre Principaux |
| **Instance/projet Supabase propre au Principal** | Identité, authentification, consentements et données applicatives du jumeau | Provisionnement, migrations, clés/secrets, isolation, sauvegarde et contrôle du propriétaire |
| **VPS adapté et navigateur hébergé propre à l'usager** | CPS persistant, composants opérationnels, extension Navigation Assistant et télécommande des tours | Installation reproductible ; pas de dépendance durable aux machines ni aux sessions JHN |
| Accès à un fournisseur d'embeddings, ou solution locale testée | Indexation et recherche sémantique lorsque requises | Budget explicite, éventuel free tier, mode dégradé sans dépenses non autorisées |

**Github et Supabase sont des contraintes réelles du premier déploiement**, pas des propriétés nécessaires par définition à tout futur double numérique. La documentation d'installation doit les annoncer en amont, les provisionner de manière compréhensible et tester l'indépendance des comptes/instances. Aucun compte, projet Supabase ou navigateur partagé avec JHN ne doit être présupposé chez un nouvel usager.

### Trajectoires de distribution envisagées, sans les confondre

1. **V1 — VPS dédié / autohébergé assisté** : l'usager dispose de ses comptes GitHub et Supabase, de son VPS et de son navigateur. Cogentia est installé pour lui ; il conserve la maîtrise des identités et accès.
2. **V2 possible — hébergement managé « un usager, une instance »** : un opérateur installe, met à jour et supervise le VPS et éventuellement provisionne GitHub/Supabase au nom du Principal. Il faut des procédures d'accès, restitution, séparation des données et sortie vérifiées. Ce n'est **pas encore** un SaaS mutualisé.
3. **V3 possible — SaaS multi-utilisateur** : interface d'inscription et de facturation, infrastructure mutualisée ou par locataire, identité/secrets/stockages isolés, consentement et export. On pourrait remplacer progressivement Supabase ou GitHub par d'autres fournisseurs ou par des services intégrés, **à condition d'en conserver les fonctions vérifiables** (authentification, données, versionnage, traçabilité, reprise). Aucun de ces remplacements n'est réalisé aujourd'hui.

**Positionnement vis-à-vis d'OpenClaw (vérification novembre 2026) :** OpenClaw est principalement un logiciel libre *local-first* exécuté sur une machine contrôlée par son utilisateur, y compris un VPS ; ce n'est pas intrinsèquement une offre SaaS officielle. Des opérateurs tiers commercialisent des installations OpenClaw gérées ou des services d'agents en SaaS. Le modèle de déploiement est **indépendant** du choix du moteur : Cogentia peut offrir une installation personnelle, un VPS géré, puis éventuellement une expérience SaaS sans transformer sa doctrine de mandat ni absorber les données de tous les Principaux dans une autorité unique. Sources : [documentation de déploiement OpenClaw](https://docs.openclaw.ai/install), [présentation OpenClaw](https://docs.openclaw.ai/help/faq/what-is-openclaw). Les alternatives comparables — notamment n8n Cloud, Lindy ou plateformes d'agents managées — constituent des références de packaging, pas la preuve d'une équivalence fonctionnelle avec Cogentia.

## Économie de fonctionnement et provisionnement des embeddings

**Pas de nouvelle facture d'inférence Cogentia par défaut.** Les tâches conversationnelles doivent utiliser les capacités déjà acquises par chaque usager chez son fournisseur. Vérifier leurs limitations effectives avant toute promesse : quotas, restrictions des outils/MCP, régimes de comptes, conditions d'utilisation et résilience aux changements d'interface.

**Embeddings : seul poste d'API additionnelle actuellement identifié pour le chemin nominal**, à traiter explicitement. Le premier pilote doit disposer d'une configuration *provider / modèle / dimension / clé / plafond / consommation / alerte / suspension*, distincte de l'abonnement conversationnel. Étudier les *free tiers* réellement accessibles (quotas, confidentialité, conservation et usage des données, éligibilité), ainsi qu'une solution locale facultative pour petits corpus lorsqu'elle est viable. Prévoir un mode dégradé sans embeddings, ou une recherche lexicale, pour ne pas transformer un quota épuisé en perte de continuité du jumeau. Aucun fournisseur gratuit n'est réputé acquis avant vérification sur un compte pilote.

**Coûts distincts :** infrastructure VPS et navigateur, stockage/sauvegarde, réseau, opération du service éventuel et embeddings ; facturation d'inférence seulement si un parcours exige exceptionnellement une API de modèles distincte. Distinguer coût marginal d'inférence et coût complet du service ; ne pas prétendre « zéro dépense » si l'utilisateur doit louer un VPS.

## Critères d'acceptation du pilote Noël

1. Une personne volontaire **autre que le concepteur** possède son instance, son identité, ses données et ses mandats, sans hériter des droits ni du corpus JHN.
2. Son agent ChatGPT peut poursuivre une mission bornée sur plusieurs tours sans lui demander systématiquement « continuons », avec réception et corrélation COP de chaque étape.
3. Le nœud peut redémarrer sans perdre le mandat, la mémoire ou la possibilité de reprise. L'utilisateur peut examiner les preuves et reconnaître ce qui n'est pas achevé.
4. Le Principal peut restreindre ou révoquer les autorisations, exporter les données et récupérer son travail après une panne ; les effets externes restent bornés.
5. Installation et restauration sont reproductibles pour une personne extérieure au développement, **avec son navigateur hébergé isolé, son projet Supabase et son compte GitHub**, sans intervention improvisée du concepteur sur ses données.
6. Les embeddings disposent d'un provisionnement et d'un plafond de dépense testés ; un quota épuisé n'entraîne pas une dépense silencieuse ni une perte du mandat ou du Corpus.

## Chemin critique — avant le 25 décembre

- **P0** : rendre la relance réellement autonome par un ordonnanceur CPS persistant, au-delà de la télécommande exécutée par un contrôleur encore actif.
- **P0** : isoler plusieurs Principaux ; consentements et signatures, sauvegarde, restauration, révocation et secrets vérifiés.
- **P0** : empaqueter l'installation VPS **avec son navigateur hébergé propre**, son projet Supabase et son compte GitHub (configuration des accès, isolation des sessions, restauration, installation de l'extension et raccordement Navigation Assistant), puis mesurer ses ressources sur un pilote réel.
- **P0** : provisionnement simple des embeddings, quotas/budget, visibilité de consommation, recherche de *free tiers* pertinents et dégradation sans facturation non autorisée.
- **P1** : rendre intelligibles pour l'utilisateur le mandat, son état, les résultats, les limites et le coût.
- **Après le pilote** : élargir aux autres agents et travailler l'adaptateur MCP générique, sans compromettre la première livraison.

**Critère de succès :** une autre personne reçoit un double opérationnel distinct, lui confie une mission, retrouve des résultats et peut reprendre ou révoquer le mandat après une interruption.

**Règle anti-dérive :** le positionnement commercial ne doit pas devenir un prétexte pour retarder Noël en cherchant simultanément une prise en charge universelle des agents. Priorité à un premier jumeau réellement transmissible.
