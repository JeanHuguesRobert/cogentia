---
title: "Contributive Campaigns — 3Code and physical incarnations service"
author: unknown
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
language: en
date: 2026-11-18
last_modified_at: 2026-11-19
license: CC BY-SA 4.0
status: "working-paper — experimental MVP; deployment evidence separate"
document_role: operational
document_kind: application
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "50948e08ef6c58df00b800d1bb1e49401571f697"
  origin_date: "2026-11-18"
  derived_from:
    - research/contributive_campaign_service.md
    - research/3code.md
    - research/cognitive_packet_incarnations_and_missions.md
review:
  status: unreviewed
  reviewed_by: []
---

# Contributive Campaign Service — MVP

Neutral experimental KYS service. Open to all candidates and nonpolitical initiatives under the same technical conditions. No political targeting, mass-message sending, donations, or automatic endorsement counting.

**Public entrypoint (when unit is healthy):** https://services.acorsica.org/3code . Production status requires a successful live HTTPS test and persistence check.

## Phase pilote — decision du Principal, 19 novembre 2026

Le premier registrar C.O.R.S.I.C.A. / KYS Services se limite aux
**Bouteilles a la Mer**, c'est-a-dire aux exemplaires singuliers deja
declares dans une campagne contributive. Il ne propose pas encore
l'association libre entre un 3Code et des URL arbitraires. Generation
libre et homonymies restent autorisees, conformement a la specification
generale et a la future confederation.

### Procedure minimale d'enregistrement

1. Creer une fiche d'exemplaire dans une campagne et conserver la
   cle privee de controle remise a la creation.
2. Depuis cette fiche, presenter le copy_id, le 3Code correspondant et
   la cle privee, puis reconnaitre explicitement la publication
   de la fiche et les limites de la preuve.
3. Le registrar prepare une demande (record_id), identifie son
   registrar_id, sa politique et son perimetre, et conserve un evenement
   date dans le journal registration_journal.
4. L'usager expedie lui-meme un courriel avec un challenge unique
   a validite limitee vers une boite effectivement configuree.
   La reception verifiee par un adaptateur de confiance produit un
   deuxieme evenement ; la simple adresse From ne prouve ni identite
   ni propriete de l'exemplaire.
5. Le recu local expose l'identifiant stable, le registrar d'origine,
   le numero de revision et les empreintes des evenements, pour
   permettre des protections futures sans perdre l'anteriorite.

**Ce que nous ne pretendons pas avoir :** deuxieme registrar,
replication, signature independante, journal infalsifiable,
transfert d'autorite, revocation federee ou recuperation automatique.
La conservation des Packet JSON et de leurs empreintes est un
historique local, pas une preuve cryptographique externe.

**Evolution proportionnee :** ajouter les defenses lorsqu'une attaque
est observee, lorsque les volumes augmentent reellement, ou lorsque
les premiers usagers ont besoin de recuperation, revocation ou
transfert. Aucune promotion massive du service a ce stade.

## Capabilities

- Local accountless 3Code generator: 3 + 8 uniform Crockford characters (3XX-XXX-XXX). Resolution accepts collisions and lists candidates. The code is not an authentication/ownership credential.
- Create a campaign with one-time management token, draft by default, activatable by its manager; no email, no account required.
- Create missions; declare singular paper/textile/book/object incarnations with UUIDs, own 3Codes and parent ID or parent code. Parent links are explicitly declared, not authenticated.
- Photocopying a QR does not generate a new identity. Readers can create a child with a fresh code and preserve parent reference.
- Public contributions remain pending until the campaign manager reviews them.
- Browser-only printable A4 template supports text, a local-only logo, common QR, child code and parent code; no upload of logo.
- SQLite WAL local data, no scans/tracker logs, geolocation, raw inbox email addresses or mass mailing. Minimal write rate limiting.

**Pilot risks:** campaign claims and physical provenance are unverified. Management secrets are stored in browser localStorage for usability, with a one-time copyable display; user must back them up. Public activation can enable spam; pilot has basic rate limiting but not full abuse reporting, deletion/retention automation, key recovery, backup verification, moderation of campaign titles or substantive legal review. Fix these before major external promotion. No personal identification, political support or electoral presentation is inferred from any action.

## Tests

Node 26 and built-in SQLite; qr SVG via qrcode 1.5.4. No DB server.

    cd apps/contributive-service
    npm ci --ignore-scripts
    npm test
    CAMPAIGNS_DB=/tmp/contributive-mvp.sqlite HOST=127.0.0.1 PORT=8879 npm start

HTTP endpoints under /3code/api: GET health, generate, resolve, campaigns, campaigns/{id}, copies/{id}, qr; POST campaigns, campaigns/{id}/activate, missions, copies, contributions, contributions/{id}/review. Campaign management via x-management-token header, never public 3Code.

## Fracta2 deployment

Use existing general host administration and actual governed authority. Idempotent recipe in deploy/install-fracta2.sh uses an identified Git SHA in /srv/cogentia/services/contributive/releases, persists the database in /srv/cogentia/data/contributive, launches as ubuntu via systemd, adds only /3code route on existing services.acorsica.org. Does not replace KYS SPA.

Live Reality Test: correct /3code HTML and JSON health, create/activate campaign, create copy and fork, same 3Code ambiguity, pending and reviewed contributions, restart persistence, regression of existing KYS routes. Test data is marked as synthetic. Source implementation, HTTP reachability, deployed revision and durable persistence are separate claims.

## Related work

- Requirements: ../../research/contributive_campaign_service.md
- 3Code: ../../research/3code.md ; Cogentia #323
- Campaigns: Cogentia #319, #320, #321, #322
- Incarnations/mission lineage: ../../research/cognitive_packet_incarnations_and_missions.md
- A Voce/Capable pilot: https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/capable/campaign/tracts-a-voce/README.md

## Guide public et dialogue à trois avec son assistant personnel

Le parcours suit la méthode Cogentia Personal / KYS : publier un guide en
langage courant, un manifeste JSON public et des instructions à copier dans
l'assistant conversationnel choisi par la personne. Il n'y a aucune
transmission obligatoire de son historique de conversation ou de sa mémoire.

- /3code/guide : l'explication des 3Codes, exemplaires, filiation et missions.
- /3code/assistant.fr.txt : texte public à copier dans son assistant.
- /3code/service.json : contrat public lisible par un assistant (expérimental).
- /3code : formulaire d'enregistrement distinct des déclarations d'exemplaire.

Une copie physique inscrite dans la table copies reste une déclaration.
Le 3Code généré localement reste non enregistré. L'association enregistrée
après réception effective d'un courriel est un objet distinct avec son propre
UUID, une preuve de réception et une possibilité d'homonymie.

## Preuve de courriel entrant — v0.2

**Décision :** l'enregistrement du code exige au moins un courriel réellement
reçu en provenance de l'usager. Une adresse saisie, un mailto, un brouillon,
un envoi non livré ou une simple déclaration ne suffisent pas.

1. L'opérateur vérifie qu'une **boîte dédiée existe réellement**, reçoit
   des messages et peut être consultée. Le fournisseur de réception dépend du domaine et non de ses
   seuls serveurs DNS : contrôle du 18 novembre 2026, baronsmariani.org
   reçoit par les MX Cloudflare Email Routing, acorsica.org conserve
   des MX Gandi malgré sa gestion DNS Cloudflare, et fractavolta.com
   conserve également les MX Gandi. Les MX ne prouvent ni une règle de
   redirection individuelle ni la livraison réelle à son destinataire.
2. L'opérateur renseigne CAMPAIGNS_INBOX avec cette adresse vérifiée dans
   /etc/cogentia/contributive.env, lu facultativement par systemd.
   **Sans cette configuration**, l'API refuse toute demande de confirmation
   par mail (HTTP 503) ; génération et fiches déclaratives restent utilisables.
   Ne jamais utiliser par défaut la boîte personnelle du Principal.
3. L'usager prépare une demande pour un code et, éventuellement, une fiche
   de copie dont il possède la clé de modification. Le service lui remet
   un sujet de courriel exact à usage unique, une référence UUID, un jeton
   privé de consultation et une expiration à sept jours.
4. L'usager expédie **lui-même** ce message vers la boîte configurée.
   Aucun serveur ne lui envoie automatiquement un courriel.
5. L'adaptateur de réception doit examiner un **courriel effectivement
   arrivé** chez l'opérateur et fournir son identifiant propre au fournisseur,
   sa boîte destinataire, son expéditeur déclaré et son objet au programme
   local mail-receive.mjs. Le programme ne fournit pas de route HTTP
   publique de validation. Le CLI ne suffit pas à prouver qu'un message
   a été reçu : son opérateur est responsable de l'observation.
6. Le registre vérifie le challenge, la date d'expiration, la boîte et
   l'idempotence. Il conserve des empreintes et des horodatages, pas le
   contenu du courriel ni l'adresse de l'usager en clair.
7. Le statut mail_received signifie **courriel reçu par une boîte déclarée**.
   Il n'authentifie pas une identité civile, une propriété, un soutien
   politique ou le résultat d'une mission. La fédération des registrars
   3Code n'est pas encore implémentée.

Exemple de recette locale, valable seulement quand l'opérateur a
réellement observé un courriel (les adresses ci-dessous sont fictives) :

    CAMPAIGNS_INBOX=verified@example.org node mail-receive.mjs \
      --db /chemin/vers/campaigns.sqlite \
      --mailbox verified@example.org \
      --from sender@example.net \
      --subject 'KYS3 <uuid> <jeton-hex>' \
      --provider-uid 'reference-stable-du-fournisseur'

API supplémentaire : GET /3code/api/registrations/config, POST
/3code/api/registrations, GET /3code/api/registrations/{uuid} avec
l'en-tête privé x-registration-view, et GET /3code/api/resolve.
Aucune confirmation de courriel n'est autorisée par une requête publique.

**Non encore installé :** boîte dédiée, adaptateur automatisé pour le fournisseur de réception réellement utilisé (Cloudflare Email Routing ou Gandi selon le domaine),
vérification SPF/DKIM/DMARC, politique complète de conservation, récupération
des clés, courriels de notification, répertoire fédéré. Ne pas annoncer ces
fonctions comme disponibles. Les tests utilisent des messages synthétiques.

## Correctif FBF et exploitation

Le premier déploiement a révélé que Node quittait en mode systemd lorsqu'il
était lancé via current/server.mjs (lien symbolique). La correction compare
les chemins réels. L'installateur vérifie maintenant l'unité systemd, son
MainPID puis le HTTP de santé : un vieux processus de test ne peut plus
donner un faux succès. La nouvelle version garde la DB persistante et ajoute
les tables de registre sans destruction du schéma antérieur.

La recette publique doit être validée sur https://services.acorsica.org/3code,
avec le bon titre HTML, la réponse health campaigns-mvp-v2, la régression
des routes KYS existantes et le même code SHA que celui du commit.
L'existence d'un HTTP 200 ne démontre pas à elle seule la disponibilité
durable : vérifier le service, l'écoute, le redémarrage et la persistance.

## Incrément générique multi-campagnes — 20 novembre 2026 (source, non encore déployé)

### Références singulières et administration

- Un code humain `3XX-XXX-XXX` peut avoir plusieurs associations et ne prouve ni identité, ni propriété.
- `3C1:<campaign_uuid>:<3code>:<copy_uuid>` est une référence publique structurée, strictement parsable et non chiffrée. Le `copy_uuid` résout l'ambiguïté même à l'intérieur d'une campagne. `GET /3code/api/references/parse?ref=...` vérifie une déclaration locale existante et renvoie un lien vers l'exemplaire. La fédération n'est pas démontrée.
- Une campagne a `title`, `goal`, `description`, `status`, `revision`, `updated_at` et une clé privée de gestion ; `PATCH /3code/api/campaigns/:uuid` exige `x-management-token` et `expected_revision`. Modification obsolète : HTTP 409. Activation initiale séparée, suspension/reprise et clôture prévues ; une campagne suspendue ou clôturée ne peut plus créer de copies.
- Une campagne de recherche de présentations présidentielles peut être initialisée à partir d'un **gabarit générique neutre** dans l'interface. Cela n'établit ni investiture, ni identité du candidat, ni droit à bénéficier gratuitement d'un service électoral.

### Progression de campagne et protection des données

- `GET /3code/api/campaigns/:uuid/progress` renvoie les derniers agrégats déclarés : `contact`, `interest`, `promise`, `form_sent`, `officially_received`, `validated`.
- `POST` sur le même chemin nécessite la clé de gestion et accepte `{stage,count,evidence_url?}` ; `evidence_url` doit être HTTPS. L'historique est conservé dans `campaign_progress_events`, sans fichier nominatif de citoyens ni d'élus.
- **Invariants :** toute valeur est une **déclaration de l'organisateur**, y compris `validated`, jamais une attestation officielle du Conseil constitutionnel. L'absence de valeur signifie `UNKNOWN`, pas zéro. Contact ≠ intérêt ≠ promesse ≠ formulaire transmis ≠ présentation officiellement reçue ≠ présentation validée. Le nombre déclaré ne prouve aucun effet politique.
- En contexte électoral, la collecte de coordonnées, de positions politiques ou de mandats nécessite des garanties propres et n'est **pas** implémentée par ce tableau d'agrégats.

### Tracts singuliers, PDF et future file Cogentia

- `/3code/print?copy_id=<uuid>` charge l'exemplaire et sa campagne, insère code 3Code et référence `3C1`, puis pointe le QR **vers l'URL individuelle de l'exemplaire**. La fonction du navigateur « Imprimer / enregistrer en PDF » produit le fichier localement, sans enregistrer les données du lecteur.
- Une photocopie du PDF **ne crée pas** de nouvelle identité : il faut créer un nouvel exemplaire et un nouveau QR pour obtenir une filiation distincte.
- La page propose seulement un **lien facultatif** vers `/waitlist?source=3code` pour le pilote des Cogentia Twins. Elle ne transmet automatiquement ni adresse email, ni code, ni candidature, ni données de contribution. L'inscription à la file n'est pas encore ouverte sur la projection publique KYS vérifiée le 20 novembre.
- L'enregistrement par **courriel reçu** reste distinct : le service accepte les challenges d'exemplaires via `3code@acorsica.org` en production depuis le 20 novembre, mais **l'adaptateur de collecte automatique des emails et l'envoi des PDF en réponse ne sont pas implémentés**. Aucun email n'est émis par le service.

### Déploiement et conformité (bloquants séparés)

Cet incrément se trouve dans **les sources de travail** du dépôt sur Fracta2 ; ni la base de production, ni l'unité systemd, ni l'URL publique n'ont été modifiées par sa conception et sa recette en local. L'installation publique suppose un déploiement versionné, la vérification de la persistance et un redémarrage autorisé.

La mise à disposition gratuite de prestations individualisées à des candidats par une association ordinaire n'est pas assimilable automatiquement à un commun non partisan : vérification du financement électoral nécessaire avant de lancer une campagne réelle. Voir [CNCCFP — associations et financement](https://cnccfp.fr/faq/les-associations-peuvent-elles-participer-au-financement-dune-campagne-electorale/) et [CNIL — fichiers politiques](https://www.cnil.fr/fr/les-fichiers-de-communication-politique).

**Recette 20 novembre :** `npm test` : 25/25 PASS, dont migrations compatibles avec la base d'avant cet incrément, isolation des campagnes, cycle de vie, collision, parseur `3C1`, écriture protégée et agrégats. Test synthétique avec Chromium sur serveur localhost : chargement du tract et de sa référence, export PDF A4 d'une page. Limite de cette recette locale : l'API QR n'autorise que l'origine HTTPS canonique `services.acorsica.org` ; les QR pointant vers localhost ne doivent pas être considérés comme validés en déploiement public.

**Suite :** test en préproduction du QR canonique, modération/révocation des déclarations d'exemplaires, vérification comptable et confidentialité pour campagnes électorales, traitement supervisé des courriels, attribution des Twins via une file explicitement consentie.

## Rectification et révocation des exemplaires — second incrément du 20 novembre 2026

- Migration additive de `copies` : `status` (`declared` ou `revoked`), `revision`, `updated_at`, avec conservation des anciens `copy_id` et secrets.
- `PATCH /3code/api/copies/:id` : demande `expected_revision`, une clé de copie `x-copy-edit-token` **ou** la clé de gestion `x-management-token`. Rectification du titre ou révocation, sans changement du code ou de l'identité. Conflit : HTTP 409 ; révocation : HTTP 410 à la résolution du `3C1` et sur la fiche. Historique minimal de rectification et révocation dans `events`.
- Un exemplaire révoqué ne peut plus accepter de contributions ni de nouvelle demande d'enregistrement par courriel. La révocation d'une référence ne supprime pas l'historique de ses anciennes déclarations, ni les éventuels courriels déjà observés ; elle exclut cet exemplaire des nouveaux résultats résolvables.
- Les QR utilisent l'origine canonique `https://services.acorsica.org`, y compris lors de la création locale d'un PDF, afin d'éviter de produire un QR en `localhost`. Lors de la recette locale isolée, la génération d'un SVG QR pour une URL individuelle canonique a répondu avec succès.
- Les copies n'obtiennent pas d'identité supplémentaire lors d'une photocopie du même document. Les publications et suivis demeurent déclaratifs et distincts des présentations électorales officielles.

Tests : `npm test` 26/26 PASS, y compris modification avec clé de copie, refus sans autorité, conflit de révision, révocation avec clé de campagne et blocage de résolution, contributions et enregistrement par courriel après révocation. Cette implémentation reste un source d'application, sans activation de campagne réelle ni envoi automatique.

## Parcours du visiteur — refonte du 20 novembre 2026

La première page présente des intentions compréhensibles sans connaissance
préalable du Corpus : « Je veux participer », « J’ai reçu un document »,
« Je veux organiser une action ». Elle ne commence plus par un glossaire
3Code, Crockford, registrar, fork, Bouteilles à la Mer ou Twin.

- Participant : choisit une initiative ouverte, la découvre, prépare un
  document doté automatiquement d'un numéro et d'un QR code, puis utilise
  « Imprimer ou enregistrer en PDF » depuis son navigateur.
- Lecteur : saisit le numéro trouvé sur un document ou scanne son QR, puis
  découvre l'initiative correspondante et peut proposer un message sans compte.
- Organisateur : crée et prépare son initiative, conserve une clé de gestion,
  décide de l'ouvrir, publie des actions et des données agrégées.
- Informations avancées : enregistrement facultatif par courriel, clés,
  identifiants techniques, numéros indépendants et assistant personnel futur,
  placés dans des sections repliées.

L'interface montre explicitement l'état vide lorsqu'aucune initiative n'est
ouverte : aucun candidat fictif n'est proposé. Les présentations présidentielles
officielles restent distinctes des contributions et engagements citoyens.

Recette : navigateur Chromium facultatif (test/visitor-journey.test.mjs,
sauté lorsque Chromium est absent), et tests API existants. Les tests utilisent
une base locale temporaire sans modifier les données publiques.
