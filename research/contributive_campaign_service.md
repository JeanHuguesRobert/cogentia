---
title: "Cahier des charges — Campagnes contributives, 3Code et exemplaires singuliers"
author: "Proposition de travail pour Jean Hugues Noël Robert / C.O.R.S.I.C.A., assistée par GPT-6"
date: 2026-11-18
last_modified_at: 2026-11-18
language: fr
status: "spécification de travail publiée — implémentation non attestée"
document_role: design
document_kind: requirements-specification
visibility: public
lifecycle_state: working
license: CC BY-SA 4.0
source_lineage:
  - https://github.com/JeanHuguesRobert/cogentia/issues/319
  - https://github.com/JeanHuguesRobert/cogentia/issues/320
  - https://github.com/JeanHuguesRobert/cogentia/issues/323
  - https://github.com/JeanHuguesRobert/cogentia/blob/main/research/3code.md
  - https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cognitive_packet_incarnations_and_missions.md
  - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/methodes/bouteille_a_la_mer.md
  - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/capable/campaign/tracts-a-voce/README.md
review:
  status: unreviewed
  reviewed_by: []
---

# Campagnes contributives — Cahier des charges fonctionnel et technique

**Version de travail : 0.1 — 18 novembre 2026.** L'objet de cette note est de préciser un ensemble de services génériques, accessibles à tous les initiateurs de campagnes légitimes, y compris tous les candidats politiques, sans privilège fonctionnel ou accès aux données des autres. La Marche du Soleil / Capable sert de **premier cas d'essai**, et non de modèle technique exclusif.

> Une feuille photocopiée peut devenir un nouvel exemplaire unique, et porter une mission propre, sans perdre la mémoire de son parent.

## 1. Décision de périmètre et antériorité

**Éviter un nouveau framework.** Étendre le chantier générique existant [Cogentia #319](https://github.com/JeanHuguesRobert/cogentia/issues/319) / [#320](https://github.com/JeanHuguesRobert/cogentia/issues/320) : `Campaign`, `Call`, `Contribution`, `Commitment`. Reprendre `Mission`, `Incarnation`, `CognitivePacket`, `Continuation`, `InteractionPacket` et leurs journaux de [#213](https://github.com/JeanHuguesRobert/cogentia/issues/213). Réutiliser le 3Code, en cours d'étude sous [#323](https://github.com/JeanHuguesRobert/cogentia/issues/323), et les règles du [Musée Mariani — Bouteille à la Mer](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/methodes/bouteille_a_la_mer.md).

Le système ne doit pas présumer que C.O.R.S.I.C.A., KYS Services ou Capable possède la sémantique des objets. Fournisseur de service ≠ responsable de campagne ≠ propriétaire d'un exemplaire ≠ représentant d'un candidat.

### Objectifs

1. Permettre à toute personne de générer **localement et gratuitement** des 3Codes de classe 3, même hors ligne, puis de les enregistrer auprès d'un registrar choisi.
2. Permettre à une organisation ou personne habilitée de créer une campagne, d'y publier des appels à contribution et de définir des missions facultatives, décrites avec résultats attendus et règles de preuve.
3. Associer à une campagne un ou plusieurs supports (`flyer`, `poster`, `textile`, `book`, `object`, `digital`) et des exemplaires matériels singuliers, avec identité et biographie indépendantes de leurs porteurs.
4. Permettre la reproduction **par photocopie**, avec un nouveau code écrit à la main, et conserver la filiation éventuellement déclarée avec l'exemplaire parent.
5. Offrir un éditeur de tracts/affiches imprimables : texte, logo, typographie, format, fonds, cartouche de référence, QR commun d'enregistrement, QR individuel facultatif, 3Code de l'enfant et 3Code du parent.
6. Accepter les participations sans compte obligatoire, par formulaire, lien, copier-coller, ou e-mail lorsque le transport sera réellement disponible ; garder correction, retrait et consentement possibles.
7. Fournir export, interopérabilité, observabilité des actes et tests du Réel ; éviter profilage et captivité des données.

### Non-objectifs du MVP

- Service d'envoi de propagande, mails ou SMS en masse ; envoi automatisé à des élus.
- Vérification de la sincérité politique par IA ; « score » d'élu ou de militant ; ciblage psychographique.
- Surveillance de détenteurs, traçage individuel des scans, géolocalisation par défaut.
- Preuve cryptographique de possession d'un papier ou d'un textile à partir d'un QR.
- Mise en œuvre immédiate de la fédération complète 3Code ou de Cogentia Collective Twin ; ces capacités ont leurs chantiers propres.
- Validation juridique automatique d'un financement ou d'un parrainage électoral.

## 2. Ontologie minimale : objets et frontières

| Objet | Fonction | Identifiant distinct | Invariant |
|---|---|---|---|
| `Campaign` | But partagé, responsable, règles, échéance, visibilité, statut | `campaign_id` | N'appartient pas à un service d'hébergement |
| `Call` | Invitation transportable à apporter une contribution | `call_id` | Diffuser ≠ accepter |
| `Mission` | Objectif réalisable, critères de réception et de preuve | `mission_id` | Mission ≠ exemplaire ≠ résultat |
| `Edition` / `PrintTemplate` | Version figée d'un contenu graphique/éditorial | `edition_id` / `template_id` | Réutilisable par de nombreux objets |
| `Incarnation` / `Copy` | Exemplaire matériel ou numérique individualisé | `copy_id` stable et scoped + ID opaque global | Copier ≠ réutiliser son identité |
| `Fork` | Relation déclarée enfant → parent, source de photocopie ou de dérivation | `fork_event_id` | Déclaration ≠ filiation authentifiée |
| `3CodeRecord` | Association d'un 3Code public avec URL(s) et contexte | `record_id` indépendant du 3Code | Collision autorisée ; code ≠ autorité |
| `Contribution` | Information ou réalisation proposée, éventuellement anonyme | `contribution_id` | Proposition ≠ qualification ni accomplissement |
| `Commitment` | Engagement volontaire et réversible à tenter d'agir | `commitment_id` | Promesse ≠ effet accompli |
| `Event` | Trace horodatée d'une opération ou observation | `event_id` | Preuve qualifiée, append-only logique |

Relations : `Campaign 1→N Call`, `Campaign 1→N Mission`, `Edition 1→N Copy`, `Copy N↔M Mission`, `Copy child → 0..N Copy parent` (dans le MVP : un parent primaire, autres liens documentaires), `Copy 0..N 3CodeRecord`, `Copy 0..N Event`, `Contribution → 0..N Call/Mission/Copy`. Les héritages de contenu, les héritages de mission et les liens de parenté **ne sont pas le même graphe**.

Un `copy_id` suffit à identifier un objet **dans un registre et une campagne déterminés** ; un `incarnation_id` opaque (UUID ou équivalent) sert de clé technique globale au service. Un 3Code ne constitue ni cette clé ni une preuve de propriété. Les QR sont des transporteurs d'URL, pas des identités indépendantes.

## 3. Trois formes d'accès : QR commun, QR individuel, 3Code

**QR A — enregistré sur le document maître** : URL HTTPS stable, par exemple `https://services.acorsica.org/campagnes/creer-une-copie?template=<id>` ; identique sur toutes ses photocopies. Il ouvre un formulaire de déclaration d'un **nouvel exemplaire**. Aucune identité d'enfant n'existe du seul fait du scan.

**QR B — propre à l'exemplaire** : URL HTTPS vers sa fiche stable, par exemple `https://services.acorsica.org/e/<incarnation_id>` ; généré et ajouté après création de la fiche, en impression variable ou sur étiquette. Si on le photocopie, il **continue à désigner le parent**. La page du parent doit alors proposer clairement « J'ai photocopié cet exemplaire — déclarer un enfant » plutôt que traiter le scan comme un nouveau propriétaire.

**3Code humain** : texte `3XX-XXX-XXX`, selon le contrat Crockford Base32 de [3Code](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/3code.md). Il peut être généré hors ligne puis écrit au stylo, dicté ou apposé. Un seul 3Code peut avoir plusieurs `3CodeRecord` ; la résolution doit afficher le contexte et les candidats, jamais choisir en silence une autorité unique. Le code non enregistré reste simplement **non résolu**, sans invalider le papier.

**Attention sur la copie :** la photocopie intégrale d'un exemplaire déjà identifié duplique visuellement son 3Code et son QR individuel. Le cartouche imprimé prévoit une zone « Nouvelle copie ? Inscrivez votre propre 3Code » ; une intervention manuscrite ou une étiquette réidentifie l'enfant. Si le parent n'est connu que par son 3Code, enregistrer `parent_claim_3code` comme **revendication non corroborée**, résoluble ultérieurement ; ne pas inventer `parent_copy_id`.

### Cartouche obligatoire, déclinable

```text
┌─────────────────────────────────────────────────────────────────┐
│ BOUTEILLE À LA MER  ·  CAMPAGNE : ____________________________ │
│ CODE DE CET EXEMPLAIRE : 3__-___-___                          │
│ CODE DU PARENT (si photocopie) : 3__-___-___                  │
│ [ QR A : déclarer une copie ]   [ QR B : fiche, si attribuée ] │
│ Mission : [résumé bref] · Code ou URL à recopier : __________  │
└─────────────────────────────────────────────────────────────────┘
```

Sur une feuille maître non individualisée, la zone QR B est **vide**. Les champs manuscrits restent lisibles à 100 % sur photocopie noir et blanc. Le cartouche doit pouvoir être placé en haut, en bas, sur une marge latérale ou sur une deuxième face optionnelle ; réserver surface utile et marge technique.

## 4. Parcours utilisateur, y compris hors ligne

### A. Création d'une campagne

1. Déclarer le responsable (particulier, association, candidat, parti, autre), son rôle et ses canaux de réponse.
2. Définir finalité, règles d'admission/consentement, statut public/privé, durée, destinataire, types de contributions autorisées, attestations à fournir, modération et suppression.
3. Créer un ou plusieurs `Call` et `Mission` réutilisables, avec versions.
4. Préparer un modèle imprimable à partir d'une édition publiée et des ressources (logos, textes, URL), sans qu'une campagne soit automatiquement mise en ligne.
5. Publier la campagne séparément après décision du responsable ; exporter un manifeste portable et un état de vérification.

### B. Création manuelle après photocopie : priorité absolue

1. Photocopier le tract (sans compte, sans impression spécialisée).
2. Générer hors ligne un 3Code dans son navigateur ou le recevoir sur la page d'enregistrement (génération locale, non attribution centralisée) ; le recopier **à la main** dans « CODE DE CET EXEMPLAIRE ».
3. Recopier facultativement le 3Code du parent visible sur l'original dans « CODE DU PARENT ».
4. Lire le QR commun ou saisir l'URL courte ; sélectionner la campagne/mission, déclarer le nouveau code et le parent éventuel.
5. Le service crée un `incarnation_id` et un `copy_id` dans le bon espace, enregistre l'association chez le registrar selon son mécanisme autorisé et rend une fiche publique minimale, avec niveau de preuve explicite.
6. Optionnellement télécharger un **QR B**, imprimer/coller une étiquette, transmettre ou annoter l'exemplaire. **Aucun acte ne vaut consentement à un suivi nominatif.**

En mode totalement hors ligne : préparer/annoter l'objet et un fichier/texte de déclaration différée ; statut `LOCAL_UNREGISTERED`, jamais `REGISTERED`. Aucun besoin de l'identité civile du porteur pour lire ou générer un code. La mise à jour d'une fiche existante exige une autorité distincte de la seule connaissance du 3Code, avec mécanisme de récupération et d'export documenté.

### C. Création en lot par imprimeur

Choisir `N`, un schéma de numéro de série scoped, la ou les missions et l'édition ; générer un manifeste CSV/JSON et, facultativement, un PDF de données variables/étiquettes. Réserver réellement les fiches/3Code seulement à une étape transactionnelle **distincte** ; de simples 40 000 lignes CSV ne sont pas 40 000 associations enregistrées. Sauvegarder des reçus (`GENERATED`, `REGISTERED`, `PRINTED`, `ISSUED`) et les empreintes de PDF et de manifestes ; traiter les erreurs de lot sans doublon de fabrication. Un objet peut être fabriqué avant ou après son identité.

### D. Contribution et mission

La fiche de l'exemplaire explique le but de la campagne, le `Call` et la `Mission`, donne des options « lire / proposer / corriger / déclarer une action / transmettre / ne rien faire ». Contribution individuelle privée par défaut jusqu'à son examen ; publication sélective, attribuée ou anonymisée selon choix et droits. `Contribution` ≠ `Commitment` ≠ accomplissement ≠ validation externe. Les relais peuvent déclarer un nouveau `Call` dérivé **sans** altérer le mandat originel.

## 5. Générateur de tracts et affiches

### Exigences d'édition

- **Format :** A4, A5, A6, affiche A3, dimensions personnalisées ; recto par défaut, recto-verso possible ; fonds blanc, niveaux de gris, puis couleur.
- **Contenu :** zones de texte libres et ordonnées, titre/sous-titre, logo(s) et crédits, zone de sources, identifiants des responsables, mentions légales paramétrables, lien(s) et informations de contact autorisées ; pas de contenu imposé par Capable.
- **Ressources :** télécharger SVG/PNG/JPEG en provenance vérifiée ; redimensionnement/cadrage sans déformation, validation MIME, nettoyage SVG et droits d'usage déclarés ; aucune police externe obligatoire.
- **Personnalisation :** changement de texte/logo/campagne/mission sans modifier le code Python ; modèles sérialisés en JSON/YAML, historique des révisions, aperçu HTML fidèle, SVG source si possible, PDF prêt à imprimer.
- **Cartouche :** bloc déplaçable, dimensionnable, contraste élevé, zones manuscrites, QR commun, QR individuel optionnel, 3Code enfant/parent, courte URL de secours ; mode maître vierge, mode variable et mode étiquette.
- **Reproduction :** tout modèle maître reste utile photocopié sans couleur, sans QR individuel, sans adresse personnelle, sans compte ; reproduire la même feuille ne « re-crée » pas à tort un exemplaire enregistré.
- **Sorties :** PDF maître monochrome, PDF variable par lot, planches d'étiquettes, CSV/JSON/JSONL manifestes et contrôles, SVG/HTML exportables si disponibles ; DPI et marges d'impression configurables ; bord perdu si imprimeur le demande.
- **Avant diffusion :** aperçu avec filigrane `MAQUETTE — BON À TIRER NON VALIDÉ` tant que la validation de contenu et la vérification des URLs ne sont pas attestées. Le logo d'un candidat et les mentions de financement relèvent du responsable de campagne.

### Profils de cartouche

- `blank-manual` : code enfant vide, champ parent vide, QR commun d'enregistrement ; imprimable à l'infini.
- `preidentified` : code enfant déjà généré/enregistré, QR individuel sur exemplaire original ; ajoute clairement le mécanisme de fork.
- `fork-handwritten` : parent renseigné, enfant à écrire à la main, QR commun ; éventuellement étiquette individualisée ensuite.
- `label` : cartouche seul, adhésif, à coller sur un support déjà imprimé ou textile.

### Architecture du générateur

Conserver autant que possible le prototype existant `barons-Mariani/projects/capable/campaign/tracts-a-voce/prepare_batch.py` comme **adaptateur de lot / preuve de faisabilité**, tout en supprimant ses constantes A Voce/Capable dans une future couche de configuration. Le moteur doit rester déterministe pour un manifeste et une version donnés, avec PDF reproductible à métadonnées non déterministes normalisées si les empreintes sont comparées. Ne pas reproduire un nouveau générateur par candidat.

## 6. Rôles, gouvernance, neutralité d'accès

- **Visiteur :** découvre les campagnes, lit les missions, génère un 3Code local, consulte les fiches publiques et les QR.
- **Contributeur volontaire :** propose une contribution, une copie/fork, une correction ; peut rester non identifié si la contribution le permet.
- **Organisateur :** crée et administre une campagne, ses appels, missions, modèles et validations ; ne peut consulter les données d'une autre campagne.
- **Éditeur/imprimeur :** produit des tirages et reçus de lots sous mandat explicite, sans accès obligatoire aux données des contributeurs.
- **Registrar :** enregistre/résout/révise les associations de 3Codes sous l'autorité du titulaire de chaque enregistrement, sans être propriétaire des codes.
- **Modérateur :** qualifie les contributions publiques et les abus, avec accès borné aux contenus sous sa responsabilité.
- **Opérateur de plateforme :** maintient le service, fournit export et portabilité, sans afficher un candidat comme favori ni exploiter les données des autres pour une campagne.

**Neutralité électorale :** mêmes fonctions, documentation, politiques de disponibilité et critères d'accès publiés pour tous les candidats éligibles à l'utilisation du service. Pas de recommandation, classement implicite, usage croisé de données, sollicitation prédictive d'élus ou optimisation comportementale en fonction de profils politiques. Une campagne peut avoir sa propre identité et ses propres modèles, mais l'infrastructure de base et ses registres restent distincts.

## 7. API et interopérabilité : version candidate, non déployée

Préfixe proposé `https://services.acorsica.org/api/v1/` (**préférer le pluriel `services` déjà documenté ; `service.acorsica.org` éventuellement redirection si domaine réellement configuré**). Noms et HTTP à stabiliser après audit des routes existantes :

| Opération | API candidate | Autorité |
|---|---|---|
| Générer un 3Code | Local : `generate()` dans navigateur/CLI | Aucune inscription |
| Résoudre | `GET /3codes/{code}/records` | Public, résultats désambiguïsés |
| Créer une association | `POST /3code-records` | Autorité d'écriture enregistrée |
| Modifier/révoquer | `PATCH /3code-records/{record_id}`, `POST .../revoke` | Titulaire + préconditions de révision |
| Lister une campagne | `GET /campaigns/{campaign_id}` | Public ou permission d'accès |
| Créer campagne/appel/mission | `POST /campaigns`, `/campaigns/{id}/calls`, `/missions` | Organisateur attesté |
| Inscrire un exemplaire | `POST /incarnations` | Autorité de déclaration, anti-abus |
| Déclarer une photocopie | `POST /incarnations/{parent_id}/forks` ou `POST /incarnations` avec parent déclaré | Peut être provisoire sans preuve du parent |
| Lire une biographie | `GET /incarnations/{id}/events` | Vue filtrée selon confidentialité |
| Proposer contribution | `POST /contributions` | Volontaire, anti-abus et consentement |
| Prévisualiser/imprimer | `POST /print-jobs`, `GET /print-jobs/{id}` | Opérateur autorisé ; rendu possible hors ligne |
| Exporter | `GET /campaigns/{id}/export` | Organisateur, données minimisées |

Documenter schémas JSON versionnés, exemples et OpenAPI après stabilisation de #320 ; éviter un SDK impératif. Un même 3Code peut produire **plusieurs résultats** avec provenance/description. Retourner un indicateur `partial`/`stale` en cas de cache ou partition ; conserver les révocations, doublons et conflits. Contrôler les URL externes pour éviter SSRF, redirections malveillantes et usurpations.

## 8. Vie privée, intégrité, abus

- **Séparer données publiques et privées**, y compris les campagnes de différents candidats. Le code imprimé est public ; aucune donnée personnelle ne doit être inférée du simple scan.
- **Données politiques sensibles :** le contact d'un participant, ses opinions exprimées ou un engagement politique peuvent relever de l'article 9 RGPD. Base juridique, exception pertinente, information, minimisation, durée de conservation, droits et sous-traitants doivent être déterminés avec le responsable avant une collecte effective.
- Consentement spécifique aux publications nominatives et à l'usage d'une contribution pour une autre finalité. Possibilité de demander retrait/correction, sous réserve d'obligations de conservation documentées ; traces d'audit privées séparées.
- **Pas de géolocalisation, d'empreinte navigateur, d'identification des détenteurs ni de tableau de bord individuel des scanners par défaut.** Statistiques agrégées et non identifiantes seulement si nécessaires et justifiées.
- Limitation des abus : quotas d'enregistrements, captcha accessible si nécessaire, statut provisoire des déclarations, blocage d'usurpations/phishing, modération des images et liens, journal d'actions proportionné, contrôle de concurrence/transactions, idempotency keys.
- Une photo de tract, un QR et un 3Code ne suffisent pas à prouver la propriété physique, la filiation réelle, la véracité d'une déclaration ni un résultat électoral. Préserver provenance et incertitude.
- Portabilité : export JSON/CSV, manifeste de campagne, schémas et liens durables ; reprise par un autre opérateur lorsque la preuve d'autorité est disponible. Ne pas revendiquer fédération ou disponibilité avant essais.

Références CNIL : [fichiers de communication politique](https://www.cnil.fr/fr/les-fichiers-de-communication-politique) ; [droits des personnes, 2026](https://www.cnil.fr/fr/elections-et-prospection-politique-vos-droits-sur-vos-donnees-personnelles).

## 9. Application de référence : Marche du Soleil (politique, non exclusive)

Exemple de mission humaine configurable : « Convaincre un élu habilité de présenter le candidat XXXX à l'élection présidentielle », avec un `campaign_id` indépendant de toute marque technique. Le service doit afficher **qui propose cette mission**, sa période de validité, la faculté d'abstention et un lien vers les informations générales sur le droit de présentation. Il ne rédige pas automatiquement de messages ciblés à des élus et ne contacte aucun tiers.

**Séparer les événements** : impression du tract → émission facultative → copie/fork déclaré → contribution proposée → éventuel contact indiqué → réponse → intérêt → intention → promesse → déclaration d'envoi → **présentation officielle publiée/établie**. Aucune transition ne résulte d'un scan ou d'un simple engagement d'un porteur. Réutiliser l'[Observatoire des Présentations](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/capable/campaign/observatoire-presentations-2027.md) plutôt que créer un compteur de « signatures » incompatible. Le formulaire de présentation demeure un acte officiel personnel de l'élu habilité ; les 500 ne sont pas des signatures citoyennes.

**Financement** : une plateforme neutre accessible à tous ne constitue pas automatiquement une dérogation aux règles électorales. Avant d'affecter gratuitement du temps salarié, de l'hébergement, des tirages, logos, données ou campagnes à une candidature particulière, documenter responsable du service, statut d'éventuel parti, contrat, coût, bénéficiaire, facture, valorisation, mandataire et traitement au compte de campagne. C.O.R.S.I.C.A., association ordinaire, ne doit pas devenir financeur indirect d'une candidature. Le régime des personnes morales et la période de financement 2027 doivent être vérifiés au regard du [guide CNCCFP 2026–2027](https://cnccfp.fr/publication-du-guide-a-lusage-des-candidats-a-lelection-du-president-de-la-republique-et-de-leur-mandataire-edition-2026-2027/) et de la [FAQ sur les contributions de personnes morales](https://cnccfp.fr/faq/comment-le-candidat-peut-il-financer-sa-campagne/).

Lentille Napoléon, **analogie historique et non instruction** : ne pas disperser l'effort sur des dizaines de services avant de disposer du parcours critique « tract photocopié → code manuscrit → nouvelle fiche/filiation → mission → contribution qualifiée ». L'utilité politique, libre et non coercitive, dépend de la vérification des effets, non d'un nombre de scans.

## 10. Phases d'implémentation

| Phase | Livrable | Réutilisation | Réussite attestée par |
|---|---|---|---|
| P0 — contrat | modèle minimal, fixtures, cas limites et validations | Cogentia #320, #213, #323 | tests de sémantique/provenance et démonstration de non-duplication |
| P1 — 3Code autonome | générateur local / validateur + registrar initial persistant + résolution contextuelle | Cogentia #323 | code créé hors ligne, enregistré, retrouvé, modifié et révoqué par son détenteur légitime |
| P2 — fiche/fork | création exemplaire, parent déclaré/validé, mission, journal, URL durable | Bouteille, #213 | photocopie et 3Code manuscrit enregistrés, cas parent ambigu correctement affiché |
| P3 — éditeur de tracts | template JSON, logo, texte, cartouche, PDF maître et étiquettes | `prepare_batch.py` | variation logo/texte sans code, photocopie lisible, PDF contrôlé |
| P4 — campagnes contributives | organisation, appels, engagements, contributions, rôles et exports | #319–#322, KYS Services | trois campagnes distinctes, une sans papier, flux humain/agent par copier-coller |
| P5 — durcissement/publication | accès multi-organisateur, sécurité, RGPD, coûts, pilote borné, observation HTTP | Operium/Fracta2/KYS | vraie recette publiée, reçus, rollback, incident et politique de correction |

**Ordre opératoire recommandé :** P0 → le plus petit P1/P2 démontrant un fork manuscrit → P3 → P4 → P5. La fédération complète du registrar et le courrier automatique sont des suites indépendantes, non des préalables à la maquette papier. Un service utilisable sans AI ni compte doit rester possible tout au long du parcours.

## 11. Critères d'acceptation / contre-exemples obligatoires

1. Un tract maître noir/blanc photocopié 10 fois est utilisable ; les dix photocopies ont un **QR commun**, mais **aucune identité d'enfant préattribuée**.
2. Deux enfants enregistrés avec leurs propres codes ont deux `incarnation_id`, un même modèle, et leurs parentés déclarées ; les fiches ne se confondent pas.
3. Une photocopie conserve l'ancien QR individuel : le scan affiche le parent et offre de créer un enfant ; le système ne déduit pas de nouveau porteur.
4. Un 3Code est généré hors ligne, correctement normalisé et enregistré plus tard ; avant l'enregistrement, aucune fausse promesse de résolution.
5. Deux `3CodeRecord` possèdent le **même 3Code** ; la résolution affiche deux candidats avec leurs contextes sans écraser l'un ou l'autre.
6. La filiation saisie par 3Code ambigu reste `claimed/unknown` tant que le parent technique n'a pas été confirmé.
7. Un engagement volontaire est révoqué ; le compteur d'actions vérifiées ne s'incrémente jamais pour cet engagement, ni pour un scan.
8. Une contribution anonyme est corrigée ; la correction préserve l'histoire privée sans publier une donnée personnelle.
9. Un organisateur A ne voit ni ne modifie les campagnes/participants privés de B ; tous deux accèdent aux mêmes outils publics.
10. Trois campagnes sont testées : patrimoine, sciences participatives, présidentielle. Une campagne sans objet matériel fonctionne.
11. Logo/texte/mission changent par **configuration** et produisent des PDF lisibles noir/blanc, sans code spécifique à un candidat.
12. L'affichage fonctionne sur mobile, avec saisie manuelle, au clavier et sans lecteur QR ; les pages publiques essentielles se lisent sans JavaScript.
13. Export d'une campagne et de ses objets sur deux systèmes différents ; références externes et révisions restent interprétables, même en l'absence d'un registrar fédéré.
14. Un utilisateur non autorisé tente d'écraser une fiche ou un lien 3Code : refus et trace de sécurité. Un code public ne donne pas de permission d'écriture.
15. Une URL externe dangereuse/une image SVG hostile est refusée ; un lien de destination ne déclenche pas d'accès serveur non filtré.
16. Les statuts `DRAFT`, `REGISTERED`, `PRINTED`, `ISSUED`, `OBSERVED`, `COMPLETED`, `OFFICIALLY_ESTABLISHED` ne sont pas assimilés à partir d'indices faibles.
17. Un lot CSV de 40 000 codes peut être produit de façon déterministe, sans être compté comme 40 000 exemplaires imprimés, enregistrés ou diffusés.
18. Échec/timeout de la plateforme pendant la préparation d'une photocopie : le papier reste lisible et le code manuscrit n'est pas perdu ; reprise/idempotence documentées.

## 12. Décisions encore ouvertes, à trancher après prototypes

- Nom public du service de campagnes : `Campagnes contributives`, autre nom, marque blanche ? **Ne pas confondre** avec KYS Services ni Capable.
- Canon DNS : `services.acorsica.org` est déjà le portail conceptuel documenté ; `service.acorsica.org` mentionné dans la demande pourrait être un alias, à vérifier avant toute mise en service.
- Registre initial : stockage existant SQLite ou PostgreSQL ; choisir après inventaire du déploiement, pas avant.
- Publication du `copy_id` humain : suffixe `AV27-00001` seulement dans le lot A Voce, nom plus générique ailleurs ; `incarnation_id` opaque permanent.
- Forme d'authentification minimale qui autorise la modification d'une fiche sans imposer un compte public ; **ne pas utiliser le seul 3Code comme secret**.
- Vérification du parent : témoignage, URL de fiche, pièce de provenance ; impossible de prouver systématiquement une filiation matérielle.
- Sortie PDF : SVG/HTML-to-PDF contrôlé ou ReportLab existant, sur la base de tests imprimés.
- Coûts et limites d'usage pour les campagnes politiques : exigence de neutralité **et** traitement électoral vérifiable, aucun contournement présumé.
- Gouvernance de la modération, durée de conservation, sous-traitance et retrait des campagnes.

## 13. État réel au 18 novembre 2026 et suite

**Existants vérifiés par sources GitHub** : spécification 3Code (document de travail), protocole Bouteille, Cogentia #213, #319–#323, manifeste local et générateur Python A Voce. **Non observés comme opérationnels** : registrar fédéré utilisable, fiche universelle d'exemplaire, fork via QR, éditeur multi-campagne, services de gestion des missions avec données réelles. Les tests HTTP réalisés plus tôt dans cette conversation montraient `capable.acorsica.org` accessible, mais pas `/b/AV27-00001` et la route `/3code` servait une page PrivAI ; ces observations sont datées et ne prouvent rien au-delà des réponses observées.

**Prochaine première implémentation testable, sans contact tiers ni campagne réelle :** un tract maître d'une campagne fictive, photocopié, portant QR commun + cartouche vierge ; génération manuelle d'un code, création d'un enfant et de sa fiche dans un registre local, résolution d'un code ambigu, test d'une mission et export de sa biographie. Ensuite seulement utiliser un cas réel sous mandat, avec validation financière et confidentialité préalable.

**Statut** : cahier des charges proposé ; aucun nouveau service n'est affirmé déployé, aucun tiers contacté, aucun mandat de collecte conféré par ce texte.