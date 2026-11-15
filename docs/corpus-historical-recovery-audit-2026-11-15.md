---
title: "Audit transversal des états historiques du Corpus — 15 novembre 2026"
date: "2026-11-15"
document_role: operational
document_kind: recovery-audit
visibility: public
lifecycle_state: working
status: working-paper
related_issues:
  - https://github.com/JeanHuguesRobert/cogentia/issues/309
  - https://github.com/JeanHuguesRobert/cogentia/issues/310
  - https://github.com/JeanHuguesRobert/barons-Mariani/issues/152
  - https://github.com/JeanHuguesRobert/Inox/issues/34
review:
  status: unreviewed
  reviewed_by: []
---

# Audit transversal de la récupération historique

Cet audit distingue la **propreté de Git**, la **fraîcheur des checkouts**, la
**reprise des sources historiques** et la **validation sémantique**. Aucune de
ces quatre propriétés ne démontre automatiquement les autres.

## Couverture réelle

- **21 dépôts archivés** dans le snapshot du 10 octobre 2026, non inspecté
  par le cycle de synchronisation habituel, environ 897 Mo.
- **20 dépôts ou alias** sous la racine Fracta2 habituelle.
- **37 dépôts** inspectés sur le ThinkPad, aucun stash ni WIP non commité au
  moment de ce contrôle. Une branche Inox non fusionnée a révélé un apport
  supplémentaire, malgré la propreté des checkouts.
- **10 stashes archivés** : trois Operium et un Inseme ont les mêmes
  identifiants d'objet que ceux déjà réconciliés lors du nettoyage actif ;
  les six autres, dans Survey, concernent seulement différentes versions du
  rapport généré corpus-status. Les stashes de l'archive restent intacts.
- Le dépôt firelayer n'est pas présent dans les 20 checkouts Fracta2, mais
  son ancien commit **19382bf** et ses **117 objets suivis** sont identiques
  à ceux du checkout ThinkPad. Ce dépôt n'a toujours pas de remote GitHub
  origin ; aucun remote n'est inventé.
- **Zéro source ancienne dont le nom soit absent de tout checkout connu**
  hors du dépôt Barons Mariani, après prise en compte de firelayer.
  Les 15 chemins historiques exclusivement présents dans la branche
  d'octobre de Barons Mariani nécessitent une décision par objet :
  renommage, remplacement, source restaurée, ancienne projection ou
  fonctionnalité de site encore à reconstruire.

Le contrôle initial dénombrait 518 blobs **différents** entre snapshots et
commits courants. Ce nombre mesure une évolution de version, **pas** 518
avancées manquantes ; il doit être interprété avec les chemins et le contenu.

## Résultats déjà vérifiés

1. **Barons Mariani — travail local du 10 octobre :** 30 sur 30 fichiers
   non supprimés correspondaient exactement aux empreintes du bordereau
   [de réconciliation](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/stash_reconciliation_2026-11-13.md).
   Le commit historique portait en outre trois articles de lancement Capable
   absents sous leur ancien chemin : ils sont récupérés comme sources
   historiques (commit 7d1fd2ff), dans la version de travail 37 sources.
   Leur ancien champ « published-edition » ne vaut pas gel.
2. **FractaVolta — quatre notes de recherche :** comparaison de
   fractanet.md, generalized_packet_networks.md, mariani_village.md et
   when_cognition_became_traffic.md. Leurs différences avec octobre
   correspondent à des ajouts ou rectifications dans main, y compris
   l'attribution correcte au Cognitive Packet Network de Gelenbe et la
   distinction entre routage adaptatif et charge cognitive.
   Aucun de leurs chemins n'a disparu.
3. **Inox — branche de l'issue #34 :** sept commits locaux non fusionnés
   détectés sur le ThinkPad. L'ancien arbre contient deux fichiers
   réellement absents de master : l'audit de dérive spec/runtime et ses
   sondages. Ils sont réintégrés dans master (commit ea5e1a9) comme
   observations historiques, sous Inox #34. Le runtime actuel a passé
   15 sondages sur 19 avec code de sortie nul ; quatre sondages ont produit
   des échecs, dont des syntaxes volontairement invalides. Cela ne
   transforme pas le rapport en spécification.
4. **Autres branches ThinkPad :** trois branches secondaires sans commit
   en avance sur leur branche principale, par opposition à Inox. Elles
   restent des références historiques, pas des WIP non commité.
5. **Projections et index :** les versions historiques de llms,
   corpus-status, index et tableaux générés ne doivent pas réécrire leurs
   versions modernes. Un diff textuel n'est pas une preuve de doctrine
   nouvelle.

## Travail encore à solder

- Réconcilier les anciens objets Capable de **site Magazine et Annexes**,
  le profil d'impression et les anciens manifestes éditoriaux, sans
  rétablir l'ancien domaine abandonné ni présenter des artefacts générés
  comme sources souveraines.
- Terminer la comparaison sémantique des différences documentaires restantes
  de la branche Inox, sans fusionner mécaniquement sept commits historiques
  en retard sur le runtime présent.
- Vérifier les quelques différences d'anciens registres transversaux et
  projections dans le dépôt de coordination des interactions, en particulier
  leur provenance, confidentialité et caractère généré. Leur absence de
  texte identique dans main ne vaut pas perte sémantique.
- Déterminer si firelayer reste délibérément local ; ce n'est pas une
  contribution de l'archive manquante, mais une décision sur sa réplication.
- Parcourir, s'ils sont pertinents, les autres magasins hors racines
  étudiées (artefacts CI, paquets privés, archives externes). Cet audit ne
  prouve pas leur inexistence.

## Procédure reproductible et limites

Le programme
[scripts/ops/audit-recovered-corpus.py](../scripts/ops/audit-recovered-corpus.py)
compare les arbres Git à leur commit HEAD, les fichiers localement modifiés,
les branches et les identifiants de stashes. Un manifeste externe d'arbres
Git vérifiés permet de compter un checkout accessible sur une autre machine,
sans lui attribuer artificiellement un remote.

Les reçus complets (dont certains chemins privés) sont conservés hors du
dépôt public, avec permissions locales restrictives. Le rapport public ne
publie ni contenu d'interactions personnelles, ni origine Git privée, ni
secrets, ni fichiers de correspondance.

Ce programme est **read-only** : il ne fait ni fetch, ni checkout, ni pop de
stash, ni cherry-pick, ni suppression, ni push. Une preuve de correspondance
par SHA n'est qu'une preuve d'identité des octets ; une conclusion sur la
**valeur** d'une contribution réclame encore son examen sémantique et le
rattachement au paquet cognitif approprié.
