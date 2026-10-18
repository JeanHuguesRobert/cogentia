---
title: "D2Lab — Wikis are here to stay : deux offres, une promesse de pérennité"
author: "Jean Hugues Noël Robert (témoignage) ; reconstitution documentaire assistée"
date: "2026-10-18"
status: "source historique en cours de vérification"
document_role: source
document_kind: historical-reconstruction
visibility: public
license: "CC BY-SA 4.0"
update_policy: UP-DEFAULT-REVIEWED
review:
  status: unreviewed
  reviewed_by: []
provenance:
  origin_type: "témoignage direct et traces historiques"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-10-18"
  derived_from:
    - "https://github.com/JeanHuguesRobert/simpli"
---

# D2Lab : « Wikis are here to stay »

## Thèse historique — témoignage du fondateur (18 octobre 2026)

D2Lab, entreprise de Jean Hugues Robert au milieu des années 2000, portait **deux offres articulées** :

1. **Le stockage distribué et mutualisé**, conçu comme infrastructure de **pérennité** : rendre les connaissances et leurs supports moins dépendants d'un serveur, d'un hébergeur ou d'une organisation unique.
2. **Un moteur Wiki**, envisagé comme la *killer application* susceptible de rendre cette infrastructure immédiatement utile et désirable.

Le slogan historique rapporté par le fondateur est **« Wikis are here to stay »**. Il ne faut donc pas décrire les deux offres comme deux initiatives sans rapport : le Wiki est le cas d'usage, la mutualisation la réponse à la question de sa durée.

**Statut probatoire :** cette articulation et le slogan sont attestés ici par le **témoignage rétrospectif du fondateur**, non encore par un document commercial contemporain retrouvé. La date exacte de création, la répartition des rôles, les fonctionnalités réellement livrées et le niveau de maturité du stockage restent à documenter.

## Traces indépendantes contemporaines et postérieures

- **3 février 2008 :** Thierry Parmentelat indique par courrier électronique avoir récupéré une archive Subversion du code Rails et les bases `d2lab`, `circle2`, ainsi que leurs variantes de test. C'est une **preuve de l'existence d'une archive**, non une preuve de conservation actuelle ni de la présence du moteur de stockage distribué. Source primaire : conversation privée intitulée *Re: d2lab.com*, datée du 3 février 2008 ; localisation technique volontairement non publiée.
- **Février 2008 :** échanges avec Rodolphe Briet sur le transfert des domaines `d2lab.com` et `d2lab.net`, et le devenir de l'hébergement Typhon ; ce transfert est alors **prévu**, son accomplissement n'étant pas prouvé par cette seule correspondance.
- **2006 / 2018 :** des assets Digipees, dont `digipees21-08-2006.svg` et `digipies02.svg`, ont été transmis de nouveau en 2018 ; ils attestent une identité visuelle historique, non une implémentation du stockage.
- **Simpli :** le [README historique](https://github.com/JeanHuguesRobert/simpli/blob/master/README.md) décrit SimpliJs comme « the Wiki CMS that powers SimpliWiki » ; il conserve une feuille de route d'avril 2016 mentionnant Kudocracy et l'héritage des pages. Une [page wiki conservée](https://github.com/JeanHuguesRobert/simpli/blob/master/simplijs/wiki/@SimpliWiki) porte une date de septembre 2010. Ces traces étayent la **continuation du volet Wiki**, sans démontrer que le stockage distribué de D2Lab a lui aussi été maintenu.

## Filiation architecturale — interprétation, pas équivalence

```text
D2Lab (milieu des années 2000)
  ├─ Wiki Engine : connaissance créée, modifiée, reliée
  │    └─ continuation attestée : SimpliWiki / SimpliJs
  └─ stockage mutualisé : pérennité recherchée
       └─ continuation technique directe : à établir

Cogentia (2026) : mémoire, provenance, mandats,
continuité cognitive et reprise sur processeurs interchangeables.
```

La continuité **d'intention** entre « Wikis are here to stay » et Cogentia est forte : faire survivre la valeur informationnelle à ses supports contingents. Mais il faut distinguer :
- **durabilité des octets** (réplication, réparation, contrôle d'intégrité) ;
- **lisibilité durable** (formats, clés, logiciels, dépendances) ;
- **continuité d'usage** (capacité de relancer le service) ;
- **continuité cognitive** (reprendre un travail avec objectif, état, mandat et provenance).

D2Lab ambitionnait d'abord la pérennité des wikis. Il ne serait pas justifié de lui attribuer rétrospectivement les propriétés et protocoles précis de Cogentia sans archives techniques.

## Comparaisons contemporaines — pistes, pas généalogie prouvée

Tahoe-LAFS (chiffrement et redondance sous logiciels libres), Garage/Deuxfleurs (stockage objet distribué auto-hébergeable), Ceph, SeaweedFS et IPFS offrent des points de comparaison. Les solutions industrielles comme Hivenet peuvent être distribuées **sans** que tout leur contrôle logiciel soit libre ni qu'un tiers puisse reconstruire un réseau indépendant. La question centrale n'est donc pas seulement « est-ce distribué ? », mais **« qui peut continuer à lire, réparer et exploiter les contenus après la disparition d'un opérateur ? »**. Aucun lien historique direct D2Lab ↔ Hivenet/Inria n'est établi.

## Lacunes et actions d'archéologie

1. Retrouver présentations, captures du site et offres D2Lab (env. 2005–2008), afin de corroborer le slogan et l'articulation commerciale.
2. Localiser l'archive Subversion et les sauvegardes mentionnées en février 2008 ; ne solliciter d'anciens collaborateurs qu'après vérification des traces facilement accessibles.
3. Déterminer la mécanique du stockage : nœuds, réplication/codage, chiffrement, contrôle d'intégrité, incitations, gestion des départs, droits d'accès ; marquer chaque propriété **unknown** tant que non attestée.
4. Inventorier les licences et la propriété intellectuelle de D2Lab et de Simpli, sans déduire une licence du seul accès au code source.
5. Documenter séparément les filiations D2Lab→Simpli et D2Lab→Cogentia : distinguer héritage du code, filiation des concepts et rapprochement rétrospectif.

## Références publiques

- [Simpli — dépôt historique](https://github.com/JeanHuguesRobert/simpli)
- [Simpli — README](https://github.com/JeanHuguesRobert/simpli/blob/master/README.md)
- [When Cognition Became Traffic — FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/when_cognition_became_traffic.md)

*Note de divulgation : les correspondances historiques privées sont décrites seulement par leur date, objet et portée probatoire ; leurs identifiants, adresses et corps ne sont pas reproduits dans cette source publique.*
