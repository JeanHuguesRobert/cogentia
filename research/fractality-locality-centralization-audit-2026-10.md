---
title: "Audit transversal — Fractalité, centralisation et granularité de la localité"
date: 2026-10-16
status: "working audit — documentary + deterministic operational evidence; live node tests pending"
document_role: source
document_kind: architecture-audit
visibility: public
lifecycle_state: working
language: fr
license: CC BY-SA 4.0
related_documents:
  - research/locality_principle.md
  - research/registry_of_registries.md
  - research/fractaxxxx.md
  - https://github.com/JeanHuguesRobert/inseme/blob/main/research/packet_attractor_fractanet.md
  - https://github.com/JeanHuguesRobert/operium/blob/main/docs/operium-node-agent.md
  - https://github.com/JeanHuguesRobert/operium/blob/main/research/federated-capacity-registry.md
  - https://github.com/JeanHuguesRobert/operium/blob/main/research/fractatrust-v0-binary-perimeter.md
---

# Audit transversal : fractalité, centralisation et localité suffisante

## Portée et méthode

Audit documentaire transversal, et non preuve du comportement de tous les services déployés. Sources inspectées : Cogentia (Locality Principle v0.6, Registry of Registries, FractaXXXX), Inseme (Packet Attractor Fractanet), Operium (ONA, Federated Capacity Registry, Trust Perimeter). Étendre ensuite aux branches du corpus (FractaVolta, Inox, barons-Mariani, registres privés accessibles dans le périmètre) et aux tests sur FractaNodes. Séparer systématiquement doctrine, code, déploiement et test.

**Test de centralisation cachée :** une composante globalisée devient un centre d'autorité lorsque sa disparition empêche de *comprendre*, *autoriser*, *continuer* ou *reconstruire* une opération locale pourtant indépendante. Un hub opérationnel peut être acceptable si les sources restent locales et si la dégradation est bornée et explicite.

## Constat positif — doctrine anti-capture explicite

Le Locality Principle stipule **Minimum Sufficient Locality (MSL)**, localité ≠ placement, « localize knowledge; distribute references », franchissement explicite de frontières et reconstruction des vues globales. Le Registry of Registries exige que les faits et prétentions d'autorité restent auprès de leurs sources. Le FractaXXXX est une *vue générative*, pas un super-protocole. Le Federated Capacity Registry prévoit une autorité locale par source et des projections fédérées. Le Packet Attractor prévoit « no single board » comme direction.

**Écart principal — état initial (2026-10-16)** : ces règles normatives ne prouvaient pas encore que les chemins d'exécution et de reprise étaient décentralisés.

### Mise à jour RT-1 — 17 octobre 2026

Cet écart est désormais **partiellement réduit, mais non fermé**.

Les premiers Reality Tests déterministes montrent que la perte du blackboard central n'efface pas
nécessairement la capacité locale de continuer ou de différer proprement un travail déjà
suffisamment matérialisé :

~~~text
blackboard disponible
→ connaissance locale acquise
→ blackboard indisponible
→ route/cache local encore exploitable sous vérification
→ exécution locale possible ou mise en attente durable
→ retry après retour du transport
→ déduplication par identité d'enveloppe
~~~

Preuves observées et exécutées indépendamment via le compute GitHub borné d'Inseme :

- Cogentia : snapshot du blackboard mis en cache, blackboard rendu inaccessible, puis résolution via
  `offline_cache_fallback` après vérification de santé de l'endpoint ;
- Operium : conservation de la dernière projection locale des pairs après échec de synchronisation ;
- COP/ONA : conservation d'une enveloppe en outbox après échec de transport, puis retry et livraison
  après retour du transport ;
- réception : replay du même identifiant d'enveloppe reconnu comme doublon sans réappliquer l'événement.

Références : [RT-1 / Cogentia #255](https://github.com/JeanHuguesRobert/cogentia/issues/255),
[preuve Cogentia](https://github.com/JeanHuguesRobert/inseme/issues/120#issuecomment-6240899139) et
[preuve Operium](https://github.com/JeanHuguesRobert/inseme/issues/120#issuecomment-6240898038).

Ces résultats réfutent déjà l'hypothèse forte selon laquelle le blackboard `fracta` serait
nécessairement le détenteur unique de la continuité opérationnelle. Ils ne démontrent pas encore
qu'un FractaNode réel peut continuer un Cognitive Packet gouverné pendant une indisponibilité
effective de `fracta`, ni que le contrôle applicable et le mandat restent localement résolubles.

La conclusion intermédiaire est donc :

~~~text
continuité locale partiellement prouvée
≠ autonomie absolue
≠ autorité hors ligne automatique
≠ disparition du besoin de coordination globale
~~~

## Matrice initiale des risques

| Domaine | Indice tiré du corpus | Risque | Priorité | Test discriminant |
|---|---|---|---|---|
| Blackboard / découverte | ONA v1 décrit un blackboard agrégé sur fracta; la doc Packet Attractor vise plusieurs boards | Concentration opérationnelle, TTL de découverte indisponible en panne de fracta | P0 | Isoler fracta puis tenter continuation locale et découverte via un autre pair; mesurer ce qui bloque |
| Routage / scheduler | Routage par attracteurs prévu; agrégateur et façade MCP centralisés pour le bootstrap | Routage implicite vers le hub; absence de fallbacks locaux | P0 | Faire traiter un Packet déjà qualifié localement sans hub, puis rejouer |
| Mandats / FractaTrust | v0 périmètre binaire et clé SSH maillage partagée; mandats COP indépendants | Appartenance au maillage confondue avec autorité; rayon d'impact d'une clé compromise | P0 | Vérifier qu'un nœud joignable mais sans mandat ne peut produire un effet |
| Accounting Z0 | Registre transactionnel PostgreSQL/Supabase unique pour budgets Z0 | Sérialisation globale nécessaire pour certains budgets, mais blocage des effets locaux sans base | P0 | Définir explicitement le *budget owner* et les opérations interdites hors-ligne, comparer une allocation locale déléguée |
| instance_config / secrets | Configuration dans Supabase, bootstrap depuis .env/Gmail, sauvegarde mobile | Point de reprise unique si dépendance circulaire à Supabase; copies de secrets non inventoriées | P1 | Restaurer la capacité d'un FractaNode hors Supabase sans divulguer secret |
| ONA / état local | ONA spécifié sur chaque FractaNode, SQLite décrit cache; outbox prévue | Cache ou hub promu accidentellement en vérité; outbox pas durable/portable | P1 | Coupure réseau, décision locale, reprise et rapprochement exact sans perte d'acte |
| Registre des capacités | Déclaration locale + projection fédérée prévue dans Operium | La vue globale peut dicter des capacités périmées | P1 | Retirer registre global et observer si chaque source conserve et expose sa preuve de capacité |
| Corpus / index | Registry of Registries maintient sources locales et vues globales reconstructibles | Index global ou recherche centrale indispensable à la continuation d'un Packet | P2 | Supprimer projection dérivée et reconstruire à partir des sources et références |
| Conception FractaX | FractaXXXX qualifie la grammaire comme non normative | Récursion ou noms fractals appliqués sans bénéfice local réel | P2 | Exiger une mesure de coût, de résilience ou d'autonomie pour chaque récursion introduite |

Les priorités sont des **hypothèses de risque**, non une affirmation de panne actuelle.

## Bonne granularité : par invariant, pas par type de machine

La localité minimale suffisante dépend de **ce qui doit rester cohérent**. Un fichier, un Packet, un acteur, une instance, un nœud ou un ensemble de nœuds ne sont pas des niveaux imposés; ce sont des candidats de frontière.

| Objet / invariant | Localité candidate par défaut | Escalade justifiée par |
|---|---|---|
| Historique d'un acte | Acte/Packet et sa lignée | Corrélation probatoire explicite |
| Mémoire de travail | Session/agent/Packet | Dépendance inter-agent déclarée |
| Configuration d'un handler | Instance/handler | Politique partagée réellement indispensable |
| Secrets d'accès | Hôte/courtier au sein du périmètre | Restauration ou rotation contrôlée |
| Autorité de mandat | Autorité émettrice + copie vérifiable | Révocation / arbitrage nécessitant synchronisation |
| Réservation budgétaire | Budget propriétaire, unité transactionnelle | Engagement sur budget commun |
| Capacité et disponibilité | Nœud qui observe la ressource | Découverte par d'autres nœuds |
| Routage | Nœud demandeur, voisinage de capacités connu | Absence de satisfaisant local |
| Index corpus | Source documentaire, puis projections | Recherche cross-corpus qualifiée |
| Supervision | Service/nœud, puis agrégation | Diagnostic transversal, jamais vérité unique |

Principe : **monter d'un cran uniquement quand l'invariant ne peut pas être respecté plus bas**. La quantité de machines n'est ni une mesure de fractalité, ni une preuve de localité.

## Grille de contrôle pour toute nouvelle architecture

1. **Source de vérité** — où réside l'autorité du fait ou de l'acte ?
2. **Plus petite localité suffisante** — quel est le plus petit domaine préservant son invariant ?
3. **Frontière franchie** — pourquoi et avec quel mandat / quelles données minimales ?
4. **Mode de panne** — que reste-t-il possible si le hub, Supabase, Gmail ou le réseau disparaît ?
5. **Reconstruction** — les vues et index globaux peuvent-ils être reproduits sans la plateforme d'origine ?
6. **Coût de granularité** — surcharge d'IPC, coordination, sérialisation, latence, conflits et maintenance ?
7. **Preuve** — quel test échouerait sous une architecture accidentellement centralisée ?

Ne pas faire de la fractalité une obligation de partition infinie; accepter la mutualisation de processus, les budgets uniques et les vues centralisées lorsqu'elles sont explicitement circonscrites, remplaçables ou nécessaires à un invariant. La **fractalisation utile** préserve l'autonomie là où les décisions peuvent réellement être prises localement, pas la multiplication des daemons.

## Reality Tests recommandés (ordre FBF)

- **RT-1 (P0) Décapitation du hub — PARTIAL 2026-10-17 :** mécanismes déterministes PASS (cache de route, projection locale des pairs, outbox/retry, déduplication). Prochaine preuve discriminante : sur un FractaNode autorisé, rendre le blackboard inaccessible **pour un seul processus client**, sans arrêter ni firewaller `fracta`, puis exiger `routed_via: offline_cache_fallback` avant un éventuel test COP live borné.
- **RT-2 (P0) Autorité sans connectivité :** accès SSH/Tailscale et possession de secrets ne doivent pas suffire à autoriser un acte gouverné sans mandat actif.
- **RT-3 (P0) Comptabilité :** budget commun demande sérialisation; un sous-budget explicitement délégué pourrait permettre des actes hors-ligne dans une limite bornée, sans double dépense; hypothèse à prouver.
- **RT-4 (P1) Répertoire :** supprimer le cache global de capacités et vérifier la reconstruction locale/fédérée.
- **RT-5 (P1) Bootstrap :** démarrer un nouvel environnement sans poste principal ni accès à instance_config; retrouver ses références de configuration via une voie autorisée, sans secret en GitHub.

## Décision provisoire

**Ne pas « décentraliser » par principe tous les composants.** Séparer *autorité logique*, *coordination*, *placement*, *projection* et *exécution*; identifier et tester les dépendances obligatoires. FractaX fournit une grammaire de composition, le principe de localité une règle de placement de responsabilité, COP la gouvernance de l'acte, et Operium les ressources et réalités opérationnelles.

Cet audit n'est pas encore un relevé exhaustif des plus de vingt dépôts du corpus. Il contient désormais une première preuve opérationnelle déterministe de continuité sous perte de coordination, mais pas encore un test live d'indisponibilité de `fracta`. Il reste une base sourcée pour une campagne d'audit progressive.
