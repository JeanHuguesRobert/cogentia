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


## 6. Arbitrage du Principal du 15 novembre 2026 — navigateur conservé, Fair Usage revendiqué

**Décision opérationnelle expresse :** pour Cogentia #330, le Principal **maintient le navigateur hébergé et l'onglet ChatGPT personnel comme cible de recherche et de démonstration**, et ne souhaite **pas** remplacer ce canal par l'API OpenAI. Il entend défendre son expérimentation au titre d'une interprétation raisonnée du **Fair Usage** : usage personnel et bénévole, consommation minime, aucune extraction en masse, traçabilité COP, budgets, limites et arrêt sur refus ou congestion. Le navigateur hébergé est une interface d'interaction du Principal avec son compte, et le résultat peut être déclaré volontairement **par le JudgmentHandler lui-même** via MCP/COP plutôt que capturé par aspiration du DOM.

**Hypothèse juridique discutée, non acquise :** une déclaration structurée volontaire du JudgmentHandler à un outil MCP pourrait mériter d'être distinguée d'une extraction automatisée de sorties par scraping ; cette distinction technique ne démontre **pas à elle seule** que l'invocation automatique d'un agent dans l'interface ChatGPT grand public est permise. Le texte européen applicable au 15 novembre 2026, daté du 16 janvier 2026, interdit en termes généraux l'extraction automatique ou programmatique de données ou d'Output, ainsi que le contournement de limites. Source primaire : <https://openai.com/en-GB/policies/eu-terms-of-use/>. Les conditions n'établissent aucune dérogation générale fondée sur le volume faible ou le caractère non commercial. **Le Fair Usage est ici une position du Principal et un protocole de proportionnalité, non une autorisation contractuelle attestée.**

**Deux décisions indépendantes :**

- **Architecture et recherche** : le choix du Principal est acté ; développer, tester en environnement local, mesurer, documenter et corriger la chaîne navigateur hébergé ↔ ChatGPT ↔ MCP/COP ↔ ordonnanceur, sans réorienter de fait le projet vers l'API. Les deux tours réels du 15/11 sont des preuves techniques historiques, non une licence contractuelle.
- **Activation d'une nouvelle exécution autonome sur le fournisseur** : conserver le statut `provider_permission=disputed_or_unverified` et `autonomous_browser_dispatch=false` tant que le canal précis n'est pas établi comme autorisé au sens des conditions applicables ou d'une autorisation particulière. Le mandat signé JHN v3, l'allowlist du host MCP et le budget COP **ne remplacent pas** cette détermination. Ni ce document ni une réponse conversationnelle ne donnent un droit nouveau d'usage.

**Doctrine de discussion loyale — style Talleyrand :** présenter l'enjeu par les finalités déclarées de l'offre, la capacité de l'utilisateur à employer des outils personnels d'assistance cognitive, le caractère explicite du retour MCP, les garanties COP contre l'abus, et les effets concrets d'une éventuelle restriction. Formuler la question exacte au fournisseur plutôt que lui imputer une intention ou présumer la réponse. Aucun courriel n'est envoyé sans autorisation spécifique du Principal.

**Critère probatoire de l'expérience** : distinguer a) ChatGPT réellement ouvert et mobilisé dans le navigateur, b) résultat reçu directement par MCP, c) comptabilisation COP, d) ordonnanceur autonome après le retour, e) permission contractuelle établie. Une réussite en a–d n'apporte **pas** à elle seule e ; un désaccord sur e n'efface pas a–d.

## 7. Précédent OpenClaw : soutien industriel, politique d'agentification et discrétion d'application (15/11/2026)

**Directive d'analyse du Principal.** Il entend prendre OpenAI **au mot** de sa politique publique favorable aux agents personnels largement accessibles, en s'appuyant sur le précédent d'OpenClaw. Il distingue correctement la faculté de faire appliquer des conditions contractuelles de l'obligation de le faire : **un pouvoir de sanction n'est pas un devoir de sanction**, même si cette discrétion ne supprime pas l'interdiction écrite et ne vaut ni renonciation, ni licence tacite, ni garantie de tolérance future.

### Faits contemporains vérifiés et chronologie

1. **14–15 février 2026 : soutien explicite à OpenClaw.** Peter Steinberger annonce rejoindre OpenAI pour rendre les agents personnels accessibles au plus grand nombre ; il indique qu'OpenClaw rejoindra une fondation et demeurera indépendant/open source. Le 15 février, Sam Altman annonce publiquement le recrutement et le soutien d'OpenAI à ce projet. Sources : [annonce personnelle du créateur](https://steipete.me/posts/2026/openclaw) et [Reuters, 15/02/2026](https://www.reuters.com/business/openclaw-founder-steinberger-joins-openai-open-source-bot-becomes-foundation-2026-02-15/).
2. **Documents OpenAI : soutien éditorial.** OpenAI présente Peter Steinberger et OpenClaw dans [Codex Originals](https://openai.com/codex-originals/) comme une contribution importante à l'avenir agentique. Il s'agit d'une reconnaissance publique, non d'une licence générale d'automatisation de `chatgpt.com`.
3. **12 novembre 2026 : précédent opérationnel majeur.** Le billet officiel [*Securing persistent agents like OpenClaw at OpenAI*](https://developers.openai.com/blog/securing-persistent-agents-like-openclaw-at-openai) indique qu'OpenAI utilise **plus de 500 agents OpenClaw persistants** en interne, avec séparation entre plan de contrôle fiable et agent non fiable, sandbox réseau/fichiers/processus, médiation des secrets, identité de chaque agent associée à un compte de service ChatGPT, revue automatique, télémétrie et conservation de journaux. Le billet présente l'agent persistant comme une source de productivité et de diffusion de l'IA auprès d'utilisateurs techniques **et non techniques**. Ces faits constituent un **précédent public de doctrine et de pratique industrielle** favorable à l'autonomie agentique.
4. **Intégration de l'abonnement dans les outils externes.** La [documentation OpenClaw pour OpenAI](https://docs.openclaw.ai/providers/openai) et sa [documentation OAuth](https://docs.openclaw.ai/concepts/oauth) déclarent que l'authentification d'abonnement ChatGPT/Codex via OAuth est explicitement prise en charge dans des workflows externes tels qu'OpenClaw. **Distinction technique décisive :** il s'agit du canal Codex/OAuth/agent runtime prévu par cette intégration, non de l'autorisation d'automatiser l'interface Web grand public `chatgpt.com`. Ne pas présenter ces surfaces comme identiques.

### Lecture diplomatique et juridique : prendre OpenAI au mot

**Thèse défendable :** la raison d'être publique de l'agentification, revendiquée et pratiquée par OpenAI, converge avec le mandat de Cogentia : accroître l'autonomie effective des personnes, rendre les outils utilisables sans dépendance permanente à un opérateur humain, et gouverner ces capacités par des identités, mandats, budgets, journaux, contrôle des effets et garde-fous réels. Les dispositifs décrits dans le billet officiel (control plane, agent identity, sandboxing, auto-review et observability) présentent une **parenté technique documentable** avec CPS, JudgmentHandlers et FractaCognition, qui mérite une comparaison de mécanismes et non une revendication d'identité ou d'antériorité.

**Différence entre le droit et son exercice :** les [conditions européennes du 16 janvier 2026](https://openai.com/policies/eu-terms-of-use/) interdisent notamment l'extraction automatique/programmatique de données ou de sorties. Elles indiquent que l'entreprise **peut** restreindre ou suspendre l'accès lorsqu'elle estime raisonnablement et objectivement que certains motifs sont réunis. Cela lui laisse une marge de décision sur le recours à ces mesures. **Mais** la faculté de ne pas sanctionner un usage donné n'en fait pas nécessairement un usage contractuellement autorisé ; la tolérance ponctuelle ne crée pas automatiquement un précédent juridiquement opposable. En particulier, OpenClaw interne et OpenClaw sous OAuth ne prouvent aucune permission spécifique de piloter un onglet ChatGPT par un outil tiers.

**Position opérationnelle** : défendre loyalement le navigateur hébergé comme objectif ; comparer les garanties COP à celles qu'OpenAI juge pertinentes pour ses propres agents ; mesurer l'usage réel et minimiser la nuisance ; ne pas contourner les quotas ni prétendre que le soutien à OpenClaw abroge les conditions d'utilisation. Le statut de permission externe reste **non établi** pour la télécommande autonome de l'interface ChatGPT grand public. Le travail de mise au point et les tests locaux continuent sans substitution forcée par l'API. La décision d'activer une nouvelle automatisation contractuellement litigieuse reste distincte des démonstrations précédentes.

**Formulation « Talleyrand » :** plutôt que reprocher à OpenAI une incohérence morale ou attribuer aux juristes une intention de bloquer l'innovation, rapprocher courtoisement (1) sa politique publique de démocratisation des agents, (2) ses propres dispositifs de sécurité pour agents persistants, (3) les mesures de contrôle équivalentes et auditées de Cogentia et (4) la question précise du traitement applicable à une expérimentation personnelle dans un navigateur contrôlé par l'utilisateur, avec retour MCP volontaire. Laisser à OpenAI l'espace d'expliquer une distinction de risque, une modalité permise ou une exception explicite. Il s'agit d'une argumentation institutionnelle, pas d'une permission qu'on s'attribue.
