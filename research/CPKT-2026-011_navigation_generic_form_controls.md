---
packet_id: CPKT-2026-011
packet_kind: cognitive-packet/v0.1
packet_version: 1
title: "CPKT-2026-011 — Navigation Assistant : champs riches et fichiers"
created: "2026-11-22"
date: "2026-11-22"
last_modified_at: "2026-11-23"
status: working-paper
packet_status: "Release bundle verified; privileged service activation pending owner action"
lifecycle_state: working
visibility: public
language: fr
author: "Agent John / Ubikia pour Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
license: CC BY-SA 4.0
home_of_record: "JeanHuguesRobert/cogentia — Navigation Assistant"
carrier: "GitHub public : source et preuves de validation, sans cookies, secrets ni données privées"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/CPKT-2026-011_navigation_generic_form_controls.md"
document_role: operational
document_kind: cognitive-packet-handoff
update_policy: UP-DEFAULT-REVIEWED
review:
  status: unreviewed
  reviewed_by: []
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-22 — retour d'expérience publication La Marche du Soleil sur YouTube"
  origin_date: "2026-11-22"
  derived_from:
    - docs/navigation-assistant.md
    - scripts/lib/hosted-browser-capabilities.js
    - scripts/lib/browser-frame-cdp-transport.js
related_documents:
  - skills/hosted-browser-fracta/SKILL.md
  - docs/navigation-assistant.md
  - https://youtu.be/zWxGO7Vh1s4
---

# CPKT-2026-011 — Navigation Assistant : deux opérations générales

## Origine et mandat

Après la publication de « La Marche du Soleil » en vidéo sur YouTube le 22 novembre 2026,
le Principal demande que les manipulations ponctuelles de CDP deviennent deux
capacités réutilisables du Navigation Assistant. **Ce mandat porte sur le code
et sa validation, non sur un nouvel envoi à une plateforme tierce.**

## Opération A — Édition de champs riches

Le transport général existe : l'extension accepte 'page.evaluate' pour une
recette compilée par le Core. Le défaut était dans le contrat
'browser.form.fill' : l'implémentation ne savait remplacer que INPUT/TEXTAREA.
Le nouvel argument explicite 'field_kind: contenteditable' autorise la sélection
intégrale d'un champ '[contenteditable=true]' repéré par index stable, puis
'insertText' via l'édition du document. Le retour vérifie le texte final.
Les champs ordinaires continuent d'utiliser le transport antérieur. Le
contrat COP 'form assistance' n'est élargi qu'à cette variante non secrète,
sans changer le mandat lui-même.

## Opération B — Choix d'un fichier

Le Core dispose déjà d'un transport CDP attaché à un onglet identifié :
tab-ID et URL exacte, preuve d'identité du CDP target et lease de tab.
Le nouveau 'browser.form.upload' sélectionne un fichier local avec
'DOM.setFileInputFiles' sur le numéro du champ 'input[type=file]'.
Le fichier doit être régulier, non vide, sous 300 MiB et strictement situé
dans des racines locales autorisées ('COGENTIA_BROWSER_UPLOAD_ROOTS',
ou configuration explicite de la capacité). Les liens symboliques sortants
sont rejetés. Le compte rendu ne contient ni chemin ni contenu du fichier.

La sélection peut déclencher immédiatement un téléversement HTTP par
l'application web. Le risque est donc classé **external_write**, et une
autorisation COP distincte est nécessaire avant l'appel. **Aucun mandat
'existant browser.form.fill' n'est réinterprété pour autoriser ce nouvel effet.**
La sélection n'est jamais présentée comme « vidéo publiée » : elle reste
'upload_completion: unverified'.

## Implémentation minimale (sans changement d'extension)

- 'scripts/lib/browser-form-script.js' : recette compilée contenteditable.
- 'scripts/lib/hosted-browser-capabilities.js' : variante rich text et
  catalogue de la nouvelle capacité de fichier.
- 'scripts/lib/browser-file-upload.js' : politique de chemins, sélection CDP.
- 'scripts/lib/john-cop-form-execution.js' : forme d'entrée du mandat
  bounded form, sans élargissement aux fichiers.
- 'scripts/lib/john-run.js' : rédaction du chemin de fichier dans les événements.
- 'scripts/lib/browser-contenteditable.test.js' et
  'scripts/lib/browser-file-upload.test.js' : tests unitaires et transport.
- 'docs/navigation-assistant.md' et
  'skills/hosted-browser-fracta/SKILL.md' : mode d'emploi au niveau du Core.

## Preuves (22 novembre 2026)

1. Suite Node : neuf tests ciblés au vert, incluant le contrat COP de saisie
   non secrète, le chemin natif existant, le traitement des iframes, les
   chemins/symlinks de fichiers et les reçus sans données sensibles.
2. Reality Test Fracta2, Chromium hébergé : onglet temporaire inactif sur
   https://example.org/, champ créé localement en JavaScript et remplacé
   en une seule invocation du nouveau 'browser.form.fill'. Texte final exact,
   aucun formulaire soumis ; onglet de test fermé.
3. Reality Test CDP fichier : second onglet temporaire inactif, champ
   input[type=file] de démonstration, sélection d'un fichier temporaire texte.
   'files.length=1', taille 53 octets, événement change observé, aucune
   requête de publication ou formulaire soumis ; onglet et fichier supprimés.
4. Fichier source audio/vidéo de l'article précédent : **aucune nouvelle
   télétransmission ni publication** dans le cadre de ces tests.

## Frontière à reprendre au prochain Hop

**Code source validé ≠ déploiement.** Confirmer que le service Agent John a
chargé le bon commit, que le navigateur hébergé et celui du ThinkPad présentent
les versions attendues et que l'autorité COP est disponible pour chaque effet.

- La saisie riche peut suivre le mandat canonique de saisie ordinaire, à
  condition que le client autorisé présente l'argument 'field_kind'.
- Le téléversement requiert une racine explicitement configurée dans
  l'environnement du Core et un mandat COP propre aux effets externes.
  Ne pas fabriquer cette autorité à partir du privilège technique CDP.
- Faire un test réel de bout en bout après déploiement et identifier
  précisément l'état source / chargé / autorisé / testé dans la suite.

**Terminaison attendue :** les deux capacités sont disponibles par les
interfaces standard de l'agent et non plus par un script CDP ponctuel,
avec reçu typé, protection contre les effets non autorisés et reprise
possible d'un travail interrompu.


## Reprise du 23 novembre 2026 — release vérifiée et activation système en attente

Le Principal a **expressément autorisé** le déploiement sur Fracta2 et le redémarrage contrôlé de `mcp-cogentia.service`.

Un **bundle autonome de code** est préparé hors du checkout WIP, sous :

`/srv/cogentia/releases/mcp-cogentia/cb3e3de52b6131556a2771fba6670e33e9b8dcbc/`

Il contient :

- `cogentia/` : extraction Git **cb3e3de52b6131556a2771fba6670e33e9b8dcbc** ; dépendances Node copiées dans ce bundle, distinctes du checkout WIP ;
- `inseme/` : extraction Git **f4fa82ed0f861f0f7035088109fc93390991a8a7** ; résolution des imports COP et scheduler réellement utilisés par le service ;
- `activate.sh` : script d'activation avec vérification de la révision, drop-in systemd réversible, redémarrage et contrôle de santé ;
- `rollback.sh` : retrait du seul drop-in spécifique et retour au service précédent.

**Tests réellement passés sur Fracta2 :** six tests ciblés `contenteditable`, `browser.form.upload` et porte COP ; tests de connexion Navigation Assistant et réception gouvernée ; démarrage isolé du serveur MCP depuis le *répertoire de la release* sur `127.0.0.1:18891`, avec son environnement d'import configuré, réponse de santé `ok:true`. Les processus de test sont arrêtés.

**Racine d'import déjà créée :** `/srv/cogentia/artifacts/browser-uploads`, propriétaire `ubuntu`, permissions `0700`. Les champs de fichier restent soumis à autorisation COP indépendante ; aucune publication sur un tiers n'a été tentée.

**Frontière constatée :** l'exécution privilégiée via le courtier Fracta2 a refusé l'effet (`cop_authorization_denied`) même après émission d'une préparation et d'un grant côté MCP. Aucune commande root ni modification systemd n'a été exécutée. Il ne faut pas contourner ce refus par un canal d'agent non gouverné. Le service de production reste attaché à `/srv/cogentia/repos/cogentia` avec son processus démarré le 21 novembre 2026.

**Une seule commande d'administration par le Principal, sur Fracta2 :**

```sh
sudo /bin/sh /srv/cogentia/releases/mcp-cogentia/cb3e3de52b6131556a2771fba6670e33e9b8dcbc/activate.sh
```

Ce script doit afficher `DEPLOY_VERIFIED=1` si la nouvelle version et le service sont corrects. Il installe uniquement `/etc/systemd/system/mcp-cogentia.service.d/98-cogentia-nav-release.conf`, définit `WorkingDirectory` et `ExecStart` sur cette release et `COGENTIA_BROWSER_UPLOAD_ROOTS` sur la racine préparée, conserve tous les autres drop-ins, et annule sa modification du service si le contrôle de santé échoue. La commande retour arrière est `sudo /bin/sh /srv/cogentia/releases/mcp-cogentia/cb3e3de52b6131556a2771fba6670e33e9b8dcbc/rollback.sh`.

**État factuel :** code publié et testé ; bundle prêt ; racine d'import prête ; configuration et redémarrage du service **non réalisés** ; test post-activation MCP **à effectuer après** la commande privilégiée. Le paquet ne peut pas être marqué terminé avant la vérification de l'effet réel.
