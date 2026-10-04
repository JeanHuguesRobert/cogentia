---
title: "KYS — Multi-agent and Longitudinal Comparison"
document_role: "architecture / doctrine / specifications"
lifecycle_state: "active"
tags:
  - kys
  - ami
  - multi-agent
  - longitudinal-diff
  - epistemic-invariants
  - provenance
---

# KYS — Multi-agent and Longitudinal Comparison

## 1. Contexte et Finalité

Dans le cadre du dispositif **KYS-AMI** (*Know Your Systems — Agent-Acquired Context Mirror*), l'utilisateur accumule des instantanés de contexte appris au fil du temps et auprès de différents modèles conversationnels (ex. ChatGPT, Claude, Gemini, Mistral).

Dès lors que plusieurs instantanés existent, les agents deviennent des **observateurs longitudinaux hétérogènes**. La valeur du produit est double :
1. **Personnelle :** *« Comment mes différentes IA me représentent-elles ? Que croient-elles que je suis ou fais ? Quelles sont leurs contradictions ? »*
2. **Instrumentale pour le Jumeau Numérique (*Digital Twin*) :** Alimenter une représentation structurée et vérifiable de la personne, sans jamais assimiler aveuglément les hallucinations ou consensus de modèles.

---

## 2. Invariants Épistémiques et Doctrinaux

Le modèle de comparaison repose sur cinq règles strictes, non négociables :

### 2.1. L'accord est un indice, pas une vérité (*Agreement is evidence, not truth*)
Si plusieurs agents affirment la même chose (par exemple, 3 agents affirmant qu'une personne réside dans telle ville), cet accord constitue un **indice concordant** (*agent convergence*). En aucun cas un vote majoritaire ne peut être promu automatiquement en fait ou vérité canonique (`is_ground_truth: false`). Les modèles partagent souvent des biais d'entraînement, des contextes d'ingestion similaires ou des syllogismes erronés.

### 2.2. Ne jamais moyenner les contradictions (*Do not average contradictions away*)
Lorsque deux agents (ou deux instantanés temporels) soutiennent des assertions incompatibles (ex. *« préfère les réunions le matin »* vs *« préfère les réunions en fin de journée »*), le système ne cherche pas un juste milieu artificiel et ne supprime pas les éléments divergents. Les deux branches sont conservées et présentées côte à côte dans une section dédiée **Divergences & Tensions**, avec leurs sources respectives.

### 2.3. Disparition temporelle $\neq$ oubli humain (*Causal attribution: unknown*)
Lorsqu'une affirmation présente dans un instantané antérieur ($t_1$) d'un agent n'apparaît plus dans son instantané ultérieur ($t_2$), **il est interdit de qualifier cette disparition d'oubli de la personne ou d'évolution humaine**.
L'attribution causale par défaut est strictement `unknown`. Les causes probables incluent la compression de contexte du modèle, l'échantillonnage stochastique, la reformulation ou la purge interne du fournisseur. Seule une annotation explicite de la personne peut requalifier la cause en `person_change` ou `human_remedied`.

### 2.4. Préservation stricte de la traçabilité et de la provenance (*Per-snapshot provenance*)
Aucune affirmation issue de la comparaison n'est détachée de son origine. Chaque élément porte l'empreinte de ses sources :
- `snapshot_id` / `turn_number`
- `provider` / `agent` / `model`
- `captured_at` (date/heure de réponse)
- `item_id` d'origine
- `claimed_origin` (énoncé explicite, inférence, mémoire du fournisseur)
- `confidence` déclarée par l'agent

### 2.5. Primauté de l'autorité humaine sans effacement (*Human authority*)
Sur l'auto-description, la correction humaine (`contest`, `nuance`, `confirm`, `restrict`, `obsolete`) prévaut absolument sur tout consensus unanime d'agents.
Si 4 agents affirment une fausseté et que la personne coche *« Non, pas du tout »* (`rejected`), l'autorité affichée devient `human_contested` (Contesté par la personne). Cependant, les observations originales des agents **ne sont pas effacées** : elles restent inspectables en tant qu'archives des croyances des agents.

---

## 3. Taxonomie des Catégories de Comparaison

| Catégorie | Définition | Statut Épistémique |
| :--- | :--- | :--- |
| **Convergence** | Affirmation concordante chez 2 agents ou plus. | Indice d'accord (non vérité). |
| **Divergence** | Affirmations incompatibles ou contradictoires entre agents. | Tension conservée, inspectable côte à côte. |
| **Unique** | Affirmation relevée par un seul agent. | Perception asymétrique d'un agent. |
| **Disparue** | Présente à $t_1$, absente à $t_2$ pour un même agent. | Disparition temporelle (cause inconnue par défaut). |
| **Nouvellement observée** | Absente à $t_1$, apparue à $t_2$ pour un même agent. | Nouvelle inférence ou énoncé récent. |
| **Arbitrage humain** | Affirmation ayant fait l'objet d'un examen par la personne. | Autorité prioritaire sur l'auto-description. |

---

## 4. Échelle d'Autorité

L'échelle hiérarchique d'autorité s'établit comme suit :

1. `human_contested` (Rang 100) : Réfuté par la personne.
2. `human_confirmed` (Rang 90) : Confirmé explicitement par la personne.
3. `human_nuanced` (Rang 85) : Précisé ou restreint par une note humaine.
4. `human_restricted` (Rang 80) : Soumis à interdiction de conservation par la personne.
5. `human_obsolete` (Rang 75) : Marqué comme révolu.
6. `unreviewed_agent_convergence` (Rang 40) : Accord d'agents non vérifié par la personne.
7. `single_agent_claim` (Rang 20) : Affirmation d'un seul agent non vérifiée.

---

## 5. Interface et Ergonomie Utilisateur

Le composant [`MultiAgentComparison`](file:///C:/tweesic/cogentia/apps/personal/src/components/MultiAgentComparison.js) permet à l'utilisateur :
- De visualiser les métriques globales (nombre d'agents comparés, convergences, divergences, exclusivités, disparitions).
- De basculer via des filtres clairs :
  - **Toutes** : vision exhaustive.
  - **Convergences** : points d'accord entre agents.
  - **Divergences & Tensions** : comparaison directe face-à-face des affirmations contradictoires.
  - **Exclusivités** : singularités de chaque agent.
  - **Évolution temporelle** : affirmations apparues ou disparues entre tours d'un même agent.
  - **Arbitrages humains** : synthèse des décisions de la personne.
- D'inspecter pour chaque élément le détail complet de ses sources et l'avertissement épistémique associé.
