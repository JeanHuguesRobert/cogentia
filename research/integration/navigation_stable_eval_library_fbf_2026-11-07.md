---
title: "FBF Navigation — bibliothèque JavaScript, extension stable et COP en amont"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.1"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "architecture-note"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# FBF : ne plus mettre les recettes dans l'extension

La correction du Principal est déterminante : le travail de navigation assistée repose sur **une bibliothèque JavaScript enrichie du côté Core**, envoyée comme programme à la primitive générique déjà installée `page.evaluate`. L'extension transmet et exécute ; elle n'est pas l'emplacement de nos programmes métier, recettes de formulaires ni décisions de permission. Le COP authentifie le mandataire, vérifie la portée de sa délégation, les contraintes de confidentialité, les risques de l'effet et son budget **avant** la demande d'exécution. Les reçus et le rapprochement du budget viennent **après**.

## Correction source

- `browser-extension/background.js` et `form-field-focus.js` : **retour au contenu précédant le commit `39be39c`**, sans changer la version installée `1.0.18`. `page.frames.list` et la logique spéciale de frame de `page.form.fill` sont retirés. `scripts/ops/navigation-assistant-gateway.js` redevient le relai générique existant. Aucune réinstallation/recharge Chromium.
- `scripts/lib/browser-form-script.js` : le programme compilé peut maintenant trouver une iframe par position et origine attendue, et y remplir un champ ordinaire **si le DOM est accessible dans la même origine**. Toujours aucun script métier dans l'extension, ni submit automatique, ni secret. L'insertion `execCommand` reste une recette expérimentale, pas une compatibilité universelle.
- `browser.hosted.inspect(action=frames)` : bibliothèque JS exécutée via `page.evaluate`, retourne une projection **DOM** (positions et origines des iframes, non les IDs CDP). Ne pas lui attribuer une authentification de l'iframe ni des garanties de sélection qu'elle ne fournit pas.
- `scripts/lib/browser-frame-evaluate.js` : **candidat générique côté Core** pour les iframes d'origine distincte, fondé sur les primitives CDP `Page.getFrameTree`, `Page.createIsolatedWorld`, `Runtime.evaluate`. Le programme est lui aussi fourni dynamiquement. Cette capacité ne se réduit pas à `page.evaluate` dans le *document parent* : les barrières *same-origin* interdisent d'y traverser une iframe bancaire. Le transport vers le contexte de frame nécessite une adaptation générique de l'adaptateur CDP, **sans code métier dans l'extension**. Le module est pour l'instant une bibliothèque testée avec un transport injecté, **pas un chemin live/autorisé vers le navigateur personnel**.
- Les anciens modules de projection/validation de frames sont déplacés sous `scripts/lib/` ; ils ne sont plus importés par l'extension. Les tests de passerelle utilisent uniquement l'ancien protocole `page.evaluate`.

## Ce qui autorise et ce qui ne l'autorise pas

Le code arbitraire fourni par un agent n'est pas présumé sûr simplement parce qu'il est JavaScript. Ce n'est pas au *service worker* d'analyser chaque recette métier ; c'est au COP de gouverner la **capacité sémantique effective**, l'instance de navigateur, l'onglet, l'origine, les effets permis, le mandataire et le budget, avec traces et rendu de compte. `page.evaluate` est un transport technique, pas une autorisation générale d'effectuer des paiements, des actions bancaires, des communications ou d'extraire des secrets. Les scripts non-secrets peuvent passer par le protocole actuel ; l'identifiant, le mot de passe et les codes bancaires doivent utiliser un canal de secrets distinct (« vault → contexte navigateur »), non visible du LLM et non loggé comme source JavaScript.

La délégation et le contrôle des effets demeurent en amont ; l'agent peut choisir et réviser les scripts dans son mandat sans redemander des permissions pour chaque petite évolution technique. Une extension ne doit évoluer que pour une **lacune universelle du transport**, pas pour un nouveau site, un nouvel iframe ou une nouvelle recette.

## Acceptation et état

- Tests de bibliothèque, de composition et de transport simulé en succès, plus Reality Test CDP dans un Chromium isolé (iframe de deux origines) effectué précédemment.
- **Aucun test d'injection en production dans l'iframe bancaire**, ni adaptation finale du transport multi-contextes live. L'iframe de La Banque Postale reste d'origine distincte ; ne pas feindre que le JavaScript du parent y accède.
- Aucun déploiement, rechargement ou modification de secrets.
- Le COP de lecture est effectivement utilisable avec des paramètres complets ; le correctif de l'ergonomie de ses erreurs existe sur `main` mais demande son déploiement distinct.

**Réalisation ultérieure du même jour :** l’adaptateur générique Core et la recette Chromium/OOPIF sont désormais implémentés et vérifiés sur pages fictives. Voir [Reality Test OOPIF](governed_generic_oopif_adapter_2026-11-07.md). L’extension et la passerelle demeurent inchangées ; le Core n’est pas encore déployé.

**Suite FBF minimale :** brancher le transport CDP générique au dispatch sémantique `browser` déjà mandaté, en conservant l'admission et la comptabilité COP ; valider sur iframe fictive, puis sur le site bancaire exclusivement pour une inspection redigée et des actions explicitement autorisées. Ne pas reprendre l'ajout de RPC métier à l'extension.
