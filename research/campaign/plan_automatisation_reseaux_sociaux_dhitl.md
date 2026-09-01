---
title: "Plan Directeur & Architecture : Démultiplication & Automatisation Multi-Plateformes (X, Instagram, Facebook, Vidéos)"
subtitle: "Stratégie multi-comptes, connecteurs d'émission (Méthode OpenClaw vs API) et gouvernance inviolable DHITL"
author: "Jean Hugues Noël Robert, baron Mariani — Institut Mariani / Cogentia"
date: "2026-09-01"
status: published
corpus_role: source
document_role: technical-strategy
document_kind: research-paper
visibility: public
language: fr
tags:
  - X / Twitter
  - Suvranu
  - BaronsMariani
  - JHR
  - OpenClaw
  - Instagram
  - Facebook
  - YouTube
  - TikTok
  - DHITL
  - Sénatoriales 2026
---

# Plan Directeur & Architecture : Démultiplication & Automatisation Multi-Plateformes (X, Instagram, Facebook, Vidéos)

## 1. Vision & Invariants Fondamentaux

Pour la campagne des Sénatoriales du **27 septembre 2026**, la présence sur les réseaux sociaux doit répondre à une équation rigoureuse :
1. **Démultiplication maximale de l'impact :** Un seul fait ou note de doctrine du corpus doit pouvoir se décliner en formats adaptés sur X, Facebook, Instagram et Vidéo.
2. **Non-délégation de la souveraineté (Principe DHITL) :** **« Agent John propose, l'humain valide. »** Aucune émission n'a lieu sans validation explicite d'un clic via le cockpit mobile WhatsApp.
3. **Respect absolu des identités situées (Personas & Comptes) :** Chaque compte a une ligne éditoriale, une audience et une fonction sociologique distincte.

---

## 2. Cartographie & Rôles des 3 Comptes X / Twitter

```text
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │                               ÉCOSYSTÈME X / TWITTER DE JHR                                 │
 ├──────────────────────────┬──────────────────────────┬───────────────────────────────────────┤
 │ Compte X                 │ Sociologie & Audience    │ Rôle & Stratégie d'Émission           │
 ├──────────────────────────┼──────────────────────────┼───────────────────────────────────────┤
 │ @baronsmariani           │ Cadre officiel, presse,  │ • Déclarations officielles de JHR     │
 │ (L'Émetteur Officiel)    │ observateurs, institutions│ • Présentation des 5 Fiches Maires    │
 │                          │                          │ • Lien direct vers le corpus ouvert   │
 ├──────────────────────────┼──────────────────────────┼───────────────────────────────────────┤
 │ @suvranu                 │ >5000 comptes corses     │ • Relais systématique de @baronsmariani│
 │ (Souveraineté Populaire  │ (élus, maires, citoyens, │ • Citations de tweets enrichies       │
 │  & Débat Territorial)    │ journalistes insulaires) │ • Pédagogie de l'Autonomie de Capacité│
 │                          │ >1000 abonnés            │ • Contre-discours face au RN/Battini  │
 ├──────────────────────────┼──────────────────────────┼───────────────────────────────────────┤
 │ @jhr                     │ Compte historique        │ • Prises de parole rares et fortes    │
 │ (L'Ancienneté / Racine)  │ 3 lettres                │ • Autorité morale, philosophie, tech  │
 └──────────────────────────┴──────────────────────────┴───────────────────────────────────────┘
```

### Clarification Doctrinale sur `@suvranu` :
* **« Suvranu » = Souveraineté Populaire & Communale :** L'auto-institution démocratique par les citoyens et les 360 communes de Corse (communs, capabilités, droit d'expérimenter).
* **Distinction explicite avec l'extrême droite :** Rejet total de la « souveraineté nationale » centraliste et fermée portée par le Rassemblement National et le mouvement de Nicolas Battini (Palatinu).

### Traitement Algorithmique du Ratio 5000/1000 :
* Pour surmonter la pénalité de ratio de X, `@suvranu` doit privilégier :
  1. Les **Quote Tweets (Tweets cités)** argumentés plutôt que de simples retweets passifs ;
  2. Des **threads structurés (1/4)** avec médias et visuels pour maximiser le taux de lecture et d'interaction (*dwell time*) ;
  3. L'interpellation directe et courtoise des comptes d'élus ruraux et de journalistes régionaux.

---

## 3. Analyse Technique des Voies d'Émission (API vs Méthode OpenClaw)

```text
                                       VOIES D'ÉMISSION SUR X
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 │                                                                 │
                 ▼                                                                 ▼
        [VOIE 1 : API X OFFICIELLE]                                  [VOIE 2 : MÉTHODE OPENCLAW / COOKIES]
        • Payante (Basic 100$/m, Pro 5000$/m)                        • 100% Gratuite & Directe
        • 3 applications de dev distinctes                           • Sessions basées sur cookies (auth_token/ct0)
        • Quotas stricts en lecture                                  • Support multi-comptes instantané
        • Risque zéro de captchas                                    • Émule le comportement web authentique
```

### La Méthode OpenClaw / TweetClaw (Recommandée & Économique) :
OpenClaw (et des outils comme `XActions` ou `TweetClaw`) utilise l'injection de cookies de session sécurisés :
1. **Extraction :** Les cookies de session (`auth_token` et `ct0`) sont exportés une seule fois pour chaque compte (`@baronsmariani`, `@suvranu`, `@jhr`) et stockés dans un coffre local sécurisé (`.cogentia/secrets/x_session_*.json`, strictement exclu de Git).
2. **Émission Hybride :**
   - Soit via requêtes GraphQL signées avec les headers CSRF (rapide, sans interface graphique) ;
   - Soit via un navigateur headless piloté (**Playwright** / Chromium) pour émuler une saisie humaine et contourner les blocages.
3. **Séquençage Automatique « Déclaration & Relais » :**
   ```text
   Validation WhatsApp JHR ("approve ctn_soc_123")
                          │
                          ▼
   1. Publication du post officiel sur @baronsmariani (T0)
                          │ (Délai naturel de 45 à 90 secondes)
                          ▼
   2. Détection du tweet ID généré
                          │
                          ▼
   3. Publication sur @suvranu (Quote Tweet + thread explicatif) (T0 + 90s)
   ```

---

## 4. Découpage en 4 GitHub Issues Stratégiques

Pour assurer une implémentation progressive, modulaire et auditable, le chantier est découpé en **4 GitHub Issues** :

---

### 📌 Issue A : « [Social-X] Architecture Multi-Comptes X/Twitter & Pipeline de Relais DHITL »
* **Objectif :** Implémenter le connecteur X multi-comptes (`@baronsmariani`, `@suvranu`, `@jhr`) avec support session cookies (style OpenClaw) et le pipeline automatisé Déclaration $\rightarrow$ Relais.
* **Livrables :**
  - `scripts/lib/x-publisher.js` (gestionnaire multi-sessions, émission GraphQL/Playwright, quote tweets).
  - Coffre de secrets chiffré `.cogentia/secrets/x_accounts.json.enc` (avec instructions d'import des cookies).
  - Script de test et simulation DHITL.

---

### 📌 Issue B : « [Social-Instagram] Déclinaison Visuelle & Carrousels de Campagne »
* **Objectif :** Adapter les 5 Fiches Maires et les citations fortes en publications visuelles pour Instagram (format 1:1 et 4:5 carrousel) avec texte explicatif pour le public jeune et les relais d'opinion.
* **Livrables :**
  - Générateur d'assets visuels et carrousels Markdown $\rightarrow$ Images (`@cogentia/visual-cards`).
  - Connecteur d'émission Instagram Graph API / Browser session.

---

### 📌 Issue C : « [Social-Facebook] Démultiplication Long-Format pour les Élus & Maires »
* **Objectif :** Brancher l'émission des posts longs (300 à 600 mots) sur la page Facebook officielle de Jean-Hugues Robert et dans les espaces de débat territorial insulaire.
* **Livrables :**
  - `scripts/lib/facebook-publisher.js` (Meta Graph API / Page Token).
  - Gestion des formats longs avec typographie soignée et liens vers la base documentaire ouverte.

---

### 📌 Issue D : « [Social-Video] Pipeline Vidéo Courte & Longue (YouTube & TikTok) »
* **Objectif :** Structurer la chaîne de production de vidéos :
  - **Vidéos courtes (Shorts / TikTok / Reels) :** Formats verticaux de 60s synthétisant une proposition choc (ex: « Pourquoi la facture d'électricité de votre village va baisser de 40% »).
  - **Vidéos longues (YouTube) :** Entretiens de fond, décryptage du projet de loi constitutionnelle pour l'autonomie.
* **Livrables :**
  - Templates de scripts de tournage et découpage prompteur.
  - Synthèse vocale Cartesia / sous-titrage automatique.

---

## 5. Matrice Récapitulative du Déploiement

| Étape | Plateformes / Comptes | Format Principal | Cible Clé | Priorité |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **X (@baronsmariani + @suvranu)** | Threads & Quote Tweets | Journalistes, élus, observateurs | **Immédiat (S1)** |
| **Phase 2** | **Facebook (Page JHR)** | Posts structurés (400 mots) | Maires et délégués municipaux | **Immédiat (S1)** |
| **Phase 3** | **Instagram** | Carrousels & Citations | Société civile, jeunesse insulaire | **S2 (8-14 sept)** |
| **Phase 4** | **YouTube & TikTok** | Vidéos courtes (60s) & Débats | Grand public, viralité | **S3 (15-21 sept)** |
