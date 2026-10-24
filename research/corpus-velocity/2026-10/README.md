# Taille du code et des documents — octobre 2026

Relevé arrêté au **24 octobre 2026**. Il porte sur **17 dépôts publics** du
registre : **16 branches `main` et une branche `master`**. Le mois d’octobre
est encore en cours.

## Vue d’ensemble

| Mesure | Fichiers | Taille | Lignes physiques | Lignes non vides |
| --- | ---: | ---: | ---: | ---: |
| Arbres Git complets | 7 105 | 390,37 MB | — | — |
| Code, selon les extensions retenues | 3 158 | 21,92 MB | 616 690 | 556 112 |
| Documents, selon les extensions retenues | 2 691 | 301,31 MB | — | — |
| dont Markdown (`.md`, `.markdown`, `.mdx`) | 2 497 | 36,23 MB | 745 417 | 517 583 |

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
| [cogentia](https://github.com/JeanHuguesRobert/cogentia) | `main` | 623 | 5,60 | 143 839 / 131 730 | 373 | 5,14 | 115 165 / 85 701 |
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

- [Snapshots annuels JSON](./annual-snapshots.json), avec le commit exact de
  chaque dépôt à chaque date et les agrégats du périmètre fixe de 17 dépôts.
- [Snapshots annuels CSV](./annual-snapshots.csv), pour tableur et traitements
  ultérieurs.
- [Définitions des catégories et filtres](../README.md).

Les volumes sont additionnés dépôt par dépôt : un même fichier présent dans
plusieurs dépôts est compté dans chacun. Il s’agit de tailles d’arbres Git, pas
d’une mesure de stockage dédupliqué. Le registre couvre un sous-ensemble public
vérifié et n’est pas exhaustif.

Les lignes physiques comptent chaque ligne de contenu, y compris les lignes
vides ; les lignes non vides excluent les lignes composées uniquement
d’espaces. Ce sont des comptes bruts, pas des SLOC ni une mesure de logique
exécutable.

## Évolution annuelle du même ensemble de 17 dépôts

Les snapshots sont pris chaque **24 octobre à 17:40 UTC**, de 2022 à 2026.
Celui de 2022 précède le lancement public de ChatGPT, le **30 novembre 2022**
([annonce OpenAI](https://openai.com/index/chatgpt/)). Il sert de point de
référence pré-lancement ; octobre 2023 est le premier point annuel après ce
lancement.

Le périmètre est la **même liste de 17 dépôts** à chaque date. La colonne
« snapshots présents » indique combien avaient déjà un commit sur `main` ou
`master` ; les autres contribuent zéro à la taille agrégée à cette date. Les
pourcentages suivent donc le portefeuille complet, y compris l’apparition de
nouveaux dépôts.

| Date | Snapshots présents / 17 | Code (MB, variation annuelle) | Lignes physiques de code (variation) | Documents (MB, variation annuelle) | Lignes physiques Markdown (variation) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2022-10-24 | 2 | 0,20 — base | 7 121 — base | 0,01 — base | 332 — base |
| 2023-10-24 | 3 | 0,94 (+375,9 %) | 28 136 (+295,1 %) | 0,13 (+754,8 %) | 2 309 (+595,5 %) |
| 2024-10-24 | 3 | 0,94 (0,0 %) | 28 136 (0,0 %) | 0,13 (0,0 %) | 2 309 (0,0 %) |
| 2025-10-24 | 7 | 1,35 (+43,1 %) | 41 625 (+47,9 %) | 0,33 (+162,3 %) | 7 357 (+218,6 %) |
| 2026-10-24 | 17 | 21,92 (+1 529,3 %) | 616 690 (+1 381,5 %) | 301,31 (+90 892,0 %) | 745 417 (+10 032,1 %) |

Entre octobre 2022 et octobre 2026, le portefeuille fixe passe de **0,20 à
21,92 MB de code** (**+10 998,9 %**) et de **0,01 à 301,31 MB de documents**
(**+2 039 932,2 %**). Les lignes physiques passent de **7 121 à 616 690** pour
le code (**+8 560,2 %**) et de **332 à 745 417** pour Markdown
(**+224 423,2 %**). Les baselines documentaires étaient très petites, d’où les
pourcentages élevés. La comparaison porte sur les 17 dépôts enregistrés, en
incluant la taille nulle avant leur premier snapshot main/master.

Un dépôt sans snapshot initial n’a pas de taux individuel calculable depuis
zéro ; il reste inclus dans l’agrégat fixe de 17 dépôts. Ces mesures suivent la
taille du code et des documents ; à elles seules, elles n’attribuent pas cette
croissance à l’IA ni ne mesurent la productivité personnelle.

Les cinq points et les SHA des branches principales sont dans le
[rapport annuel JSON](./annual-snapshots.json) et son
[CSV](./annual-snapshots.csv).
