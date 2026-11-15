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
