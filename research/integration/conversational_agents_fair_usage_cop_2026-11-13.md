---
title: "Fair Usage des agents conversationnels — doctrine expérimentale COP"
status: "working-paper"
date: "2026-11-13"
document_role: "research"
document_kind: "policy-analysis"
visibility: "public"
lifecycle_state: "active"
license: "CC BY-SA 4.0"
---

# Fair Usage des agents conversationnels — expérimentation personnelle, COP Accounting et vérification des engagements

> Document de recherche et de gouvernance technique, non avis juridique. État des sources publiques : 13 novembre 2026. Les interfaces, offres et conditions changent ; relire leurs versions applicables avant une activation.

## 1. Contexte et objectif

Cogentia/CPS vise à mobiliser plusieurs processeurs de Judgment, dont des agents conversationnels accessibles dans un navigateur persistant, pour traiter des Cognitive Packets. Le navigateur peut transmettre une invocation ; le résultat est retourné explicitement à Cogentia par MCP/COP et doit recevoir un accusé durable. L'observation du DOM est un mécanisme secondaire de diagnostic, non une preuve de livraison.

Le projet, à ce stade, est expérimental, pour les besoins personnels directs de son initiateur, à code source ouvert, bénévole, sans finalité commerciale opérationnelle. Ces circonstances motivent une politique stricte de modération et de transparence ; **elles ne transforment pas une restriction contractuelle en autorisation**.

### Problème central

Les fournisseurs annoncent des assistants capables d'agir, des connexions à des outils, de la collaboration autonome et diverses offres d'accès grand public. Cela ne signifie pas automatiquement qu'ils autorisent un système tiers à piloter automatiquement leurs interfaces Web ou à extraire leurs réponses. Il faut rapprocher quatre couches, sans les confondre :
1. **Promesse publique / marketing** : capacités présentées au public, avec date et audience visée.
2. **Contrat applicable** : conditions de consommation, de canal, de plan, de territoire et d'accès automatisé.
3. **Possibilité technique** : outils MCP, APIs, extension, navigation, présence d'une session.
4. **Fair Usage mesuré** : consommation réelle, quotas, congestion, absence de contournement, traçabilité et impact sur autrui.

La conformité nécessite une autorisation du canal **et** une consommation raisonnable. Une utilisation faible peut demeurer interdite ; un canal autorisé peut être utilisé abusivement.

## 2. Sources primaires comparées — instantané du 13/11/2026

| Fournisseur / canal | Promesse publique | Limite ou restriction repérée | Conclusion de recherche |
| --- | --- | --- | --- |
| OpenAI / ChatGPT grand public EEE | ChatGPT agent peut mener des tâches multi-étapes à l'aide d'un ordinateur virtuel, de sites et d'outils ; l'offre gratuite met en avant l'accès conversationnel avec des limites techniques variables | Les conditions européennes, mises à jour le 16 janvier 2026, interdisent notamment l'extraction automatique ou programmatique de données ou sorties et le contournement des limites | Ne pas inférer une permission de télécommande externe de chatgpt.com des capacités de ChatGPT agent. Vérifier une autorisation spécifique pour le canal envisagé. |
| Anthropic / Claude grand public | Claude et ses offres de travail mettent en avant la collaboration et l'autonomie ; les offres Free/Pro/Max ont des limites dépendant du travail | Conditions grand public publiées le 8 octobre 2025 : accès automatisé ou non humain interdit sauf clé API Anthropic ou permission explicite | Ne pas activer de worker Web autonome sur le compte grand public sans permission explicite ; étudier l'API ou un canal expressément autorisé. |
| xAI / Grok grand public | Grok et Grok Bot promeuvent connexions aux outils, bots et fonctionnement durable ; les plafonds des offres sont affichés comme quotas | La politique d'usage acceptable interdit l'accès automatisé non autorisé par bot/script ; Grok Bot et ses facultés agentiques ne concèdent pas implicitement le droit d'automatiser grok.com depuis un outil tiers | Ne pas confondre automatisation *par* Grok et automatisation *de l'interface de* Grok. Confirmer le canal permis. |

Sources :
- OpenAI, conditions EEE : https://openai.com/en-GB/policies/eu-terms-of-use/
- OpenAI, lancement de ChatGPT agent : https://openai.com/index/introducing-chatgpt-agent/
- OpenAI, présentation du forfait gratuit : https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- Anthropic, centre juridique : https://www.anthropic.com/legal
- Anthropic, conditions consommateur PDF : https://assets.claude.com/399b2834d66aef85393d3c0ebe02a68c58dd59a3.pdf
- Anthropic, bonnes pratiques des limites : https://support.anthropic.com/en/articles/9797557-usage-limit-best-practices
- xAI, acceptable use : https://x.ai/legal/acceptable-use-policy
- xAI, terms : https://x.ai/legal/terms-of-service
- xAI, Grok Bot : https://docs.x.ai/grok-bot/overview
- xAI, consommation : https://docs.x.ai/grok/faq

Les informations de ce tableau décrivent **ces versions et ces pages**, pas une dispense juridique ni une interprétation définitive du droit applicable. Les arguments issus de la publicité commerciale et du droit de la consommation peuvent justifier un examen juridique indépendant ; on ne peut en déduire une permission technique et contractuelle immédiate.

## 3. Politique expérimentale proposée : Fair Usage by Accounting

### Admission en deux portes indépendantes

**Porte A — Permission du canal** : allowed / prohibited / ambiguous / requires-provider-approval. Aucune automatisation d'une interface grand public si la permission n'est pas établie ; une capacité MCP offerte par l'agent ne vaut pas à elle seule autorisation d'automatiser son site.

**Porte B — Consommation** : mandat valide, budget réservé, limites imposées par le fournisseur respectées, priorité respectueuse de la congestion. La Porte B ne peut jamais suppléer un échec de la Porte A.

### Unité de mesure

Pour chaque tentative d'invocation d'un JudgmentHandler, journaliser (dans l'enveloppe de confidentialité appropriée) :
- identity : `provider_id`, `channel`, `plan_class`, `handler_instance`, `packet_id`, `continuation_id`, `attempt_id`, `execution_binding_id`, `mandate_id` ;
- dates : admission, début, dernier signal de vie, livraison, accusé, fin, réinitialisation des quotas affichée, avec horloge/source ;
- usage : nombre de soumissions, réponses, durée et taille approximative, tokens uniquement si réellement mesurés, appels d'outils, quota visible, erreur de limite, Retry-After si fourni ;
- dépenses : quantité, unité, méthode d'évaluation, imputation débit/crédit, réservation, settlement/release, qualité de preuve ;
- fiabilité : livraison acceptée, refusée ou en suspens ; idempotency key, digest de payload, latence, abandon, collision, reprise, version de continuation ;
- conformité : source et version des conditions, base d'autorisation du canal, éventuel accord explicite du fournisseur, politique de rate limiting choisie.

Ne jamais inventer des tokens exacts à partir d'un texte HTML. La consommation facturée par le fournisseur, la consommation observée localement et l'estimation du coût marginal sont trois séries distinctes.

### Trace et valeur probatoire

Conserver l'événement brut signé/horodaté lorsque possible, son empreinte, la chaîne d'origine et les corrections append-only. Distinguer auto-déclaration de l'agent, observation du navigateur, accusé du serveur MCP, ticket/compteur officiel du fournisseur et relevé bancaire. Établir les correspondances sans prétendre que les écritures en partie double prouvent, seules, la réalité externe. Respecter minimisation des données, confidentialité et durée de rétention adaptée.

### Règles de comportement

1. Respecter limites affichées, ralentissements, fenêtres de réinitialisation et interdictions explicites ; pas de contournement CAPTCHAs, rotation de comptes, extraction de secrets ou usurpation.
2. Fixer un budget de test modeste et révisable, avec plafonds par fournisseur, période, instance et projet ; appliquer backoff et circuit breaker aux signaux de congestion ou de quota.
3. Préférer API, MCP ou interface d'automatisation explicitement autorisés. Les interfaces grand public restent réservées aux usages permis et aux essais de découverte ne franchissant pas une interdiction contractuelle.
4. Renvoyer le résultat directement par MCP/COP : `deliver` persiste et accuse ; `accept` vérifie le contrat d'achèvement ; `resolve` peut rester une façade compatible. Le DOM ne sert pas d'autorité sur l'achèvement.
5. Ne pas traiter comme complétion une réponse interrompue, un heartbeat sans progrès ou une livraison dont l'accusé a été perdu. Le retry doit utiliser la même clé d'idempotence et un contrat de version.
6. Distinguer mesure d'usage, conformité contractuelle et responsabilité des actes délégués ; l'absence de but lucratif n'annule pas les deux dernières.
7. Publier les méthodes, schémas et résultats agrégés sans publier tokens, cookies, credentials, communications privées ou informations nominatives non nécessaires.

## 4. Prémisses et questions ouvertes

- Quel canal exact (Web, MCP dans la session, API) est explicitement autorisé pour chaque fournisseur et chaque offre ?
- Les fournisseurs proposent-ils une permission écrite pour une expérimentation bénévole open source à volume limité ?
- Quelle unité officielle de quota peut être observée, par opposition aux proxies internes ?
- Quelles rétentions, audits d'intégrité et horodatages garantissent une traçabilité juridiquement défendable ?
- Comment rendre `deliver` / `accept` compatibles avec `cogentia.continuation.v2`, ExecutionBinding, ExecutionReceipt et le store COP sans créer une deuxième source de vérité ?

## 5. Cartographie des travaux existants

- Livraison de continuation : https://github.com/JeanHuguesRobert/inseme/issues/113
- Coordination multi-schedulers / claim : https://github.com/JeanHuguesRobert/inseme/issues/121
- Consommateur générique : https://github.com/JeanHuguesRobert/inseme/issues/165
- Push wake-up : https://github.com/JeanHuguesRobert/inseme/issues/166
- Binding/Receipt : https://github.com/JeanHuguesRobert/inseme/issues/85
- Quotas : https://github.com/JeanHuguesRobert/inseme/issues/89
- Accounting : https://github.com/JeanHuguesRobert/inseme/issues/161 et /issues/162, /issues/163, /issues/164
- Navigation : https://github.com/JeanHuguesRobert/cogentia/issues/291
- Contrôle MCP des mandats et budgets : https://github.com/JeanHuguesRobert/cogentia/issues/299

**Prochaine démonstration** : un client agent avec canal de résultat explicitement autorisé livre une continuation non sensible directement par MCP ; un double deliver ne produit qu'un accusé logique et un seul effet ; l'ordonnanceur attribue ensuite un paquet différent. Aucun déploiement, connexion de compte supplémentaire ni automatisation d'interface interdite n'est implicite dans ce document.
