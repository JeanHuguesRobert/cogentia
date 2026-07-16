---
title: KYS Snapshot — MVP d’entrée
subtitle: Rendre visible, contestable et portable la représentation produite par un agent
author: Jean Hugues Noël Robert
status: working
version: '0.1'
date: '2026-07-13'
repository: cogentia
path: research/kys_mvp_entry.md
type: source_note
language: fr
tags:
  - KYS
  - KYS Snapshot
  - Cogentigram
  - miroir agentique
  - autonomie cognitive
  - autonomie agentique
  - PrivAI
  - Mariani School of Autonomy
  - local-first
related_documents:
  - research/Cogentia-and-Cogentigram.md
  - research/cogentia_workflows.md
  - research/cogentia-digital-twin.md
  - research/kys-prompt.md
related_repositories:
  - acorsica/privai
  - JeanHuguesRobert/barons-Mariani
document_role: source
document_kind: product-specification
visibility: public
lifecycle_state: working
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# KYS Snapshot — MVP d’entrée

## 1. Thèse

Les agents conversationnels construisent déjà une représentation de leurs utilisateurs : préférences, sujets récurrents, manières de raisonner, habitudes de travail, attentes et limites.

Le problème initial n’est pas de produire une analyse psychométrique plus ambitieuse. Il est de rendre cette représentation :

- visible ;
- compréhensible ;
- contestable ;
- corrigible ;
- portable ;
- gouvernable par la personne concernée.

Formule :

> KYS ne dit pas qui vous êtes. Il montre ce que votre agent croit savoir de vous, puis vous donne les moyens de le corriger.

## 2. Position dans l’architecture

```text
agent habituel de l’usager
  -> représentation explicitée
    -> KYS Snapshot personnel
      -> examen et corrections humaines
        -> prompt de correction
          -> représentation révisée
            -> export portable
```

Le KYS Snapshot constitue une porte d’entrée vers Cogentia et l’autonomie agentique. Il ne constitue pas encore un Cogentigram complet, un KYS Profile certifié ou un jumeau numérique.

## 3. Objet produit

Le MVP produit un **KYS Snapshot** :

- instantané ;
- personnel ;
- provisoire ;
- situé dans un contexte agentique déterminé ;
- incertain ;
- contestable ;
- exportable ;
- non certifié.

Le terme **KYS Profile** est réservé à une projection limitée et finalisée d’un corpus, gouvernée dans le futur cadre fiduciaire non lucratif de PrivAI.

PrivAI ne certifie pas la vérité sur une personne. PrivAI certifie les conditions, limites, finalités et garanties attachées à une représentation.

## 4. Promesse grand public

> Voyez ce que votre IA croit savoir de vous. Corrigez-la. Gardez le résultat.

Catégorie proposée :

> miroir agentique personnel

Formulation institutionnelle :

> audit personnel de relation à l’IA

## 5. Parcours minimal

```text
accueil
-> choix de l’agent
-> copie du prompt
-> exécution chez l’agent habituel
-> collage du seul résultat JSON
-> affichage du miroir
-> examen affirmation par affirmation
-> génération du prompt de correction
-> export facultatif
```

Le parcours initial ne demande :

- aucun compte ;
- aucune clé API ;
- aucune connexion au compte de l’agent ;
- aucune URL de conversation ;
- aucun historique conversationnel brut ;
- aucune adresse électronique.

## 6. Catégories du miroir

Le Snapshot d’entrée utilise cinq catégories compréhensibles :

1. ce que l’agent pense savoir ;
2. ce qu’il suppose ;
3. les sujets récurrents ;
4. la manière de travailler ensemble ;
5. ce qu’il ne sait pas.

Chaque affirmation comporte au minimum :

```json
{
  "claim": "",
  "basis": "",
  "confidence": "high | medium | low"
}
```

La confiance exprime celle déclarée par l’agent. Elle ne constitue ni une probabilité calibrée ni une mesure psychométrique.

## 7. Examen humain

Pour chaque affirmation, la personne peut répondre :

- **Oui, c’est moi** ;
- **À nuancer** ;
- **Non, pas du tout** ;
- **Ne pas conserver**.

L’indicateur principal porte sur l’examen du portrait : nombre d’éléments confirmés, nuancés, rejetés, privés ou non examinés.

Il ne porte pas sur la personnalité de l’usager.

## 8. Boucle de correction

Le produit génère un prompt de retour contenant :

- les éléments confirmés ;
- les nuances ;
- les rejets ;
- les éléments à ne pas conserver ni réutiliser.

La boucle fondamentale est :

```text
représentation agentique
-> observation humaine
-> correction
-> nouvelle représentation
```

Cette boucle constitue le premier exercice d’autonomie cognitive et agentique de The Mariani School of Autonomy.

## 9. Local-first

La première version doit fonctionner entièrement dans le navigateur après chargement de l’application.

Le Snapshot collé et les décisions de l’usager ne sont pas envoyés à Supabase ou à un autre service dans le parcours d’entrée.

Les données locales doivent pouvoir être :

- exportées ;
- effacées ;
- remplacées ;
- ultérieurement reprises dans un espace privé sur consentement explicite.

Un stockage local n’est pas présenté comme une protection absolue. Un appareil compromis ou partagé peut exposer son contenu.

## 10. Non-objectifs du MVP

Sont exclus du parcours d’entrée :

- les 73 indicateurs historiques ;
- les percentiles et écarts-types non calibrés ;
- les scores analogues au QI ou à la WAIS ;
- le diagnostic psychologique ;
- MBTI, DISC et Ennéagramme par défaut ;
- les récits générés par un modèle tiers ;
- la récupération automatique d’une URL de conversation ;
- la création obligatoire d’un compte ;
- la collecte précoce d’une adresse électronique ;
- la création automatique d’un jumeau numérique ;
- l’appellation KYS Profile pour un simple brouillon.

## 11. Limites à afficher

Le Snapshot dépend :

- de la mémoire réellement accessible à l’agent ;
- du contexte disponible au moment de la demande ;
- des règles du fournisseur ;
- de la tendance éventuelle du modèle à flatter, généraliser ou rationaliser ;
- des informations répétées par l’usager ;
- de la formulation du prompt.

Une répétition ne prouve pas une vérité. Une convergence entre agents ne prouve pas davantage une vérité indépendante lorsque les agents partagent des sources, des biais ou le même contexte fourni.

## 12. Sécurité et protection

Le parcours d’entrée doit respecter les règles suivantes :

- aucun fetch arbitraire d’URL ;
- aucune conversation brute nécessaire ;
- aucun accès public aux Snapshots ;
- aucun usage pour le recrutement, l’assurance, le crédit ou le ciblage politique ;
- aucune réutilisation pour l’entraînement sans consentement spécifique ;
- aucune confusion entre la personne et sa représentation ;
- droit de correction, de retrait et d’export.

## 13. Différenciation de marché

Les plateformes natives peuvent montrer comment une personne utilise leur propre agent. Les journaux IA peuvent analyser les textes déposés dans leur service. Les tests de personnalité produisent une typologie à partir d’un questionnaire.

KYS occupe une autre place :

> rendre visibles, contestables et portables les représentations que plusieurs agents produisent déjà de la personne.

Les avantages défendables sont :

- neutralité entre fournisseurs ;
- absence d’ingestion brute obligatoire ;
- contestation comme fonction centrale ;
- portabilité ;
- comparaison ultérieure entre agents ;
- gouvernance non extractive des futurs profils par PrivAI.

## 14. Frontière PrivAI

```text
KYS Snapshot personnel
  -> validation et versionnement
    -> définition d’une finalité
      -> règles d’accès et d’usage
        -> éventuellement KYS Profile
          -> gouvernance / certification PrivAI
            -> éventuellement contrat KYS
```

La conversion d’un Snapshot en KYS Profile n’est jamais automatique.

Elle exige au minimum :

- une finalité ;
- un périmètre ;
- une version ;
- un consentement ;
- des usages interdits ;
- des règles de contestation et de révocation ;
- une provenance ;
- une règle d’audit.

## 15. Critères d’acceptation du premier incrément

Un usager doit pouvoir :

1. comprendre la promesse sans connaître Cogentia ;
2. choisir son agent ;
3. copier un prompt court ;
4. coller uniquement le JSON produit ;
5. voir les cinq catégories ;
6. examiner chaque affirmation ;
7. ajouter une nuance ;
8. générer un prompt de correction ;
9. exporter un brouillon JSON ;
10. comprendre qu’il ne s’agit pas d’un KYS Profile certifié.

## 16. État d’implémentation au 13 juillet 2026

Le premier parcours vertical est ajouté dans `apps/personal` :

- page d’accueil recentrée sur le miroir agentique ;
- route `/snapshot` ;
- choix de l’agent ;
- prompt court structuré ;
- parseur JSON exécuté côté client ;
- cinq catégories ;
- quatre verdicts humains ;
- prompt de correction ;
- export JSON ;
- stockage local du brouillon ;
- page `/about` ;
- route de repli Netlify pour l’application monopage.

L’ancien parcours avancé Supabase reste présent mais n’est plus exposé dans la navigation principale.

## 17. Continuations prioritaires

1. reprise explicite d’un brouillon local après rechargement ;
2. bouton d’effacement local vérifiable ;
3. import d’un Snapshot précédemment exporté ;
4. seconde passe : import de la réponse corrigée ;
5. comparaison entre deux agents ;
6. passeport agentique portable ;
7. mesure qualitative de l’autonomie agentique ;
8. tests d’usage et observation des abandons ;
9. séparation technique complète du parcours historique ;
10. audit RLS et suppression du fetch d’URL arbitraire avant toute réexposition du parcours avancé.
