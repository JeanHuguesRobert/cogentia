---
title: "Contributive Campaigns — 3Code and physical incarnations service"
language: en
date: 2026-11-18
last_modified_at: 2026-11-18
license: CC BY-SA 4.0
status: "MVP implementation — deployment evidence separate"
document_role: implementation
document_kind: application
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: derived
  origin_repository: JeanHuguesRobert/cogentia
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
   des messages et peut être consultée. La seule présence des MX Gandi sur
   acorsica.org ne démontre pas l'existence d'un alias ou d'une boîte.
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

**Non encore installé :** boîte dédiée, réception Gandi/IMAP automatisée,
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
