---
title: "Inventaire transversal de réconciliation historique du Corpus — 15 novembre 2026"
date: "2026-11-15"
document_role: operational
document_kind: cognitive-packet-reconciliation
visibility: public
lifecycle_state: working
status: audit-in-progress
related_issue: "https://github.com/JeanHuguesRobert/cogentia/issues/309"
---

# Audit de réconciliation de l'ensemble du Corpus

Objet : retrouver les contributions utiles qui subsistent hors des branches canoniques, sans confondre propreté Git, ancienneté d'un commit et valeur sémantique.

## Périmètre matériel examiné

- ThinkPad C:/tweesic : **37 dépôts actifs**, aucun stash ni modification non committée lors de l'inventaire ; quatre branches secondaires. Leur comparaison à master/main doit être vérifiée par objet Git, car des nombres issus d'une comparaison inversée ont déjà été observés.
- Fracta2 /srv/cogentia/repos : environ 21 checkouts canoniques, liens symboliques compris, avec références locales de branches distantes examinées.
- Fracta2 /home/ubuntu/travel/recovered-20261010 : **21 anciens checkouts détachés** (environ 897 Mo), snapshot sauvegardé le 10 octobre et vérifié par RESTORE-VERIFIED.json et ORIGINS-VERIFIED.json. Sa présence atteste une récupération, pas la convergence de ses travaux. Ne pas effacer l'archive avant la clôture.
- Dix références stash historiques dans ce snapshot : 3 Operium et 1 Inseme portant les mêmes OID que les stashes déjà traités, plus 6 Survey limités à la projection générée research/corpus-status.md. Ce ne sont pas dix développements nouveaux.

Les données privées des journaux d'interactions et du registre privé ne sont pas reproduites dans ce rapport public.

## Reprises établies et régressions évitées

- barons-Mariani : les 30 fichiers modifiés de l'ancien checkout correspondent par SHA-256 aux 30 anciens blobs de research/stash_reconciliation_2026-11-13.md. L'ancien commit fc6f6bcb possédait 19 chemins absents du main actuel, dont les 3 anciens articles Capable récupérés sous projects/capable/magazine/historique par le commit 7d1fd2ff. L'étiquette historique published-edition ne prouve ni gel ni publication formelle. Les anciennes adresses lepp.fr et anciens PDF/EPUB ne doivent pas remplacer les surfaces actuelles. Les autres chemins historiques demandent une classification de remplacement, de projection générée ou de source originale.
- FractaVolta : 138 chemins dans l'ancien arbre af1f90b5 ; aucun chemin absent de l'arbre actuel, 130 blobs identiques et 8 différents. La correction récente de l'histoire Gelenbe/CPN est plus précise : les anciennes formulations de stricte inversion CPN/CPS seraient une régression.
- Gouvernance COP accounting : cinq documents de recherche récupérés sur main par 0232ce9, paquet acorsica/gouvernance#2.
- Cogentia COP : 3 anciens tests issus de feat/inseme-111-resolver-next ont été exécutés sur main et échouent sur des contrats aujourd'hui différents : next-preview absent du CLI, autorisation du daemon durcie, résultat ACP modifié. Les tests n'ont pas été publiés comme s'ils étaient encore valides ; leurs copies temporaires ont été supprimées.
- Inox : la branche docs/issue-34-spec-runtime-audit est anciennement révisée et les pointeurs master/branche doivent être évalués par SHA. Le main actuel ea5e1a9 porte déjà la reprise de l'audit exécutable (Inox #34). Ne pas confondre nombre de commits observés sur une branche locale ancienne avec du travail actuellement manquant.

## Références de branches distantes non fusionnées

Ces 26 résultats utilisent les références origin localement disponibles pendant l'audit. Le nombre de commits propres à une branche ne prouve pas que son contenu n'a pas été réécrit ailleurs dans main.

| Dépôt | Branche | Commits uniques | Chemins absents de main au premier contrôle | Chemins différents | Décision provisoire |
| --- | --- | ---: | ---: | ---: | --- |
| FractaVolta | origin/site-update-corpus-2026-07 | 1 | 0 | 0 | Identique sur main : redondance démontrée |
| Inox | origin/dependabot/npm_and_yarn/trace-browser/browserslist-4.28.8 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| Inox | origin/dependabot/npm_and_yarn/types/node-26.4.0 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| Inox | origin/dependabot/npm_and_yarn/typescript-7.0.2 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| Inox | origin/docs/issue-34-spec-runtime-audit | 7 | 0 | 39 | Branche ancienne, contrôler les contrats face à main |
| StructEnv | origin/dependabot/npm_and_yarn/js-yaml-4.1.1 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| StructEnv | origin/dependabot/npm_and_yarn/multi-a07fd7252a | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| barons-Mariani | origin/feat/issue-112-incremental-previews | 9 | 3 | 2 | Issue 112 : moteur historique remplacé, adapter les tests de couverture |
| cogentia | origin/experiment/minimal-jhn-shell-mcp-20261029 | 1 | 0 | 1 | Comparaison sémantique requise dans le paquet propriétaire |
| cogentia | origin/feat/inseme-111-resolver-next | 91 | 3 | 6 | 3 tests historiques incompatibles ; couverture actuelle à comparer |
| cogentia | origin/feat/resume-prepare-capability-gate-20261014 | 31 | 0 | 1 | Comparaison sémantique requise dans le paquet propriétaire |
| gouvernance | origin/docs/objectif-comptabilite-cop-20261009 | 1 | 0 | 1 | Dossiers récupérés dans main, comparer les nouvelles métadonnées |
| gouvernance | origin/work/cop-accounting-inventory-001-20261009 | 12 | 0 | 5 | Dossiers récupérés dans main, comparer les nouvelles métadonnées |
| inseme | origin/wip/poco-2026-09-07-inseme-autostash | 1 | 0 | 6 | Comparaison sémantique requise dans le paquet propriétaire |
| operium | origin/feat/hosted-browser-user-provision | 3 | 4 | 6 | Services / navigateur / validation : revue sécurité avant reprise |
| operium | origin/feat/hosted-workspace-session-modes | 21 | 22 | 9 | Services / navigateur / validation : revue sécurité avant reprise |
| operium | origin/wip/fracta2-dev | 5 | 5 | 3 | Services / navigateur / validation : revue sécurité avant reprise |
| registre-mariani | origin/wip/poco-2026-09-07-registre-mariani | 1 | 0 | 2 | Rapprochement privé sans recopier les valeurs publiques |
| serra | origin/dependabot/npm_and_yarn/client/multi-99764170ca | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| serra | origin/dependabot/npm_and_yarn/vite-6.2.7 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/isaacs/brace-expansion-5.0.1 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/multi-1ce7acca3d | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/multi-d64369b380 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/packages/cop-core/multi-b4298e4899 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/rollup-4.59.0 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |
| survey | origin/dependabot/npm_and_yarn/undici-7.18.2 | 1 | 0 | 0 | Revoir versions et CI ; ne pas fusionner une mise à jour périmée |

## Restes à trancher

1. Operium : les branches de provisionnement multi-utilisateur du navigateur et de validation distante contiennent plusieurs scripts absents de main. Un ancien outil d'authentification ou de commande distante ne doit pas être déployé par simple fusion. Propriétaire : Operium #25, suivi transversal Cogentia #309.
2. Cogentia : les scripts de continuation historiques et les trois tests incompatibles appellent des comparaisons d'exigences avec les tests COP actuels, non un cherry-pick brut. Propriétaire : Cogentia #309, et sujets COP spécifiques.
3. barons-Mariani : 16 chemins historiques hors des trois articles Capable déjà récupérés. Vérifier les remplacements des anciennes configurations d'édition, pages de site, fédérations et artefacts ; conserver les sources probatoires.
4. Comptabilité, registres et traces : comparer les anciennes notes de gouvernance aux versions révisées, puis les registres d'interactions en privé, sans diffusion de personnes ou comptes.
5. Local firelayer : absence de remote origin dans le checkout ThinkPad, bundle de récupération dans l'archive ; décision sur sa destination ou conservation locale non prise.
6. Branches Dependabot : réévaluer les mises à jour contre les dépendances courantes, ne pas revenir à une ancienne version pour satisfaire une métrique de convergence.

Une branche ou une archive n'est soldée qu'avec une disposition explicite : contenu utile intégré, identique confirmé, supplanté avec référence, preuve privée conservée, ou suppression décidée après contrôle. Les tâches non résolues ne justifient pas de remettre en cause le nettoyage des stashes et worktrees actifs.

Paquet propriétaire transversal : https://github.com/JeanHuguesRobert/cogentia/issues/309
