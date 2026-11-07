---
title: "COP — évaluation proportionnée du risque et décision A/B/C"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-07"
last_modified_at: "2026-11-07"
version: "0.1"
status: "working-paper"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "technical-note"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "research/measured_risk.md"
  - "research/integration/proportionate_privileged_maintenance_2026-11-07.md"
  - "docs/mcp-super-mandate-amendment-fbf-2026-11-07.md"
  - "research/integration/fractanet_principal_trust_2026-11-05.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-07"
review:
  status: "unreviewed"
---

# COP — avis de risque proportionné à la valeur

## Périmètre implémenté

`scripts/lib/proportionate-risk.js` exporte `assessProportionateRisk` : une fonction déterministe donnant un avis structuré de contrôle A/B/C fondé sur l'objectif, le gain attendu, l'exposition, la récupération indépendante, la perte durable de capacité, la possibilité de ruine, l'incertitude Black Swan, les engagements envers les tiers et les changements critiques du contrôle. Le gain ne lève jamais un risque de ruine ni les droits d'autrui. L'absence de faits requis conduit au niveau C par précaution, sans prétendre que la catastrophe est avérée.

`cogentia_risk_assess` est un outil MCP de **lecture seule** sur cette fonction. Les réponses incluent `advisory_only=true`, `grants_authority=false`. Le branchement facultatif `risk_assessment` de `assessPresumedEffect` dans `side-effect-authorization.js` ne fait que *renforcer* les refus de contrôle ; il ne crée ni mandat, ni grant, ni privilège.

Tests :

```sh
node --test scripts/lib/proportionate-risk.test.js scripts/lib/side-effect-authorization-285.test.js
node scripts/check-mcp-risk-assess.js
node scripts/check-mcp-dual-era.js
```

Les smokes sont enregistrés parmi les résultats du superviseur FBF de CI. **Attention** : un champ `recovery=verified` transmis par un agent reste une assertion non vérifiée ; aucun mécanisme d'autorisation ne peut en déduire seul que la récupération est réellement possible. L'évaluation vise à expliquer la décision, non à certifier ses prémisses.

## Prochaine tranche : contrôles vérifiés et confirmation légère

1. **Preuves d'exposition** : relier les champs du verdict aux identifiants stables du Corpus, aux reçus COP, à la santé systemd et à un moyen de récupération indépendant testé. Les données issues d'un modèle ne doivent pas être leur propre certification.
2. **Qualification d'un acte** : attribuer A seulement à un acte déjà mandaté, autorisé et récupérable ; B lorsque la maintenance est bornée mais exige une confirmation humaine ; C pour l'exceptionnel et les engagements hors bande. Une crise *break-glass* conserve son canal séparé.
3. **Émetteur Principal protégé** : utiliser les primitives de challenge et l'authentification existantes, avec l'identité réelle et la présence humaine vérifiées en dehors du modèle et du MCP partagé. Une opération B reçoit alors une confirmation unique, liée au hash exact, à usage unique ; pas de signature ThinkPad systématique après l'enrôlement initial.
4. **Issuer / COP / broker** : inscrire mandat/version, budget réservé, grant d'effet canonique dans un registre protégé indépendant du compte `ubuntu` et du code de l'agent ; transmettre son identifiant au courtier `super`. Ne jamais élargir l'allowlist `mcp_jhn_attested_mutate` ; ne jamais autoriser du shell root générique par simple jugement de risque.
5. **Recette de disponibilité** : redémarrage de `mcp-cogentia.service` à la révision Git contrôlée, inspection des outils et de leur schéma, vérification de `cogentia_mcp_apps_demo` et `cogentia_risk_assess`, puis rechargement manuel des plugins ChatGPT. Vérifier le reçu et les capacités après, puis réconcilier COP.

Le mécanisme d'enrôlement et la chaîne de grant privilégié **ne sont pas implémentés par ce lot**. Les smokes locaux n'établissent pas la fonctionnalité du serveur déjà en cours d'exécution. Ne solliciter le Principal pour une éventuelle commande unique sur ThinkPad qu'après préparation et contrôle de son installateur.
