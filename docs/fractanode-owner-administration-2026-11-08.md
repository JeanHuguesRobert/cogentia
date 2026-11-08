---
title: "Administration d'un FractaNode : autorité du propriétaire et délégation aux agents"
author: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-08"
last_modified_at: "2026-11-08"
version: "1.0"
status: "active"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "architecture-decision"
visibility: "public"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_date: "2026-11-08"
review:
  status: "unreviewed"
---

# Autorité du propriétaire, plutôt qu'émission de mandats artificiels

## Décision

Le propriétaire de `fracta2` dispose déjà de son administration SSH et `sudo`. Lorsqu'il agit lui-même par ce canal, **aucun mandat COP, émission de grant, enrôlement d'une clé de signature supplémentaire, ni budget de redémarrage** n'est requis pour maintenir ses propres services. La couche d'émission de mandats de maintenance 48 h / 12 redémarrages est abandonnée : elle a produit une dépendance artificielle et une charge attentionnelle disproportionnée.

L'autorité administrative est établie dans le système d'exploitation par les identités et droits existants. La propriété réelle du nœud justifie la compétence du Principal pour ses décisions de maintenance ; elle **ne constitue pas une preuve cryptographique que n'importe quel appel MCP émane de lui**.

## Chemins opérationnels

- **Administration par le propriétaire :** SSH authentifié → `sudo systemctl ...` → vérification du service et de l'effet réel. Une seule opération compréhensible, avec journaux `systemd` et diagnostic d'application. Aucun nouvel issuer.
- **Développement ordinaire par agent :** outils disponibles dans leur rôle normal (`ubuntu`, dépôt Git, tests, publication source), sous le mandat général de travail existant. Aucun élargissement automatique aux privilèges root.
- **Délégation administrative à un agent :** une capacité technique dédiée avec identité d'appel et portée limitée, accordée par l'administration du nœud ; journaux d'effets. Le COP peut enregistrer actes et budgets mais n'est pas requis pour prouver à nouveau la propriété du serveur. Une session ChatGPT ou le seul accès au tunnel ne sont pas une identité administrateur.
- **Actions externes ou sensibles :** envoyer des courriels, engagements envers des tiers, secrets, finances, etc., sont des compétences distinctes. L'autorité sur `fracta2` n'étend pas ces permissions.

## Nettoyage et déploiement

Les entrées expérimentales du broker `enroll` et `restart_mcp`, les scripts `bootstrap-principal-thinkpad.ps1` et `prepare-maintenance-mandate.mjs` et les appels clients correspondants sont retirés **des sources**. Les tests doivent confirmer que ces entrées sont refusées. Les bibliothèques générales du courtier COP sont conservées tant que des chemins distincts en dépendent. Ce nettoyage ne modifie pas le binaire root **déjà installé** : son remplacement nécessite l'accès administratif existant, et doit être vérifié indépendamment. Ne jamais confondre un commit Git avec un déploiement root.

## Cas de référence : incident 500

En novembre 2026, le propriétaire a redémarré par SSH/sudo `mcp-cogentia.service` puis `cogentia.service`; les appels MCP réels `cogentia_issue_graph` et `cogentia_issues_list` ont ensuite réussi. Les signatures répétées envisagées n'ont pas servi à réparer l'incident. Ce résultat oriente le principe FBF : corriger le logiciel et vérifier le service réellement exécuté, sans créer d'obstacle d'autorisation superflu.
