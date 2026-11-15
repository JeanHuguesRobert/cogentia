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

## Déploiement : dépendances actuelles et cible « un VPS autonome »

**Rectification du 15 novembre 2026.** GitHub et Supabase sont des dépendances de l'implémentation JHN actuelle, **non des prérequis obligatoires du produit à terme**. Deux modes d'installation doivent être distingués, sans imposer leur ordre de développement par le nom « V1 » :

| Fonction indispensable | Implémentation JHN actuelle | Variante entièrement embarquée dans un VPS (à réaliser) |
| --- | --- | --- |
| Interface conversationnelle et inférence | Compte ChatGPT de l'usager | Même compte et mêmes quotas existants : l'inférence reste externe au VPS |
| Corpus versionné et historique | Git + dépôts GitHub | Git local dans le VPS, avec sauvegarde/export et dépôt distant facultatif |
| Identités, consentements, données applicatives | Supabase | Base locale adaptée (SQLite ou PostgreSQL) + authentification et consentement locaux ; remplacement fonctionnel à tester |
| COP, mandats, preuves et continuations | Services Cogentia et journaux COP | Services et stockage locaux sur le VPS, sans perdre traçabilité, révocation ni reprise |
| Navigation Assistant | Brave/Chromium hébergé | **Navigateur propre au VPS**, extension et passerelle isolées |
| Embeddings | API configurée séparément | API avec budget ou embeddings locaux ; recherche lexicale en secours |

**Un VPS autonome est une cible de packaging potentiellement plus simple pour l'usager** : une machine, une procédure d'installation, un domaine et ses sauvegardes. Aucun compte GitHub ni projet Supabase externe ne serait requis. Ne pas confondre **simplicité d'installation à l'usage** et **absence de travail d'ingénierie** : l'authentification, les migrations, les mandats, la sauvegarde et la reprise doivent avoir des substituts locaux effectivement testés avant d'affirmer que ce mode fonctionne.

L'autonomie recherchée est celle du **plan de contrôle et des données du jumeau** : le compte ChatGPT et les éventuelles API d'embeddings restent des dépendances externes explicites. Une installation concentrée sur un VPS est physiquement peu distribuée, mais elle n'interdit pas une architecture logiquement fédérable.

### Confédération ultérieure de VPS

La première instance autonome peut devenir **un nœud local d'une Confédération de Fractanets**, selon le [Principe de Localité](../research/locality_principle.md). Les Principaux conservent leur propre identité, corpus et autorité. Des coopérations entre VPS pourront transmettre, par protocoles explicites, des références, paquets cognitifs, tâches, preuves ou projections **sous mandats compatibles**, sans partager implicitement toutes les données ni confondre les autorités.

Conserver dès l'origine les invariants propices à cette extension : identifiants stables, références et preuves exportables, événements rejouables, frontières de confiance, mécanismes d'import/export, gestion des conflits et compatibilité de versions. **La confédération inter-VPS n'est pas encore opérationnelle** : ne pas ajouter un consensus global ou une infrastructure de fédération comme prérequis au pilote de Noël.

### Catalogue d'implémentations : portabilité sans capture

**Le choix de l'infrastructure ne doit pas devenir une dépendance irréversible du jumeau.** Le catalogue décrit des *fonctions* et, pour chacune, plusieurs réalisations possibles. Il ne choisit ni propriétaire ni fournisseur comme composant obligatoire :

| Fonction stable du jumeau | Implémentations candidates | Exigence de sortie |
| --- | --- | --- |
| Corpus/historique | Git local ; GitHub ; autre forge Git | Historique, références, droits et pièces récupérables |
| Identité, consentements et données | Supabase ; base et authentification locales ; service managé | Identité, droits, révocations et preuve du consentement transposables ou revalidés |
| Stockage des événements/continuations COP | SQLite ; PostgreSQL ; autre backend de journal | Rejouabilité, causalité, statut des mandats et idempotence conservés |
| Navigateur télécommandé | Brave hébergé ; Chromium hébergé ; autre adaptateur gouverné | Session reconnectable, secrets traités sans export illicite, capacité de reprise testée |
| Recherche/embeddings | API ; fournisseur gratuit vérifié ; moteur local ; recherche lexicale | Réindexation reproductible, compatibilité des dimensions/modèles ou reconstruction annoncée |
| Exécution/hébergement | VPS individuel ; installation locale ; hébergeur géré ; confédération de VPS | Sauvegarde, restauration, autonomie d'administration et migration à froid |

**Contrat de substitution, indépendant de la technologie :** chaque entrée de catalogue devrait déclarer son rôle, ses capacités réelles, ses formats, ses versions, les dépendances externes, les frontières d'autorité et de confidentialité, ses procédures d'export/import et de migration, ainsi que les écarts ou pertes connus. Une alternative affichée dans le catalogue est une **candidate**, non une compatibilité garantie ; distinguer *conçue*, *implémentée*, *testée* et *mise en production*.

Le test de portabilité n'est pas la seule extraction de fichiers. Après export depuis A et restauration dans B, arrêter ou rendre indisponible A ; vérifier qu'un handler ou un humain **froid** peut retrouver le corpus, les provenances, corrections et relations, interpréter les mandats et révocations, reprendre une continuation inachevée et produire un reçu attribuable. Les secrets, sessions et autorisations propres à un fournisseur **ne doivent pas être copiés illicitement** : les reconfigurer et revalider auprès du Principal quand nécessaire. Exiger intégrité, traçabilité et un inventaire explicite des éléments non transportables.

**« Sans perte » constitue un critère d'acceptation à démontrer**, pas une garantie générale anticipée. Un cache d'embeddings peut être recalculé ; une preuve historique, une décision de révocation ou une correction perdue ne le peut pas silencieusement. Réutiliser les six niveaux du [cadre de portabilité Cogentia](../research/cogentia_personal_data_portability.md) et l'épreuve indépendante [PrivAI Migration-Tested](https://github.com/acorsica/privai/blob/main/conformance/migration_tested_v0.1.md), plutôt que créer une certification concurrente.

**Pour Noël 2026 :** prouver au minimum la sauvegarde/restauration indépendante du premier pilote et produire le manifeste de ses dépendances/écarts. Une migration complète entre deux stacks hétérogènes constitue une étape supplémentaire à planifier sans bloquer artificiellement la livraison du premier jumeau externe.

### Trajectoires de distribution

1. **Mode actuellement éprouvé chez JHN** : VPS + navigateur personnel + GitHub + Supabase. C'est le chemin le plus proche du code existant pour un second Principal.
2. **Mode VPS tout-en-un (candidat prioritaire à évaluer)** : navigateur, état, identités, autorisations et Git local sur un seul nœud, sans comptes GitHub/Supabase obligatoires. Comparer son coût de réalisation et de validation au mode précédent pour la deadline du 25 décembre.
3. **Gestion de VPS dédiés** : un prestataire opère ces nœuds pour leurs Principaux, avec export et révocation ; ce n'est pas encore un SaaS mutualisé.
4. **Confédération de VPS ou SaaS éventuel** : trajectoires différentes, éventuellement complémentaires. La confédération organise des nœuds souverains ; le SaaS simplifie la fourniture d'un service et peut être mutualisé. Aucun des deux n'est une condition de la première offre.

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
5. Installation et restauration sont reproductibles pour une personne extérieure au développement, **avec son navigateur hébergé isolé et l'un des modes de stockage/authentification explicitement validés** : services GitHub/Supabase du Principal, ou équivalents locaux effectivement testés sur son VPS ; aucune dépendance cachée aux comptes JHN.
6. Les embeddings disposent d'un provisionnement et d'un plafond de dépense testés ; un quota épuisé n'entraîne pas une dépense silencieuse ni une perte du mandat ou du Corpus.

## Chemin critique — avant le 25 décembre

- **P0** : rendre la relance réellement autonome par un ordonnanceur CPS persistant, au-delà de la télécommande exécutée par un contrôleur encore actif.
- **P0** : isoler plusieurs Principaux ; consentements et signatures, sauvegarde, restauration, révocation et secrets vérifiés.
- **P0** : empaqueter l'installation VPS **avec son navigateur hébergé propre**, vérifier le chemin existant GitHub/Supabase, et comparer rapidement son coût au mode local autonome (Git + identité/données/consentements locaux). Choisir et tester **un chemin de livraison reproductible** pour Noël, avec isolation des sessions, restauration et raccordement Navigation Assistant ; mesurer ses ressources réelles.
- **P0** : provisionnement simple des embeddings, quotas/budget, visibilité de consommation, recherche de *free tiers* pertinents et dégradation sans facturation non autorisée.
- **P1** : rendre intelligibles pour l'utilisateur le mandat, son état, les résultats, les limites et le coût.
- **Après le pilote** : élargir aux autres agents et travailler l'adaptateur MCP générique, sans compromettre la première livraison.

**Critère de succès :** une autre personne reçoit un double opérationnel distinct, lui confie une mission, retrouve des résultats et peut reprendre ou révoquer le mandat après une interruption.

**Règle anti-dérive :** le positionnement commercial ne doit pas devenir un prétexte pour retarder Noël en cherchant simultanément une prise en charge universelle des agents. Priorité à un premier jumeau réellement transmissible.
