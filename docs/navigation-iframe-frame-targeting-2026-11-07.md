---
title: "Navigation Assistant — ciblage générique d'iframes et formulaire bancaire"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.2"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "technical-note"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# Iframes : preuve de capacité et frontière de confidentialité

**Correction d'architecture (même jour, FBF) :** la proposition ci-dessous d'ajouter `page.frames.list` et un ciblage CDP dédié dans `browser-extension/background.js` **est abandonnée et remplacée** par la doctrine décrite dans [Navigation : bibliothèque JS stable et exécution gouvernée](../research/integration/navigation_stable_eval_library_fbf_2026-11-07.md). Elle est conservée comme historique du détour et non comme instruction de déploiement. Le code de l'extension et de la passerelle est revenu à l'état pré-changement ; les recettes sont désormais dans la bibliothèque Core. Aucun rechargement de l'extension 1.0.18 n'est nécessaire pour les recettes ordinaires.



## Besoin concret

Deux notifications de La Banque Postale, datées des 4 et 5 novembre 2026, annoncent des messages consultables via Contacts → Messages de l'espace client. L'onglet ouvert dans le navigateur hébergé se trouve sur une page de connexion ; l'identifiant paraît être dans une iframe. **Le contenu du courrier bancaire n'a pas encore été récupéré.** Ne pas stocker dans GitHub les URL privées de connexion, données bancaires ou identifiants.

## Nouvel invariant technique

Un champ de formulaire dans une iframe ne doit jamais être ciblé par **son seul index dans le document principal**. Réutiliser la primitive générique `page.form.fill` avec deux paramètres optionnels associés : `frame_id` et `expected_frame_origin`, explicitement sélectionnés depuis la structure des frames. Ne pas multiplier les RPC métier propres à une banque.

- `page.frames.list` : nouvelle primitive de protocole dans l'extension (CDP `Page.getFrameTree`), produit uniquement un identifiant opaque, l'origine HTTP(S), le parent et la profondeur de chaque frame ; ni URL complète, ni query string, ni corps, ni valeur de champ.
- `browser.hosted.inspect(action=frames,tab_id=...)` : façade sémantique de lecture, cible explicitement l'onglet puis vérifie sa page attendue. Tout appel reste sous contrôle COP et journal.
- `browser.form.fill` avec `frame_id` et `expected_frame_origin` : sélection précise par `Page.createIsolatedWorld` et `Runtime.evaluate(contextId=...)`, contrôle d'identité de frame avant et après le focus, puis `Input.insertText`, sans soumission automatique. L'absence de contexte dans un OOPIF entraîne un **refus explicite**, jamais une saisie dans la frame principale par défaut.
- Ce remplissage demeure **exclusivement non secret**. `autocomplete=username` rejoint les exclusions `password`, OTP et carte bancaire ; un identifiant bancaire exige la capacité distincte `credential.fill` reliée à un coffre local et à un chemin protégé de saisie. La session, le mot de passe, l'OTP et les valeurs bancaires ne doivent pas transiter dans les arguments, logs ou traces du modèle.

## Recette et limites

Les tests de la projection CDP et des échanges de la passerelle (simulés) passent. **Ces tests ne prouvent pas encore la compatibilité avec une iframe cross-origin/OOPIF réelle.** La création d'un contexte isolé peut échouer dans un processus de rendu distinct : il faudra alors un protocole générique adapté aux sessions CDP attachées, sous contrôle de version et d'origine. Le système en production doit installer/recharger une version réellement construite et testée de l'extension avant que `page.frames.list` soit callable ; pas de déploiement automatique ou de changement de session bancaire pendant le test source.

La voie COP de lecture `cogentia_john_run(browser.hosted.inspect)` a renvoyé `canonical_execution_receipt_unconfirmed` lors des essais du 7 novembre (y compris `action=tabs`), **sans observation exploitable**. Ne pas répéter indéfiniment ces appels. Le diagnostic et la validation du reçu sont distincts du chantier de frame.

**Prochaine recette minimale :** iframe fictive cross-origin (sans authentification), découverte des frame IDs et origines par le protocole gouverné ; insertion d'un texte de test non secret, sans submit ; contrôle visuel et reçu redigé. Ensuite seulement, étudier `credential.lookup/fill` ciblant une frame, puis consultation du courrier bancaire en session personnellement authentifiée et copie fidèle dans Gmail, sans SMTP.

## Travaux connexes préservés

- Yahoo → Gmail : `docs/yahoo-gmail-sync.md`, collecteur `scripts/ops/mail-sync/yahoo-to-gmail.py`, non déployé tant que les secrets IMAP et le test réel manquent.
- Calculette : #233 et #241–245 ; MCP Apps de lecture de la file durable (continuations actives, bloquées, en attente) à traiter après la récupération bancaire. Pas de deuxième registre ni d'autorisations implicites.
