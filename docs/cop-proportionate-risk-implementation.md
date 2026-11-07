---
title: "COP — jugement nuancé du risque et projection pédagogique A/B/C"
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

## 7 novembre 2026 — Jugement continu, projection discrète

Le Principal précise que **A/B/C est une simplification explicative arbitraire** et non une ontologie du risque. Une continuation cognitive (éventuellement le même agent qui agit) peut et doit former une appréciation plus nuancée : A−, A+, B−, B+, B++, B↗ ou « frontière B/C » sont des *notations narratives*, jamais des permissions ou des valeurs probabilistes. La notation B++ ne devient pas C par simple arithmétique. Le degré d'attention recommandé dépend de l'enjeu, de l'incertitude, de l'historique des effets, de l'exposition cumulée, de la récupérabilité et du contexte, pas uniquement d'une catégorie.

La **doctrine** distingue (1) le jugement situé, révisable et motivé ; (2) la décision pratique (agir, rendre compte, obtenir confirmation, différer, refuser) ; (3) la projection A/B/C requise seulement par les mécanismes historiques. Le contrôle informatique est un garde-fou de base, pas un substitut au jugement ; inversement, le jugement de l'agent ne peut inventer un mandat, un budget ou une identité.

**Contrat logiciel compatible :** `assessProportionateRisk` accepte désormais `cognitive_judgment` facultatif : `position` (`low`, `middle`, `high`, `very_high`, `borderline`), `rationale` (motifs), `uncertainties` et `evidence_refs` facultatifs. Il renvoie `nuance.label` (`B++`, par exemple), `epistemic_status=agent_assessment_unverified`, `affects_authority=false` et `control_projection=coarse_pedagogical` ; l'ancien `control` A/B/C demeure inchangé. Aucun score numérique faussement objectif, aucune probabilité inventée et aucune nouvelle autorisation. Un jugement incohérent peut coexister avec un contrôle de base plus fort : le logiciel ne le laisse pas rétrograder une protection ; il doit être examiné et réconcilié comme toute appréciation contestée. Cette extension est descriptive, non une nouvelle échelle normative.

**Coopération responsable :** l'agent mandaté est abordé comme un collaborateur loyal, faillible, auquel on demande vigilance, transparence et traçabilité proportionnées. Les contrôles visent l'erreur, l'ambiguïté, les environnements défaillants et les dommages réels, et non la présomption que le modèle serait hostile. Rendre compte n'est pas demander permission. Les actes engageants envers des tiers restent réservés aux autorisations spécifiques applicables. Les incertitudes et les preuves sont tracées sans imposer au Principal la charge d'une micro-autorisation continue.

**Non réalisé dans ce lot :** une continuation qui collecte automatiquement les preuves et rédige le jugement situé ; une attestation d'un clic ChatGPT apte à autoriser effectivement B ; une modification des garde-fous de l'issuer root. Ne pas prétendre que les labels nuancés changent le contrôle opérationnel actuel.

## Prochaine tranche : contrôles vérifiés et confirmation légère

1. **Preuves d'exposition** : relier les champs du verdict aux identifiants stables du Corpus, aux reçus COP, à la santé systemd et à un moyen de récupération indépendant testé. Les données issues d'un modèle ne doivent pas être leur propre certification.
2. **Qualification d'un acte** : attribuer A seulement à un acte déjà mandaté, autorisé et récupérable ; B lorsque la maintenance est bornée mais exige une confirmation humaine ; C pour l'exceptionnel et les engagements hors bande. Une crise *break-glass* conserve son canal séparé.
3. **Émetteur Principal protégé** : utiliser les primitives de challenge et l'authentification existantes, avec l'identité réelle et la présence humaine vérifiées en dehors du modèle et du MCP partagé. Une opération B reçoit alors une confirmation unique, liée au hash exact, à usage unique ; pas de signature ThinkPad systématique après l'enrôlement initial.
4. **Issuer / COP / broker** : inscrire mandat/version, budget réservé, grant d'effet canonique dans un registre protégé indépendant du compte `ubuntu` et du code de l'agent ; transmettre son identifiant au courtier `super`. Ne jamais élargir l'allowlist `mcp_jhn_attested_mutate` ; ne jamais autoriser du shell root générique par simple jugement de risque.
5. **Recette de disponibilité** : redémarrage de `mcp-cogentia.service` à la révision Git contrôlée, inspection des outils et de leur schéma, vérification de `cogentia_mcp_apps_demo` et `cogentia_risk_assess`, puis rechargement manuel des plugins ChatGPT. Vérifier le reçu et les capacités après, puis réconcilier COP.

Le mécanisme d'enrôlement et la chaîne de grant privilégié **ne sont pas implémentés par ce lot**. Les smokes locaux n'établissent pas la fonctionnalité du serveur déjà en cours d'exécution. Ne solliciter le Principal pour une éventuelle commande unique sur ThinkPad qu'après préparation et contrôle de son installateur.
