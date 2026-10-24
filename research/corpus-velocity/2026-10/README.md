# Taille du code et des documents — octobre 2026

Relevé arrêté au **24 octobre 2026**. Il porte sur **17 dépôts publics** du
registre : **16 branches `main` et une branche `master`**. Le mois d’octobre
est encore en cours.

## Vue d’ensemble

| Mesure | Fichiers | Taille | Lignes physiques | Lignes non vides |
| --- | ---: | ---: | ---: | ---: |
| Arbres Git complets | 7 108 | 390,39 MB | — | — |
| Code, selon les extensions retenues | 3 160 | 21,93 MB | 616 834 | 556 234 |
| Documents, selon les extensions retenues | 2 690 | 301,31 MB | — | — |
| dont Markdown (`.md`, `.markdown`, `.mdx`) | 2 496 | 36,22 MB | 745 340 | 517 516 |

Les MB sont décimaux : 1 MB = 1 000 000 octets. Markdown est compris dans le
total des documents. Le total des arbres Git comprend tous les types de
fichiers ; les totaux code et documents appliquent les filtres décrits dans la
[méthode](../README.md). Les lignes Markdown sont un sous-ensemble des lignes
des documents textuels ; les formats binaires sont comptés en fichiers et
octets seulement.

## Détail par dépôt

| Dépôt | Branche | Code : fichiers | Code : MB | Code : lignes phys./non vides | Docs : fichiers | Docs : MB | Markdown : lignes phys./non vides |
| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [inseme](https://github.com/JeanHuguesRobert/inseme) | `main` | 1 462 | 9,06 | 260 802 / 235 907 | 539 | 134,22 | 141 021 / 95 511 |
| [cogentia](https://github.com/JeanHuguesRobert/cogentia) | `main` | 625 | 5,60 | 143 983 / 131 852 | 372 | 5,13 | 115 088 / 85 634 |
| [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta) | `main` | 10 | 0,14 | 3 080 / 2 806 | 96 | 1,52 | 24 557 / 17 170 |
| [operium](https://github.com/JeanHuguesRobert/operium) | `main` | 229 | 1,06 | 29 901 / 27 236 | 98 | 1,03 | 22 663 / 17 897 |
| [barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani) | `main` | 26 | 0,17 | 3 971 / 3 635 | 1 110 | 21,53 | 281 719 / 192 092 |
| [Inox](https://github.com/JeanHuguesRobert/Inox) | `master` | 37 | 1,05 | 31 190 / 25 873 | 35 | 0,66 | 11 288 / 8 623 |
| [survey](https://github.com/JeanHuguesRobert/survey) | `main` | 519 | 4,05 | 118 911 / 106 848 | 162 | 132,52 | 91 442 / 56 841 |
| [ubikia](https://github.com/JeanHuguesRobert/ubikia) | `main` | 90 | 0,33 | 9 368 / 8 444 | 46 | 0,63 | 13 214 / 9 917 |
| [gouvernance](https://github.com/acorsica/gouvernance) | `main` | 0 | 0,00 | 0 / 0 | 15 | 0,23 | 1 891 / 1 555 |
| [JeanHuguesRobert](https://github.com/JeanHuguesRobert/JeanHuguesRobert) | `main` | 0 | 0,00 | 0 / 0 | 76 | 1,29 | 14 651 / 11 053 |
| [marenostrum](https://github.com/JeanHuguesRobert/marenostrum) | `main` | 0 | 0,00 | 0 / 0 | 54 | 1,05 | 13 972 / 9 678 |
| [StructEnv](https://github.com/JeanHuguesRobert/StructEnv) | `main` | 4 | 0,03 | 1 151 / 1 009 | 8 | 0,31 | 3 200 / 2 593 |
| [serra](https://github.com/JeanHuguesRobert/serra) | `main` | 158 | 0,43 | 14 477 / 12 624 | 23 | 0,25 | 3 063 / 2 578 |
| [institut-mariani](https://github.com/acorsica/institut-mariani) | `main` | 0 | 0,00 | 0 / 0 | 8 | 0,20 | 1 146 / 998 |
| [acorsica.org](https://github.com/acorsica/acorsica.org) | `main` | 0 | 0,00 | 0 / 0 | 6 | 0,18 | 841 / 805 |
| [privai](https://github.com/acorsica/privai) | `main` | 0 | 0,00 | 0 / 0 | 17 | 0,25 | 2 947 / 2 473 |
| [Kudos](https://github.com/acorsica/Kudos) | `main` | 0 | 0,00 | 0 / 0 | 25 | 0,30 | 2 637 / 2 098 |

## Données et méthode

- [Données JSON détaillées](./corpus-velocity.json), avec le commit exact et les
  mesures mensuelles par dépôt.
- [Données CSV](./corpus-velocity.csv), pour tableur et traitements ultérieurs.
- [Définitions des catégories et filtres](../README.md).

Les volumes sont additionnés dépôt par dépôt : un même fichier présent dans
plusieurs dépôts est compté dans chacun. Il s’agit de tailles d’arbres Git, pas
d’une mesure de stockage dédupliqué. Le registre couvre un sous-ensemble public
vérifié et n’est pas exhaustif.

Les lignes physiques comptent chaque ligne de contenu, y compris les lignes
vides ; les lignes non vides excluent les lignes composées uniquement
d’espaces. Ce sont des comptes bruts, pas des SLOC ni une mesure de logique
exécutable.
