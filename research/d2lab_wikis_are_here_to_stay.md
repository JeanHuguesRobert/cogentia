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

## Complément probatoire — correspondances retrouvées (2006–2008, vérifiées le 18 octobre 2026)

**Pièce majeure, 7 octobre 2007 — intention de libération sous MPL 1.1.** Jean Hugues Robert adresse à Rodolphe Briet, Thierry Parmentelat, Jean-François Catz et Yvan Balsamo une proposition visant à rendre réutilisables les créations immatérielles D2Lab (graphismes, code du site et idées), selon les termes de la **Mozilla Public License 1.1**. Jean-François Catz, Yvan Balsamo et Rodolphe Briet approuvent explicitement par réponse le même jour ; un message de Thierry Parmentelat soutient l'idée et sollicite l'approbation d'Yvan. **Portée :** preuve directe d'une volonté collective de libération, et de plusieurs consentements explicites. **Limite juridique :** la formule « domaine public selon MPL 1.1 » est imprécise (MPL ≠ domaine public) ; ces courriels ne suffisent pas à établir une cession valide de l'ensemble des droits, l'autorité de chaque signataire, la chaîne des droits ou la publication effective de chaque composant sous MPL 1.1. Il faut retrouver les fichiers de licence, statuts/actes et archives de code avant de présenter les actifs comme définitivement libres.

**15 octobre 2006 — maturité technique et commerciale (témoignage contemporain du fondateur).** Dans un échange interne, JHR décrit une équipe ne disposant encore d'aucun prototype achevé, mais de maquettes, d'une vision technique et d'un business plan encore à consolider. Cela empêche d'attribuer sans réserve à D2Lab un moteur de stockage pleinement opérationnel à cette date.

**13 décembre 2006 – janvier 2007 — service Circle2 exploité.** Des échanges signalent `circle2.d2lab.com` accessible puis indisponible à la suite d'erreurs Rails, avec interventions et vérifications d'espace disque. Il existait donc une application web déployée, mais cela ne prouve pas l'exécution du stockage P2P projeté.

**13 février 2007 — réunion stratégique.** Des minutes internes distinguent Circle2 comme projet structurant et de possibles « petits produits » capables de produire du revenu à court terme. Les scénarios financiers évoqués restent conditionnels et ne prouvent pas une levée de fonds réalisée.

**29 mars 2007 — description fonctionnelle de Circle2.** JHR décrit explicitement une demande pour l'« échange de données multimédia entre proches en P2P » et indique que le plan Circle2 pourrait être exécuté si le financement était trouvé. **Correction historique :** Circle2 doit être qualifié d'application de partage multimédia social P2P, et non identifié automatiquement au Wiki Engine ; les rapports exacts entre Circle2, le Wiki D2Lab et Simpli restent à établir.

**23 juillet 2007 — inventaire précis d'une sauvegarde.** Thierry Parmentelat déclare avoir sauvegardé la base Subversion, un snapshot des sites Rails `d2lab` et `circle2` (hors vidéos), quatre bases de données (production/test), les journaux, la configuration Apache et les listes de paquets `dpkg` et `gem`. Cette trace est antérieure à celle de février 2008 et précise le périmètre des archives à rechercher.

**2007–2008 — fermeture progressive.** La dissolution est annoncée comme imminente en octobre 2007 ; l'hébergement semble avoir cessé en 2008. Il faut conserver la distinction entre intention de dissolution, actes juridiques définitifs et arrêt technique.

### Sources et divulgation

Toutes les preuves ci-dessus proviennent de courriels contemporains consultés dans l'archive personnelle du fondateur. Le présent document publie une **synthèse factuelle D2**, sans identifiant fournisseur, identifiant de fil, données bancaires, numéros de téléphone, ni reproduction intégrale des échanges. La publication des messages complets, notamment ceux de collaborateurs, exigerait un examen distinct de proportionnalité et des droits des tiers. Les messages de 2007 doivent être conservés comme pièces privées vérifiables.

### Priorité d'archéologie révisée

1. Rechercher **en priorité** les archives Subversion et snapshots documentés en juillet 2007 et février 2008.
2. Retrouver le business plan, les maquettes, les spécifications du Wiki, de Circle2 et de la couche de stockage ; ne pas confondre ces trois objets.
3. Établir la chaîne des droits et la matérialisation de la proposition MPL 1.1 du 7 octobre 2007.
4. Distinguer état déployé, prototype, maquette, intention et filiation rétrospective.

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
