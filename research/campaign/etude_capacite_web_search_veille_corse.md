---
title: "Étude d'Architecture : Mobilisation d'une Capacité de Web Search & Veille Média pour la Campagne Sénatoriale en Corse"
subtitle: "Ingestion live des médias régionaux, recherche web et qualification COP-native pour les 27 jours de campagne"
author: "Jean Hugues Noël Robert, baron Mariani — Institut Mariani / Cogentia"
date: "2026-09-01"
status: published
corpus_role: source
document_role: technical-study
document_kind: research-paper
visibility: public
language: fr
tags:
  - Web Search
  - Veille Média
  - Corse
  - Sénatoriales 2026
  - Rossignol
  - RSS
  - Brave Search
  - DHITL
---

# Étude d'Architecture : Mobilisation d'une Capacité de Web Search & Veille Média pour la Campagne Sénatoriale en Corse

## 1. Objectif & Contexte Stratégique

À l'approche du scrutin sénatorial du **27 septembre 2026** (et du dépôt officiel des candidatures en préfecture de Haute-Corse du **7 au 11 septembre 2026**), la réactivité informationnelle est un facteur décisif.

Deux besoins majeurs se dégagent :
1. **La veille médiatique continue :** Capter en temps réel les prises de position des candidats déclarés (Paulu Santu Parigi / sortant Femu, droite républicaine, indépendants), les polémiques régionales (sécheresse, déchets, transports) et les déclarations des maires.
2. **L'actualité législative nationale :** Suivre le calendrier d'examen au Sénat du **projet de loi constitutionnelle pour l'autonomie de la Corse** (adopté à l'Assemblée le 23 juin 2026 et programmé au Sénat dès le 21 octobre 2026).

---

## 2. Architecture Tripartite Proposée

Pour allier **autonomie maximale**, **zéro dépendance fragile** et **profondeur d'investigation**, nous structurons la veille en 3 niveaux complémentaires :

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                  NIVEAU 1 : FLUX RSS & MÉDIAS EN DIRECT (LIVE)              │
 │  • Corse Net Infos (CNI)               • France 3 Corse ViaStella           │
 │  • Alta Frequenza                      • Journal de la Corse                │
 │  • Public Sénat (Dossiers législatifs) • Assemblée de Corse                 │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ (Extraction directe XML/JSON - 0 clé)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                  NIVEAU 2 : MOTEUR DE RECHERCHE WEB CIBLÉ                   │
 │  • Brave Search API (2000 req/mois gratuites)                               │
 │  • Modèles Search Grounding (Perplexity / OpenRouter / OpenAI Search)       │
 │  • Requêtes ciblées : « sénatoriales Haute-Corse 2026 », « sécheresse OEHC »│
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ (Requêtes planifiées)
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │            NIVEAU 3 : FILTRAGE & ENCAPSULATION ROSSIGNOL (COP)             │
 │  1. Déduplication SHA-256 (Élimine le bruit et les doublons)                │
 │  2. Scoring sémantique selon les 5 axes sénatoriaux                         │
 │  3. Encapsulation en Cognitive Packet Capsule (cogentia.packet_capsule/v1)  │
 │  4. Exploration Décorrélée (3 branches : Institutions / Maires / Technique) │
 │  5. Convergence Checkpoint & Cycle de Sommeil                               │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ (Alertes qualifiées)
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │              COCKPIT WHATSAPP MOBILE & MÉMOIRE DE CAMPAGNE                  │
 │  • Notification WhatsApp en 1 clic pour arbitrage ou réaction               │
 │  • Inscription dans research/campaign/2026_senatoriales_memory.md           │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Détail des Niveaux d'Ingestion

### A. Niveau 1 : Ingestion Directe des Flux Médias Corses (Gratuit, 100% Autonome)
Les principaux médias insulaires et institutions parlementaires disposent de flux ouverts :
* **Corse Net Infos (CNI) :** `https://www.corsenetinfos.corsica/xml/syndication.rss`
* **France 3 Corse ViaStella :** `https://france3-regions.francetvinfo.fr/corse/rss`
* **Alta Frequenza :** `https://www.alta-frequenza.corsica/actu/rss`
* **Public Sénat (Affaires corses) :** `https://www.publicsenat.fr/rss`

*Avantage :* Interrogeable toutes les 15 ou 60 minutes sans quota, sans coût et sans clé d'API.

### B. Niveau 2 : Recherche Web Active (Search APIs & Web Grounding)
Pour dépasser les simples flux d'actualité et fouiller le web profond (blogs d'élus, arrêtés préfectoraux, recours administratifs) :
1. **Brave Search API :** Permet d'effectuer des recherches booléennes précises (`site:haute-corse.gouv.fr "sénatoriales"`, `site:corse.fr "eau"`).
2. **OpenRouter / Perplexity Sonar :** Synthétise en temps réel les réponses web avec sources sourcées et vérifiées.

### C. Niveau 3 : Grille de Scoring Sémantique (5 Axes Sénatoriales)

Chaque article ingéré est évalué sur une échelle de pertinence ($0.0$ à $1.0$) selon la présence de concepts clés :

| Axe de Campagne | Mots-clés déclencheurs | Poids |
| :--- | :--- | :--- |
| **Axe 1 : Institutions & Maires** | `sénatoriales`, `grands électeurs`, `Article 72-5`, `DGF`, `Parigi`, `communes rurales`, `conseils municipaux` | $\times 1.5$ |
| **Axe 2 : Énergie & ZNI** | `électricité`, `EDF`, `raccordement`, `solaire`, `STEP`, `Fium'Orbu`, `FractaVolta`, `CSPE` | $\times 1.3$ |
| **Axe 3 : Foncier & Logement** | `indivision`, `GIRTEC`, `résidence secondaire`, `BRS`, `logement étudiant`, `biens sans maître`, `spéculation` | $\times 1.4$ |
| **Axe 4 : Eau & Déchets** | `sécheresse`, `OEHC`, `retenue collinaire`, `Syvadec`, `exportation déchets`, `TEOM`, `poubelles` | $\times 1.3$ |
| **Axe 5 : Transparence & Justice** | `Chambre Régionale des Comptes`, `CRC`, `tribunal administratif`, `marchés publics`, `fraude`, `subventions` | $\times 1.2$ |

---

## 4. Feuille de Route d'Intégration dans Rossignol (R2)

1. **Module `scripts/lib/corsica-live-media-feed.js` :**
   - Connecteur multi-flux RSS avec détection d'encodage et extraction d'entités.
2. **Intégration au Runner Rossignol (`scripts/lib/rossignol-watch.js`) :**
   - Remplacement de `DEFAULT_WATCH_FEEDS` par l'agrégation dynamique : `const liveItems = await fetchLiveCorsicaFeeds();`.
3. **Seuil d'Alerte WhatsApp :**
   - Si score de pertinence $\ge 0.85$ ET mention explicite de Haute-Corse / Sénat : génération immédiate d'une proposition de réaction pour le cockpit WhatsApp mobile de Jean Hugues Robert.
