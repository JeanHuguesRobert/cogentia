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
- Fracta2 /home/ubuntu/travel/recovered-20261010 : cohorte historique initialement annoncée comme **21 checkouts détachés** (environ 897 Mo), récupérée du 10 octobre et vérifiée par RESTORE-VERIFIED.json et ORIGINS-VERIFIED.json. **État du 15 novembre** : Survey, Inseme et Suicide Corse ont chacun été remplacés par une archive compacte vérifiée (suffixe .archive) ; leurs anciens chemins de checkout ne sont donc plus présents. Les autres copies restent conservées et ne sont pas déclarées convergées.
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
- Commit ab6a54d: reused the existing Node CI supervisor rather than introducing the old Python supervisor from #74; added a bounded timeout option and synthetic pass/fail/timeout regression, with the existing receipt schema preserved. At the time of this first audit the remote SSH Git-snapshot worker had **not yet** been recovered; its source and synthetic CI verification were added later (see current 15 November addendum below). Cogentia now has its own gated host.process.run execution boundary, but that is not proof of equivalent commit-pinned archive validation. The old remote test-worker feature is not yet proven redundant.

Operium CI plus packet-consumer jobs passed on commit 155f804, as did all targeted synthetic tests on Fracta2. These recoveries **do not** prove that a multi-user desktop can safely be opened through the current public browser gateway, or that Git snapshots may be executed remotely without distinct authorization. These PRs were still open at the time of this audit; all three have since been closed as superseded after scoped main recovery. Their runtime issues remain open (see later addendum).

### Administrative debt and what remains genuinely unmerged

The earlier PRs acorsica/gouvernance #1/#3 and Inox #38 were closed only after comparison demonstrating their documentary substance already on main; their content owner issues remain open. The branches themselves and the 10 October recovery archive were not deleted. In the targeted Operium and Cogentia checkouts, pre-existing concurrent WIP has not been staged or altered.

## FBF in the automatic dependency-review batch (Survey)

The thirteen Dependabot branch references in the initial survey were all confirmed to represent **open, unmerged PRs** at the time of this review. Their owners are Inox (3), StructEnv (2), Serra (2), and Survey (6). None was auto-merged merely because it is reachable or has no Git conflict.

Survey's main Prettier Check was already red before the six Dependabot PRs were updated. The exact pinned formatter version 3.7.4 reproduced four formatting-only discrepancies in README.md, index.html, packages/cop-core/src/types.ts and packages/cop-core/tsconfig.json. Corrected **only these four paths** on Survey/main commit c48344f; the complete formatter glob now passed locally and GitHub Actions main run 43702758998 completed successfully.

The six open Survey Dependabot branches (#6, #7, #8, #9, #11, #12) were then refreshed against the fixed main through GitHub's scoped update-branch action, without merging dependencies into main. All six subsequently reported two successful Prettier checks and MERGEABLE Git status. After completion of the rechecks, **all six PRs** (#6, #7, #8, #9, #11, #12) had two successful Prettier contexts, were Git-MERGEABLE, but had three FAILED Netlify review contexts (Header rules, Pages changed and Redirect rules). Survey #8 additionally returned a failed deploy-preview status and its preview URL returned HTTP 404 when checked without authentication. CodeQL succeeded on #8. This is a *separate deployment blocker*, not a formatting failure. The private Netlify build cause is **not established from GitHub context status alone**; do not claim the dependencies are release-ready. This distinction is the new FBF deployment/review blocker.

GitHub's default-branch push notification for Survey reported 185 Dependabot vulnerability alerts (3 critical, 96 high, 72 moderate, 14 low) at that point. These are alert counts, **not** exploitability assessments; they justify prioritizing dependency/security review but do not override Netlify/deployment gates. Branches in Inox, StructEnv and Serra were not changed by this Survey-specific repair.

## Survey/Capable FBF continuation — additional committed recovery (15 November 2026)

### Survey: failed Netlify build, recovered core checks and security backlog

A reproducible clean git-archive snapshot with Node 24 and npm ci uncovered a missing Vite module: src/App.jsx imported LegalLinks at the historical root components path while the actual export was in components/common/LegalLinks.jsx. Commit ed071426 fixed the import and added a separate Node 24 build job to the CI. Clean snapshot npm ci, full Prettier and Vite build PASSED (5620 modules). The public Netlify main site returned HTTP 200 during this audit. This is not a proof that each new revision is deployed: a historical deploy-preview for PR #8 returned HTTP 404, and provider-side build logs were not available from the GitHub status surface.

Dependabot PRs from the initial Survey batch: #8 (Undici, squash 1b04fba), #9 (brace-expansion, squash b96dc37), #6 (COP esbuild/Vitest, squash 1e4f66e) and #12 (Rollup, squash 25e944a) were integrated after GitHub CI Build and Prettier PASS. The conflicting PR #11 (Minimatch) could not be refreshed after #9; a fresh lock resolution (main 1121124) retained minimatch 3.1.5 and 10.2.6, with clean npm ci, Vite build and Prettier PASS, then the obsolete PR was CLOSED. React Router PR #7 has subsequently passed all three Node 24 CI categories (Prettier, Vite build and COP type-check/build) and merged as main commit 7fb78ce. The original six Survey Dependabot PRs are now **all dispositioned**: five merged (#6, #7, #8, #9, #12), one superseded and closed (#11). This does not close the remaining critical tar alert or replace real Netlify deploy verification. These are not claims that all security alerts or Netlify previews are closed.

Security FBF was pursued beyond simply merging the old automated PRs. GitHub reported critical alerts for Vitest 4.0.x and tar <=7.5.18. The COP subpackage actually contains only TypeScript interface declarations, **no Vitest test files**; removing unused Vitest and replacing its script with a real tsc --noEmit check (Survey main f418712) passed clean npm ci, type check and build. CI now runs that independent cop-core check on every relevant push (e401f1e). A scoped override repaired the Supabase CLI tar subtree to 7.5.19 without changing root tar (0a85f98); full npm ci, Vite build, Prettier and Supabase CLI version check PASSED. GitHub's critical-alert API then returned **one remaining critical tar alert** (#113, GHSA-23hp-3jrh-7fpw): root tar 6.2.1 is required by cacache, node-gyp and sqlite3. This needs a compatibility migration, NOT an untested global tar major override. Owner packet: https://github.com/JeanHuguesRobert/survey/issues/25. Other high/moderate alerts remain outside this targeted repair.

### Capable: classification of all 17 vanished historical paths

The archived fc6f6bcb checkout contains 17 old projects/capable paths missing under their original names in current main. A verified concordance of **all 17 paths**, with resolvable links and individual dispositions, is now published in barons-Mariani main e6ae5585: projects/capable/editorial/reconciliation-sources-2026-10-05.md. Two old cases have richer canonical replacements (current cases 02 and 05), the three historical launches already live under magazine/historique, and old binary renders/manifests/deployment targets are not to overwrite today's live candidate. Three genuine follow-up candidates are **not falsely declared reconciled**: the two old syndications from PrivAI and School into the Capable Magazine, and an A5 print/QR profile whose historical QR domain is obsolete. Source articles are retained, but federation/print choices need a current publication and provenance decision. Capable #152 is owner.

## Operium historical browser and snapshot recovery — later 15 November result

Verified authoritative owner report: https://github.com/JeanHuguesRobert/operium/blob/main/docs/hosted-browser-pr48-pr50-reconciliation-2026-11-15.md (325af86).

1. **Remote validation PR #74 CLOSED, branch preserved.** Commit 3c84fd2 restored commit-pinned Git snapshots for Inox/inseme, SHA-256 transfer digest, PAX revision check, archive path safety, bounded worker and typed result. Execution requires an explicit --execute flag; dry-run produced a real Inox commit/digest manifest without any remote build. Dedicated GitHub Actions run 43709057757 PASS. Neither live build nor COP effect authorization inferred from these tests.
2. **Browser PR #50 CLOSED, branch preserved.** Direct SHA-256 inspection showed that Fracta2 actually runs the historical PR #50 kiosk/desktop launcher, browser supervisor and Openbox layouts, contrary to the previous assumption that these were uninstalled. The useful source was recovered in main 0c960f7, 9d9a21f and 9604d0c with crashes/backoff, shell-injection, XML and kiosk policy tests. The original launcher on disk still uses SecurityTypes None despite a PasswordFile; source main now removes this option. A super-mode EXPOSE for exact copy to /opt succeeded, **but the route check returned authority/issuer/budget not verified and no privileged copy or restart was performed.** Caddy's public authentication and local bind do not prove separate VNC protocol authentication.
3. **Provision PR #48 CLOSED, branch preserved.** Main already has canonical provisioner requiring private credential files and a redacted, partial-aware inventory. The old deterministic lab credential migration, hard-coded Caddy realm and tests presuming sesame passwords are deliberately **not** treated as useful production implementation. A fixed-user navigation gateway unit and dev bootstrap remain historical evidence, with separate owners if needed.
4. **Owner issues Operium #25 and #49 remain OPEN.** They own deployment, profile/login verification and actual authority integration. Closing the old PRs does not close these live behaviors. CI and packet-consumer for changes through 9604d0c PASS. The historical source archive remains intact.

Remaining parallel workload in this audit: Cogentia #306 live governed worker admission; Survey #25 residual critical tar dependency, including verified build-vs-runtime exposure; targeted Inox/StructEnv/Serra dependency PRs; and other unexamined Corpus archives. Avoid merging obsolete code to satisfy branch-count metrics.

## Restes à trancher

1. Operium : les branches de provisionnement multi-utilisateur du navigateur et de validation distante contiennent plusieurs scripts absents de main. Un ancien outil d'authentification ou de commande distante ne doit pas être déployé par simple fusion. Propriétaire : Operium #25, suivi transversal Cogentia #309.
2. Cogentia : les scripts de continuation historiques et les trois tests incompatibles appellent des comparaisons d'exigences avec les tests COP actuels, non un cherry-pick brut. Propriétaire : Cogentia #309, et sujets COP spécifiques.
3. barons-Mariani : les 17 anciens chemins Capable ont reçu une disposition explicite, avec concordance e6ae5585. Décisions résiduelles : deux syndications PrivAI/School et profil impression/QR ; voir Capable #152.
4. Comptabilité, registres et traces : comparer les anciennes notes de gouvernance aux versions révisées, puis les registres d'interactions en privé, sans diffusion de personnes ou comptes.
5. Local firelayer : absence de remote origin dans le checkout ThinkPad, bundle de récupération dans l'archive ; décision sur sa destination ou conservation locale non prise.
6. Branches Dependabot : réévaluer les mises à jour contre les dépendances courantes, ne pas revenir à une ancienne version pour satisfaire une métrique de convergence.

Une branche ou une archive n'est soldée qu'avec une disposition explicite : contenu utile intégré, identique confirmé, supplanté avec référence, preuve privée conservée, ou suppression décidée après contrôle. Les tâches non résolues ne justifient pas de remettre en cause le nettoyage des stashes et worktrees actifs.

Paquet propriétaire transversal : https://github.com/JeanHuguesRobert/cogentia/issues/309


## 15 novembre 2026 — Archivage différentiel sans perte, Fracta2 (#309)

Le patrimoine Git historique est conservé **sans maintenir des copies complètes indéfiniment**. Trois anciens checkouts ont été remplacés après comparaison des commits et refs, des fichiers suivis, untracked et ignored, des stashes et des dépendances actives. Les manifests, empreintes, bundles et preuves primaires restent sur Fracta2, dans des répertoires privés ; ils ne sont pas publiés dans ce dépôt.

| Ancien checkout | Disposition et preuves préservées | Remplacement | Octets libérés |
| --- | --- | --- | ---: |
| Survey | Ancien HEAD ancêtre de main ; six stashes de projection générée et un dirty ; OID et références conservés ; import réel des stashes et contrôle des blobs | survey.archive (128 Ko) | 372 520 430 |
| Suicide Corse | Ancien HEAD et six références ancêtres de main ; unique projection générée non suivie, conservée byte-exacte ; aucune donnée Git orpheline | suicide-corse.archive (72 Ko) | 28 965 703 |
| Inseme | Ancien HEAD ancêtre de main ; stash de huit chemins, projection modifiée et document non suivi ; 650 commits / 4 977 objets initialement absents du dépôt Inseme mais retrouvés intégralement dans Survey | inseme.archive (initialement 223 Mo, puis **396 Ko** après rapprochement Survey) | 166 034 767 (première passe) + environ 232,8 Mo (seconde) |

**Réduction nette de la première passe : 567 520 900 octets (≈ 541 Mio).** La réconciliation ultérieure Inseme-Survey a libéré environ 232,8 Mo supplémentaires, soit de l’ordre de **800 Mo** sur les deux passes. Chaque ancienne copie a été retirée seulement après vérification de son remplacement, et non doublée par une nouvelle sauvegarde permanente. Les principaux checkouts, sites et branches main sont demeurés inchangés. Les temporaires de vérification ont été supprimés.

Les bundles différentiels Survey et Inseme sont **dépendants de commits historiques de leurs main actuels**. Le contrôle git bundle verify, l'ascendance des prérequis et un import effectif dans un dépôt bare temporaire ont réussi. **Une future réécriture destructive de l'histoire canonique nécessiterait de rendre ces archives autonomes avant suppression des prérequis.** **Correction :** les 650 commits précédemment attribués à un historique Inseme orphelin forment une seule lignée du projet Survey, entièrement ancêtre de Survey/main ; les 4 977 objets sont dans le magasin Git Survey. L'absence dans Inseme ne prouvait pas une perte dans le Corpus. Les autres archives historiques, dont Barons Mariani, FractaVolta, Inox et les archives privées, restent protégées jusqu'à classification.

Le moteur wip merge publié sur Cogentia main par 633e9618 produit désormais un rapport horodaté à partir de deux inventaires. Six tests WIP passent ; le test réel ThinkPad / Fracta2 montre le même HEAD Cogentia mais des références distantes mises en cache différemment et des scripts Python locaux sur Fracta2. Ni l'absence dans un cache ni l'identité du HEAD n'autorisent une suppression.

Suite : #310 doit classifier les contributions historiques réellement non fusionnées ; la fausse orphelinité inter-dépôts des 650 commits est résolue. #311 peut ensuite produire des plans conditionnés par SHA avec reçus. Pas de reset, purge Git, branche distante supprimée ni suppression en masse de données orphelines.


## 15 novembre 2026 — Conclusions sémantiques, preuve inter-dépôts et deuxième compactage

### Inseme et Survey : correction de provenance historique

La disparition apparente de 650 commits du magasin Git Inseme ne représente pas 650 fonctionnalités à récupérer : une comparaison des parents, arbres, objets, dates, messages et provenance montre **une seule lignée Survey/Ophélia**, datée du 20 octobre 2025 au 26 mai 2026. Son commit terminal e51b13d1b539fa732a4fb2e4612c01386e9e6342 est ancêtre exact du Survey/main actuel. Contrôle global avec git cat-file : **650 commits, 1 909 blobs et 2 418 arbres**, soit les 4 977 objets, sont présents dans le dépôt canonique Survey. Les 56 références historiques Inseme autres que le stash sont également retrouvées dans le dépôt canonique Inseme.

Le véritable stash Inseme fa812574dd7eae66e2d23977ac82fec587875353 contient huit chemins sources/tests, tous présents dans main : deux lanceurs et un test de préemption byte-identiques ; le cœur préemption diverge par du formatage ; le nouveau write-back transporte en outre l'environnement pendant le rebase, les exports et tests de mandat sont plus récents. **Aucune réintégration du stash en bloc** ; son OID et ses huit blobs restent conservés dans un bundle de **10 578 octets** (SHA-256 c810db8f22c844c842dc70cea2ec852fa6bc69bc3d5bf57f8dd5c53a0c3a7b5e). La restauration de ce bundle a été réellement vérifiée dans un dépôt bare éphémère par comparaisons des huit blobs et git fsck.

Après ces preuves, le bundle de 232 802 288 octets contenant inutilement la lignée Survey déjà canonique a été retiré. L'archive privée Inseme occupe désormais **396 Ko**, conserve les deux fichiers locaux byte-exacts et un manifeste des deux prérequis historiques (Survey et Inseme). Gain supplémentaire : environ **232,8 Mo**. La réécriture destructrice de l'un de ces historiques exigerait de rendre le bundle autonome avant d'éliminer les commits prérequis.

### Qualification du contenu des autres snapshots

- **FractaVolta :** comparaison des 138 chemins de l'ancien HEAD af1f90b avec main. 130 identiques, huit divergences analysées : enrichissement README, projections générées, backlinks, ajout de capacités humaines et physiques dans Fractanet, et surtout correction des affirmations anciennes sur les Cognitive Packet Networks de Gelenbe. Les formulations actuelles ne caractérisent plus son payload comme nécessairement inerte. **Ancien texte supplanté, aucune fusion en bloc.** L'archive reste préservée pour son ancien SHA non présent dans main.
- **Inox :** cinq fichiers sources historiques byte-identiques à main ; concepts.md n'a gagné qu'un backlink, deux autres différences sont des projections llms et corpus-status. **Aucune source utile à réimporter de ces huit fichiers.**
- **Marenostrum :** l'ancien document DHITL est byte-identique ; seul corpus-status, généré, diffère.
- **Barons Mariani :** la comparaison des 30 fichiers WIP montre des différences minimes sur les cinq cas Capable, mais cinq manuscrits substantiellement réécrits ; ils ne sont pas déclarés équivalents sur la seule base des chemins. L'ancien fichier Napoleon editorial-architecture est sémantiquement remplacé et enrichi par Napoleon architecture.md (Janus, correction, quatre couches, revue contradictoire). Une distinction utile perdue de l'ancien chapitre Capable Test, confirmée par la spécification EIM actuelle, a été réintégrée dans le manuscrit au commit https://github.com/JeanHuguesRobert/barons-Mariani/commit/59a5561c63a3c2cee735fb880369eb75a4e85c00. Les affirmations historiques moins prudentes juridiquement ne sont pas restaurées. **Le snapshot Barons Mariani reste conservé dans une archive autonome vérifiée**, pour l'examen des éventuels autres passages uniques des cinq chapitres.

Distinguer conservation des objets, convergence sémantique et preuve de fonctionnement réel. Les résultats ci-dessus étayent des dispositions précises mais ne clôturent pas les autres PR de développement ni la publication des Livres Vivants.


### Barons Mariani : archive autonome avec restauration réelle du snapshot

L'ancien checkout du 10 octobre sur Fracta2, HEAD fc6f6bcb40462e4fbe36c56fa1c97b8b8effbfeb, occupait environ 81 Mo. Son commit historique n'est pas dans le Git canonique du dépôt ; 30 contenus WIP ne sont pas accessibles à l'identique dans l'histoire de main. Ils doivent donc rester récupérables, même lorsqu'une version actuelle est sémantiquement meilleure.

L'état historique est maintenant conservé sous le répertoire privé barons-Mariani.archive, avec un **Git bundle complet et autonome**, SHA-256 34617030475320aff74f30454f6840b9cf46852cb08ca693f822ccbbef14d33e ; un patch Git des **13 modifications et deux suppressions suivies** ; une archive des **17 fichiers non suivis** ; les **10 références** historiques ; un manifeste des 30 empreintes de fichiers présents ; et la copie inerte des métadonnées Git. Le bundle ne dépend d'aucun commit externe pour reconstruire ce checkout.

**Test de récupération exécuté :** clone isolé du bundle, application du patch, extraction des 17 fichiers, comparaison du statut Git exact sur les 32 chemins, comparaison octet par octet des 30 fichiers, accès aux dix objets de référence, git fsck PASS. Le répertoire temporaire a été supprimé. Remplacement de l'ancien checkout de 81 Mo par l'archive de 51 Mo, libérant **27 401 756 octets** supplémentaires, sans toucher aux branches canoniques ni aux sites actifs.

Le gain net cumulé sur Fracta2 des trois premiers remplacements et des deux compactages supplémentaires (Inseme et Barons Mariani) approche **827 Mo**. La conservation du WIP historique ne vaut pas validation du contenu des anciens manuscrits ; les passages uniques restent consultables et restituables.


## 15 novembre 2026 — Reprise checkpointée après interruption (#309)

La suite de la consolidation est désormais journalisée **après chaque unité contrôlée**, sans création d'un nouveau checkout ou worktree persistant. Le reçu privé atomique (Fracta2) est conservé à :

    /home/ubuntu/travel/recovered-20261010/semantic-reconciliation-checkpoint.json

Il conserve les SHA-256 historiques et actuels, les dispositions des onze fichiers WIP, les neuf groupes de références historiques et les tests fonctionnels. La reprise doit lire ce JSON avant tout recalcul et ne réexaminer les unités acquittées que si leurs entrées changent. Le reçu contient des chemins privés : **ne pas le copier intégralement dans un dépôt public**. Une synthèse durable est aussi disponible dans le commentaire de Cogentia #309 du 15 novembre (issuecomment-6902008772).

### Consolidation matérielle supplémentaire, réellement vérifiée

- Sept anciens checkouts sans travail source non récupérable (Kudos, acorsica.org, institut-mariani, marianivillage, privai, ubikia, marenostrum) : toutes les anciennes références sont ancêtres des branches canoniques, zéro stash / ignored / untracked ; neuf fichiers locaux dérivés conservés exactement dans un tar privé de 143 540 octets. **5 838 340 octets libérés**.
- Operium : ancien checkout avec trois stashes, 50 références historiques, 26 chemins issus des stashes. Bundle Git complet et **autonome**, restauration réellement testée, refs/OID/blobs et fsck contrôlés ; archive 1,5 Mo. **2 486 071 octets libérés**. Les branches non fusionnées restent récupérables, pas déclarées automatiquement effectives.
- Huit autres anciens checkouts (StructEnv, gouvernance, serra, Inox, FractaVolta, JeanHuguesRobert, registre-mariani, firelayer) : bundles complets **autonomes**, WIP exact par SHA-256 et manifestes ; huit restaurations isolées PASS, incluant deux commits inaccessibles précédemment de l'ancien Inox. **13 744 859 octets libérés**.

Le répertoire de récupération du 10 octobre occupe désormais environ **63 Mo**, contre environ 897 Mo au début de ce chantier. Il contient des archives et manifests, **plus aucun des anciens checkouts actifs**. La conservation autonome ne suffit pas à prouver que chaque ancien comportement a été intégré.

### Registre JeanHuguesRobert : onze fichiers analysés unitairement

- Audit primaire .cogentia/audit.jsonl : les **1 566 lignes historiques** sont une sous-séquence **exacte et ordonnée** des **1 640 lignes** de l'audit courant. Disposition : intégré, sans perte de ligne historique détectée.
- Registre interaction_packets/mail_trace.md : les **20 identifiants historiques** figurent tous parmi **52 identifiants actuels** ; onze statuts ont été prolongés par des observations ultérieures. Disposition : anciennes formulations supplantées, versions exactes archivées ; aucune interaction historique disparue.
- Les neuf autres états de cette ancienne copie (index, tableaux FBF, vues llms, état du corpus) sont des projections dérivées : ne pas les remettre sur main pour satisfaire artificiellement un diff.
- Défaut réel retrouvé : trois backlinks issus de Barons Mariani manquaient dans le registre courant bien que les sources renvoient toujours vers lui. Plan de génération en lecture seule sur **2 518 documents** : quatre blocs concernés. Régénération bornée, sans changement du corps rédigé, publiée sur https://github.com/JeanHuguesRobert/JeanHuguesRobert/commit/965e6a65e6a11a3c7eb64f96eea330539d24688c. **Second plan : zéro changement** (point fixe).

### Analyse des références historiques (neuf ensembles)

Comparaison par OID, ascendance réelle et contenus de fichiers, **checkpointée par dépôt** :

- Gouvernance : les deux anciennes lignées de comptabilité portent six documents **tous présents et enrichis** sur le main actuel ; aucune restauration brute.
- FractaVolta : une ancienne branche de données site a un contenu identique malgré des commits différents ; ancien HEAD et objets particuliers préservés dans bundle.
- Inox : l'ancienne branche #34 possède sa sonde d'audit des écarts entre spécification et runtime dans le master actuel ; 27 des 39 chemins ont un corps documentaire équivalent ou contenu, les autres restent classés séparément. Trois branches Dependabot demeurent des mises à jour distinctes, sans assimilation à l'état courant.
- StructEnv et Serra : anciennes propositions Dependabot non incluses par ascendance ; ne pas fusionner automatiquement des versions anciennes de dépendances.
- Operium : les familles Calendar/COP, navigation, observateur ONA, console et navigateur hébergé sont présentes dans les sources actuelles, et leurs tests ciblés sont opérationnels. Les anciennes branches comportent cependant des versions et quelques scripts supprimés ou remplacés : leur abandon, substitution ou réintégration ne doit pas être inféré du seul statut Git ; les bundles en conservent les contenus.
- Registre privé et Firelayer : conservation locale autonome, aucune publication ni suppression de source primaire.

### Contrôle comportemental et FBF

**16 tests actuels d'Operium PASS**, incluant calendrier et événements, COP roundtrip, portail Nasa, navigation, recovery/observer, base ONA, actions, console, politique et supervision des workspaces hébergés. Un défaut initial détecté dans le test COP roundtrip provenait d'un port 8795 fixe déjà occupé par un service. L'emploi d'un port local éphémère a restauré **11 assertions PASS**, y compris **deux exécutions simultanées PASS**. Correctif test seul poussé à https://github.com/JeanHuguesRobert/operium/commit/bc2cacc06a286d44dba732cbaf44d4c45ad6861e ; SHA distant contrôlé.

La sonde Inox #34 a été exécutée : **19 cas enregistrés, dont quatre sorties non nulles**, à interpréter comme des observations d'écart et non comme un succès de conformité. L'exécution de l'outil lui-même a réussi.

**Restes :** classer les scripts historiques propres aux modes de session hébergés, les branches Dependabot par comparaison aux versions actuelles, et les changements fonctionnels non couvrables par les tests ci-dessus. Ne pas purger les branches distantes ou les bundles propriétaires avant disposition et preuve distinctes. Le commentaire Cogentia #309 et le reçu privé constituent les points de reprise canoniques ; aucune nouvelle validation humaine n'est requise pour poursuivre les comparaisons et corrections ordinaires.
