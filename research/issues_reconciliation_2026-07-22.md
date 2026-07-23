# Réconciliation issues — session 2026-07-20/22

Inventaire : 115 issues ouvertes, 10 dépôts (export cogentia.js du 2026-07-22, fourni par le porteur — canal latéral déclaré). Confiance : titres vérifiés pour tout, corps vérifiés pour les recouvrements décisifs (#48 notamment) ; Hop 1 confirme avant toute fusion effective.

## A. Verdict sur les cinq issues préparées (github_issues_2026-07-21.md)

| Préparée | Verdict | Détail |
|---|---|---|
| FractaVolta « v0.5 : F1–F5 comme résistances (§8) » | **CRÉER** | Aucun counterpart — les 7 issues FractaVolta sont matérielles/produit ; la couche recherche n'a aucune issue. Cross-link : cogentia #48, #40. |
| FractaVolta « CPKT-2026-001 : hop humain décorrélé » | **CRÉER** | Aucun counterpart. Cross-link : inseme #13 (Fractanet Packet Attractor — proto handoff pause/resume, motif frère). |
| cogentia « reviewer.md : A1 + R0 » | **CRÉER** | Aucune issue sur le protocole de revue lui-même. Cross-link : barons-Mariani #5 (revue adversariale DAO/DHITL — consommatrice du protocole). |
| cogentia « Produits dérivés de WCBT » | **CRÉER MODIFIÉE** | Retirer l'item « schéma cognitive-packet/v0.2 » → devient un **commentaire sur cogentia #29** (famille des schémas *_packet) lié à **inseme #21** (COP Experimental Packet Kernel — schemas & conformance vectors) : le schéma rejoint la famille existante, il ne naît pas à part. L'item « rapprochement interaction_packets » → commentaire croisé sur **registre-mariani #8**. |
| JeanHuguesRobert « registre : cohérence post-envoi + copie D3 » | **CRÉER** | Le dépôt-profil n'a aucune issue ouverte. Cross-link : registre-mariani #8. |

Aucun doublon pur parmi les cinq — mais trois gagnent des liens et une perd un item au profit d'une famille existante.

## B. Carte d'attachement S1–S7 (pour W3 du paquet CPKT-2026-002)

| Spec | Destination | Mode |
|---|---|---|
| S1 — projection statique (llms.txt) | **cogentia #48** (Corpus Navigator, « model-facing corpus index ») | Commentaire de réorientation — S1 est la projection statique de #48, pas une issue nouvelle. Respecter sa contrainte : ne pas casser le contrat du Guide en production. |
| S2 — registre publié | **cogentia #20** (add-repo / registry onboarding) | Commentaire — publier le registre comme artefact versionné est la moitié manquante de l'onboarding. |
| S3 — alias + règle de couverture | Nouvelle issue cogentia | Liée à #48 comme sous-chantier. |
| S4 — cartes d'attracteurs | **inseme #14** (information-gravity routing for Fractanet attractors) + #13 | Commentaire — les cartes sont le format que le routage consomme ; génération côté cogentia si besoin en sous-tâche. |
| S5 — convention de stub | **cogentia #54** (fixed-point stable generated Markdown) | Commentaire — même famille de discipline de génération. |
| S6 — banc de navigation (retours négatifs) | Nouvelle issue cogentia | Aucun counterpart ; liée à #40 et #59 — guide-eval gagne sa vérité terrain. |
| S7 — Guide trois couches + MCP contrat-paquet | **cogentia #40** (Guide Core CLI/MCP/web) + **#52** (deploy Guide route/action) | **Pas de nouvelle issue** — réorientation à commenter : le verbe `route` existe déjà dans #52 ; S7 lui donne l'admissibilité dure et l'arbitre S6. |

## C. Trouvailles latérales

1. **La jointure doctrine/implémentation.** Le backlog détient l'étage implémentation de la doctrine des deux jours (gravité #14, attracteurs #13, schémas #29/#21/#25, route #52, navigator #48, registry #20, continuation language #36). Les papiers détiennent l'étage doctrine. Cette table est la jointure ; les commentaires d'attachement doivent citer les documents doctrine (WCBT §5, audit S-specs) pour que chaque issue connaisse désormais son fondement.
2. **W6 (Potentics v6 / Deutsch) a une maison naturelle : barons-Mariani #18** « Relier la transition possibiliste au noyau doctrinal du corpus ». Le GO Potentics s'y attache — pas d'issue nouvelle.
3. **inseme #22 « Physical Cognitive Packet — Casa Mariani Immortelle demonstrator »** : le paquet cognitif physique existe déjà comme chantier — à citer dans les produits dérivés (le pont mPsN↔CPsN est déjà planifié chez vous).
4. **Deux registres ?** interaction_packets/ (dépôt-profil) et le dépôt registre-mariani coexistent ; #8 y traite « registres d'interactions — public, privé, passerelles ». Question d'architecture à clarifier au fil de #8 — signalée, non tranchée.
5. **10 dépôts, pas 5.** Le processeur d'empaquetage croyait le corpus à cinq dépôts ; l'export en révèle dix (operium, registre-mariani, ubikia, Inox, survey en sus). Preuve supplémentaire pour F-NAV-2 : sans registre publié, même un agent attentif sous-estime le territoire de moitié.
