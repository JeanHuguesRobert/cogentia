---
title: "KYS — Cogentia Self-Introspection and Symmetric Transparency"
document_role: "architecture / doctrine / specifications"
lifecycle_state: "active"
tags:
  - kys
  - ami
  - self-introspection
  - symmetric-transparency
  - anti-capture
  - epistemic-layers
  - provenance
---

# KYS — Cogentia Self-Introspection and Symmetric Transparency

## 1. Principe Fondateur : L'Anti-Capture Symétrique

Le projet Cogentia repose sur une règle déontologique stricte :
> **Anti-capture must be symmetric.**
> Cogentia ne peut exiger la transparence et la contestabilité des agents conversationnels externes (ChatGPT, Claude, Gemini, etc.) tout en maintenant son propre modèle de l'utilisateur opaque ou indiscutable.

L'auto-introspection de Cogentia (*Self-Introspection*) répond directement aux trois questions fondamentales que toute personne est en droit de poser à un système qui l'observe :
1. **Que sais-tu sur moi ?** (*What do you know?*)
2. **Pourquoi le déduis-tu ?** (*Why do you think it?*)
3. **Qu'utilises-tu en ce moment même ?** (*What are you using now?*)

---

## 2. Les Cinq Couches Épistémiques

Afin de prévenir toute confusion entre les données fournies, les croyances des agents externes et les règles de Cogentia, le modèle distingue obligatoirement cinq couches étanches :

| Couche Épistémique | Définition | Degré d'Autorité |
| :--- | :--- | :--- |
| **`source_data`** | Textes bruts des réponses collées et des prompts émis, conservés tels quels sans interprétation. | Donnée brute vérifiable. |
| **`explicit_self_description`** | Examens, rectifications, notes, intentions et préférences déclarées par la personne. | **Autorité maximale** sur l'auto-description. |
| **`external_agent_assertion`** | Ce que les modèles externes prétendent savoir de la personne (instantanés de contexte). | Observation externe non vérifiée (indice, non vérité). |
| **`cogentia_inference`** | Déductions dérivées par les règles de Cogentia (saillance, état de relation, convergences). | Inférence gouvernée avec règle transparente. |
| **`current_working_context`** | État actif en mémoire locale (tour courant, étape affichée, brouillon temporaire). | Contexte de travail éphémère. |

---

## 3. Survie de la Traçabilité Historique aux Rectifications

Lorsqu'une affirmation d'agent est rectifiée ou rejetée par la personne (`rejected` / `obsolete` / `private`) :
- Elle **cesse immédiatement d'être présentée comme vérité active** (`active_in_current_truth: false`).
- L'observation d'origine **n'est pas effacée en secret** (`historical_observation_preserved: true`).
- La trace conserve à la fois l'énoncé de l'agent, le tour où il est apparu, la décision de la personne et son motif explicite.

Cette traçabilité garantit l'intégrité de l'audit sans transformer le système en outil d'amnésie sélective incontrôlée.

---

## 4. Limites de Transparence Assumées (*Known Transparency Gaps*)

Cogentia refuse de feindre une transparence exhaustive là où des obstacles techniques réels existent. Les asymétries et lacunes actuelles sont explicitement documentées :

1. **Mémoire vive du moteur d'exécution JavaScript (*Browser Runtime Allocator*) :**
   L'allocation dynamique de la mémoire et les cycles du ramasse-miettes (*garbage collection*) dans le navigateur de l'utilisateur ne sont pas journalisés pour préserver les performances et éviter l'espionnage de l'environnement matériel.
2. **Mécanismes internes des modèles tiers (*External Model Weights and CoT*) :**
   Les poids neuronaux, le raisonnement caché (*chain-of-thought*) et la mémoire résiduelle des serveurs d'OpenAI, Anthropic ou Google restent protégés par le secret industriel de ces éditeurs et inaccessibles à l'inspection directe.
3. **Arbre de réconciliation virtuel (*Virtual DOM Reconciliation*) :**
   Les tampons éphémères du moteur React lors du calcul des rendus ne sont pas persistés car ils ne constituent pas une information durable sur la personne.

---

## 5. Droits de Gouvernance Immédiats

À travers le composant d'auto-introspection, la personne dispose en permanence de cinq leviers d'action locaux :
1. **Rectifier** : Ajouter ou corriger une annotation humaine sur toute affirmation.
2. **Restreindre** : Interdire la réutilisation ou l'inclusion d'une donnée sensible dans les prompts d'alignement.
3. **Désactiver la persistance** : Forcer le mode de session éphémère sans rétention dans `localStorage`.
4. **Exporter** : Télécharger l'intégralité du modèle d'introspection au format JSON structuré.
5. **Purger** : Détruire en 1 clic l'intégralité des données locales conservées.
