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

## Extension GitHub au-delà des checkouts locaux

Recherche en lecture seule parmi les dépôts des propriétaires GitHub connus : 30 dépôts JeanHuguesRobert et 7 dépôts acorsica. Les 7 dépôts acorsica sont représentés par un checkout Fracta2, mais **16 dépôts publics JeanHuguesRobert ne le sont pas**. Leur seule absence d'un checkout Fracta2 ne prouve pas qu'aucune contribution n'a atteint le Corpus. L'inventaire des autres organisations GitHub éventuelles n'est pas exhaustif.

| Dépôt distant sans checkout Fracta2 | Dernier push connu | Checkout ThinkPad recensé | Qualification |
| --- | --- | --- | --- |
| JeanHuguesRobert/paese-capace | 2026-11-12 | non | Prototype de pré-dossier territorial, paquet #1 ; site non confirmé en service ; rapprocher de la doctrine de capacité sans assimilation institutionnelle |
| JeanHuguesRobert/pertitellu | 2026-08-27 | non | Corpus politique distinct ; respecter la séparation juridique/financière de C.O.R.S.I.C.A. et de FractaVolta |
| JeanHuguesRobert/DEnBUG | 2026-08-17 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/simpli | 2026-07-17 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/Rhuma | 2026-07-02 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/ubikial | 2026-05-23 | non | Ancienne application de gestion de personas ; comparaison fonctionnelle avec les systèmes Ubikia/agents en vigueur |
| JeanHuguesRobert/civic-ideas | 2026-05-14 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/Mailai | 2026-03-01 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/paese | 2026-02-03 | oui | Vérifier l utilité actuelle et la présence de liens canoniques |
| JeanHuguesRobert/recruit | 2025-08-08 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/Ubiks | 2025-04-25 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/Ubik-jean-hugues | 2025-03-05 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/gabriel | 2025-02-27 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/scrollcue | 2014-06-06 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/gojee | 2014-03-31 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |
| JeanHuguesRobert/debug | 2012-10-25 | non | Ancienne source : audit de portée et conservation, pas de clonage par défaut |

Les deux candidats les plus récents sont Paese Capace (push du 12 novembre 2026) et Pertitellu (27 août). Le README de Paese Capace présente un service d'aide à la formulation de dossiers Territorii, sans preuve de déploiement public ; le corpus du Petit Parti indique expressément qu'une interconnexion documentaire ne constitue pas une fusion ou un soutien financier politique. **Ne pas transposer automatiquement** leurs contenus dans le Livre Vivant Capable ni suggérer qu'un service soit opérationnel sans recette.

## Vérification des références distantes

Un contrôle live par git ls-remote --heads a été effectué pour les 11 dépôts possédant les 26 références anciennes à commits non fusionnés : les 26 branches **existent toujours** sur GitHub et leur pointe correspond aux références locales utilisées pour le tableau, sans déplacement ni suppression détectés lors du contrôle. Elles ne sont donc pas de simples références locales obsolètes. Le statut de contenu utile reste cependant distinct.

## Integrations verified during the follow-on review (15 November 2026)

### Cogentia, capability-aware continuation routing (#306, #305)

The current main already contains the canonical continuation-routing.js, continuation-packet-claim.js, continuation-cop-governed.js, continuation-cop-reconcile.js, and continuation-terminal-settlement.js. Five direct regression scripts passed on Fracta2: check-continuation-routing, check-continuation-packet-claim, check-continuation-cop-governed, check-continuation-cop-reconcile, and check-continuation-terminal-settlement. These are synthetic, not attestations of a production agent or mandate.

The current read-only replacement for the historical next-preview mechanism, continuation-placement.js, now has two direct regression tests (commit 53e2cbda). They cover capability and locality ordering, waiting/due work, non-existent availability, input immutability, absence of COP/PacketClaim inference and durable return references, and run in the canonical continuation-routing-core suite. This proves the current interface, not backward binary compatibility with the old private route.

An additional useful assertion from the old #306 e2e suite has been adapted to the current shared core (commit 1c69ab4c): proposed routing, accepted claim, refusal to mark treatment before canonical resolution, ready durable return slot, idempotent recording and delivery_confirmed=false until separately confirmed. The obsolete next-preview CLI and corresponding private daemon routes have **not** been restored: main now exposes a different read-only placement projection; old tests requiring the historical CLI/API returned failures. The duplicate audit-backfill dispatch arm was fixed, and CLI error help now includes placement (commit 1f41fd9a). **Status: core and regression convergence demonstrated; live governed worker/CLI/MCP/API exposure still requires a separate issue-level decision and E2E acceptance. PR #306 remains open.**

### Operium, hosted browser/session policy (#48, #50) and remote validation (#74)

- Commit ab6a54d: recovered the issue #49 kiosk/desktop *advisory* policy with explicit refusal of host-admin capacity. Unlike the historical lab implementation, no caller-provided principal-lab waiver, mesh label or future-idp name can authorize a desktop. This checker is intentionally **not wired** to Caddy, the launcher or the provisioner; true runtime enforcement still remains open.
- Commits 28c7866 and 155f804: reimplemented the historical workspace listing interface without executing env files or revealing URLs, passwords or unknown fields. Synthetic privacy tests passed. A real read-only attempt against Fracta2 reported status=incomplete and unreadable_count=2: the config files' existing private permissions were **not bypassed**, and an incomplete inventory was not misrepresented as zero actual workspaces.
- Commit ab6a54d: reused the existing Node CI supervisor rather than introducing the old Python supervisor from #74; added a bounded timeout option and synthetic pass/fail/timeout regression, with the existing receipt schema preserved. The original remote SSH Git-snapshot worker has **not** been deployed or imported as a trusted execution path; it still requires host/COP effect review. Cogentia now has its own gated host.process.run execution boundary, but that is not proof of equivalent commit-pinned archive validation. The old remote test-worker feature is not yet proven redundant.

Operium CI plus packet-consumer jobs passed on commit 155f804, as did all targeted synthetic tests on Fracta2. These recoveries **do not** prove that a multi-user desktop can safely be opened through the current public browser gateway, or that Git snapshots may be executed remotely without distinct authorization. PRs #48, #50 and #74 remain open while those functional boundaries are evaluated.

### Administrative debt and what remains genuinely unmerged

The earlier PRs acorsica/gouvernance #1/#3 and Inox #38 were closed only after comparison demonstrating their documentary substance already on main; their content owner issues remain open. The branches themselves and the 10 October recovery archive were not deleted. In the targeted Operium and Cogentia checkouts, pre-existing concurrent WIP has not been staged or altered.

## FBF in the automatic dependency-review batch (Survey)

The thirteen Dependabot branch references in the initial survey were all confirmed to represent **open, unmerged PRs** at the time of this review. Their owners are Inox (3), StructEnv (2), Serra (2), and Survey (6). None was auto-merged merely because it is reachable or has no Git conflict.

Survey's main Prettier Check was already red before the six Dependabot PRs were updated. The exact pinned formatter version 3.7.4 reproduced four formatting-only discrepancies in README.md, index.html, packages/cop-core/src/types.ts and packages/cop-core/tsconfig.json. Corrected **only these four paths** on Survey/main commit c48344f; the complete formatter glob now passed locally and GitHub Actions main run 43702758998 completed successfully.

The six open Survey Dependabot branches (#6, #7, #8, #9, #11, #12) were then refreshed against the fixed main through GitHub's scoped update-branch action, without merging dependencies into main. All six subsequently reported two successful Prettier checks and MERGEABLE Git status. After completion of the rechecks, **all six PRs** (#6, #7, #8, #9, #11, #12) had two successful Prettier contexts, were Git-MERGEABLE, but had three FAILED Netlify review contexts (Header rules, Pages changed and Redirect rules). Survey #8 additionally returned a failed deploy-preview status and its preview URL returned HTTP 404 when checked without authentication. CodeQL succeeded on #8. This is a *separate deployment blocker*, not a formatting failure. The private Netlify build cause is **not established from GitHub context status alone**; do not claim the dependencies are release-ready. This distinction is the new FBF deployment/review blocker.

GitHub's default-branch push notification for Survey reported 185 Dependabot vulnerability alerts (3 critical, 96 high, 72 moderate, 14 low) at that point. These are alert counts, **not** exploitability assessments; they justify prioritizing dependency/security review but do not override Netlify/deployment gates. Branches in Inox, StructEnv and Serra were not changed by this Survey-specific repair.

## Restes à trancher

1. Operium : les branches de provisionnement multi-utilisateur du navigateur et de validation distante contiennent plusieurs scripts absents de main. Un ancien outil d'authentification ou de commande distante ne doit pas être déployé par simple fusion. Propriétaire : Operium #25, suivi transversal Cogentia #309.
2. Cogentia : les scripts de continuation historiques et les trois tests incompatibles appellent des comparaisons d'exigences avec les tests COP actuels, non un cherry-pick brut. Propriétaire : Cogentia #309, et sujets COP spécifiques.
3. barons-Mariani : 16 chemins historiques hors des trois articles Capable déjà récupérés. Vérifier les remplacements des anciennes configurations d'édition, pages de site, fédérations et artefacts ; conserver les sources probatoires.
4. Comptabilité, registres et traces : comparer les anciennes notes de gouvernance aux versions révisées, puis les registres d'interactions en privé, sans diffusion de personnes ou comptes.
5. Local firelayer : absence de remote origin dans le checkout ThinkPad, bundle de récupération dans l'archive ; décision sur sa destination ou conservation locale non prise.
6. Branches Dependabot : réévaluer les mises à jour contre les dépendances courantes, ne pas revenir à une ancienne version pour satisfaire une métrique de convergence.

Une branche ou une archive n'est soldée qu'avec une disposition explicite : contenu utile intégré, identique confirmé, supplanté avec référence, preuve privée conservée, ou suppression décidée après contrôle. Les tâches non résolues ne justifient pas de remettre en cause le nettoyage des stashes et worktrees actifs.

Paquet propriétaire transversal : https://github.com/JeanHuguesRobert/cogentia/issues/309
