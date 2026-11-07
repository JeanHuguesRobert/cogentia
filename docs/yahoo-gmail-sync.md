---
title: "Yahoo → Gmail : collecteur IMAP privé, minimal et sans Supabase"
author: Institut Mariani / C.O.R.S.I.C.A.
affiliation: "Institut Mariani / C.O.R.S.I.C.A., Corte, Corsica"
license: CC BY-SA 4.0
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: '2026-11-07'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
status: working-paper
version: '0.2'
date: '2026-11-07'
last_modified_at: '2026-11-07'
language: fr
visibility: public
document_role: operational
document_kind: runbook
update_policy: UP-DEFAULT-REVIEWED
---

# Yahoo → Gmail : collecteur IMAP privé

**Finalité :** rendre visibles dans `jeanhuguesrobert@gmail.com` les nouveaux messages reçus par `jean_hugues_robert@yahoo.com`, sans Yahoo Mail Plus, sans Supabase, sans gestionnaire de dossiers d'interactions et sans émission SMTP. Le message est copié dans la boîte Gmail par `IMAP APPEND` ; il **reste intact dans Yahoo**. Aucune suppression, aucun changement du statut « lu » (`BODY.PEEK[]`), aucun transfert SMTP, aucune réponse à un tiers.

## Configuration initiale sur Fracta2

Le collecteur (`scripts/ops/mail-sync/yahoo-to-gmail.py`) utilise uniquement la bibliothèque Python standard. Les identifiants doivent être deux **mots de passe d'application distincts** (ou un équivalent de connexion IMAP spécifiquement habilité) et rester hors du dépôt, de Supabase et de la conversation. Yahoo documente `imap.mail.yahoo.com:993` et la création d'un mot de passe d'application ; Google requiert un accès IMAP compatible avec les paramètres de sécurité du compte Gmail. Le script n'utilise jamais les mots de passe de compte principal dans les logs.

Le fichier privé `~/.config/cogentia/yahoo-gmail-sync.env` contient uniquement des **chemins de fichiers** (aucune valeur secrète) :

```ini
YAHOO_IMAP_USER=jean_hugues_robert@yahoo.com
GMAIL_IMAP_USER=jeanhuguesrobert@gmail.com
YAHOO_IMAP_PASSWORD_FILE=/chemin/prive/yahoo-imap-app-password
GMAIL_IMAP_PASSWORD_FILE=/chemin/prive/gmail-imap-app-password
```

Les deux fichiers de mots de passe doivent avoir des permissions strictes (`0600`), leur répertoire privé `0700`, et appartenir au compte Unix exécutant le collecteur. Ne pas les communiquer au modèle ni les passer en argument. Le compte Yahoo doit réellement permettre la génération d'un mot de passe d'application : si l'authentification est refusée, **arrêter**, ne pas contourner son contrôle de sécurité.

Unités `systemd --user` fournies dans `deploy/systemd/user/`. Après configuration **effective et test manuel réussi**, les installer dans `~/.config/systemd/user/`, exécuter `systemctl --user daemon-reload` puis `systemctl --user enable --now cogentia-yahoo-gmail-sync.timer`. Le timer se déclenche approximativement toutes les dix minutes. Un service `oneshot` évite les collecteurs persistants et empêche un second lancement du même service pendant le premier. Les journaux ne rapportent que `status`, `imported`, `already_recorded` et des codes d'erreur prédéfinis, jamais les messages.

Le **premier lancement crée un point de départ** correspondant aux messages déjà présents dans Yahoo. Il ne les importe pas : seules les futures arrivées sont collectées. Si une reprise historique est voulue, **uniquement au premier lancement**, fournir explicitement `--include-existing`, idéalement en une série de lots. Une UIDVALIDITY Yahoo modifiée déclenche un arrêt de sécurité et exige un diagnostic de reprise plutôt qu'un import global silencieux.

## État minimal et idempotence

Dans `~/.local/state/cogentia/yahoo-gmail-sync.sqlite` (privé), on ne conserve que `(compte source, UIDVALIDITY, UID)` des messages déjà importés et un unique point de départ. **Aucun corps, adresse de correspondant, objet, pièce jointe, identifiant bancaire ou copie de message** n'est stocké dans cet état. C'est un simple index local technique, pas un registre Supabase.

Avant `APPEND`, une recherche Gmail du marqueur technique `X-Cogentia-Yahoo-Import-Id` (hachage déterministe du compte + UIDVALIDITY + UID, sans divulguer le nom de l'expéditeur) limite le risque de doublon après une interruption située entre l'import distant et l'écriture de l'état local. L'original MIME est conservé à l'exception de cet en-tête technique supplémentaire. **L'exactement-une-fois interserveur n'est pas démontré** ; il faudra le mesurer avec deux boîtes de test avant activation personnelle. L'import dans Gmail n'est pas un acte de correspondance sortante mais reste une modification de boîte soumise à l'autorisation du Principal.

## Tests préalables et datation de la rupture (7 novembre 2026)

**Fracta2, sans identifiants :** connexion TCP/TLS sur `imap.mail.yahoo.com:993` et `imap.gmail.com:993` établie, certificats valides et bannières IMAP reçues. Quatre tests unitaires et simulés du collecteur réussis, comprenant initialisation sans archive, collecte d'un nouveau message, répétition sans doublon et refus sans secret. Aucun message réel, login ou transfert n'a été effectué. Les credentials sont absents de l'environnement disponible ; ne pas activer le timer à ce stade.

**Chronologie vérifiée par en-têtes Gmail** (le contenu n'est pas nécessaire au diagnostic) : Yahoo annonçait la suppression du transfert automatique gratuit au **1er janvier 2021** ([Le Monde Informatique, 5/11/2020](https://www.lemondeinformatique.fr/actualites/lire-yahoo-mail-va-faire-payer-le-transfert-automatique-des-mails-80939.html) ; [Next, 6/11/2020](https://next.ink/brief_article/yahoo-mail-le-transfert-automatique-des-emails-va-etre-desactive-pour-les-comptes-gratuits/)). Pourtant plusieurs messages adressés à `jean_hugues_robert@yahoo.com` ont été reçus par Gmail **via les relais sortants Yahoo**, de façon constatée les 30 décembre 2021, 31 décembre 2023, 6, 8, 10, 11 et **12 février 2024**. Le message du 12 février, en provenance de Microsoft, possède un en-tête `Received` explicitant une livraison de `sonic319-21.consmr.mail.ne1.yahoo.com` vers `mx.google.com` pour `jeanhuguesrobert@gmail.com` : preuve d'un **relais Yahoo→Gmail effectif**, non d'un simple champ `To` Yahoo. C'est le **dernier relais Yahoo identifié dans les échantillons examinés**, pas la preuve qu'aucun autre relais n'a eu lieu après.

À partir du **22 février 2024**, les notifications GitHub trouvées dans Gmail avec `To: jean_hugues_robert@yahoo.com` ont un parcours `out-*.smtp.github.com → mx.google.com` **sans Yahoo**, y compris en 2025 et 2026 ; elles ne démontrent donc pas que le transfert Yahoo était encore actif. Des messages contenant l'adresse Yahoo en champ destinataire ou mention textuelle ne constituent pas une preuve de transport. La date personnelle d'interruption se situe plausiblement **aux alentours de février 2024**, mais elle ne peut être fixée exactement sans comparer les messages présents exclusivement dans la boîte Yahoo et les journaux de réception Gmail. Ne pas attribuer avec certitude cette coupure de 2024 à l'annonce commerciale de 2021 ; un autre mécanisme de collecte ou une configuration transitoire peut expliquer ce décalage.

**Décision de périmètre :** exclusivement les messages arrivant dans Yahoo **après le premier démarrage**, jamais d'import massif de 2024–2026 par défaut. Le code initialise un seuil UID au premier démarrage ; ne jamais ajouter `--include-existing` pour cette installation sans demande spécifique. Le petit état local est suffisant : **aucune écriture Supabase par message**. Cette politique évite un coût disproportionné sans compromettre la fonction voulue.

## Reality Test et limitations

- Test de bibliothèque sans secrets : `python3 scripts/ops/mail-sync/test-yahoo-to-gmail.py`.
- Sans fichiers de secrets, l'exécution doit refuser avec `CREDENTIAL_FILE_MISSING` **avant** toute connexion ou écriture d'état.
- Vérifier ensuite sur messages non sensibles et comptes explicitement contrôlés : arrivée Yahoo → copie Gmail, rerun sans doublons, message inchangé sur Yahoo, original avec pièces jointes et encodage, dossier Gmail, re-démarrage entre `APPEND` et écriture SQLite, durée et volumes.
- **Non déployé/actif par défaut :** les identifiants IMAP ne sont pas présents sur Fracta2 lors de l'audit, les unités timer ne sont pas activées. Les boîtes personnelles n'ont donc pas été touchées.
- Le collecteur surveille uniquement `INBOX`, et non les autres dossiers Yahoo. Les règles de filtrage ou messages arrivant directement dans un autre dossier nécessitent un choix explicite.

Sources officielles : [Yahoo — paramètres IMAP](https://in.help.yahoo.com/kb/SLN4075.html), [Yahoo — mots de passe d'application](https://in.help.yahoo.com/kb/new-mail-for-desktop/password-sln15241.html), [Gmail — protocole IMAP](https://developers.google.com/workspace/gmail/imap/imap-extensions).
