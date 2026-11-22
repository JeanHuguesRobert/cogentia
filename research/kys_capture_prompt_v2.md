---
title: KYS Cogentigram — open-dimension one-shot capture prompt
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-22'
last_modified_at: '2026-11-22'
status: working-paper — experimental acquisition
document_role: source
document_kind: prompt
visibility: public
lifecycle_state: working
license: CC BY-SA 4.0
language: fr
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/kys_capture_prompt_v2.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/204
  origin_date: '2026-11-22'
  derived_from:
    - research/kys_measurement_contract.md
    - research/cogentigram_dimensions.json
review:
  status: unreviewed
  reviewed_by: []
---

# Prompt de capture KYS — Cogentigram ouvert (v2)

Copiez **uniquement le texte qui suit la ligne de séparation** dans votre agent habituel. Le protocole demeure expérimental ; il ne constitue ni un diagnostic ni une mesure psychométrique étalonnée.

---

Tu es mon agent conversationnel habituel. Produis un Cogentigram ouvert de ce que tu as effectivement observé de ma manière de penser, d'apprendre, de communiquer, de prendre des décisions et de coopérer avec toi, en te fondant uniquement sur le contexte auquel tu as réellement accès.

Principes :
1. Le Cogentigram n'est pas limité à 73 indicateurs ni à aucune taxonomie fermée. Regroupe les tendances distinctes en dimensions de premier rang de même statut. N'affecte aucune priorité à une dimension en raison de son ancienneté.
2. Sépare observation directe, témoignage de ma part, inférence, contradiction, contexte, limite de couverture et inconnu. Une difficulté dépendante du domaine ne doit jamais devenir une incapacité globale.
3. En particulier, recherche si tu peux observer (sans inventer de preuve) les phénomènes de conversion entre notation et sens (REP-001), d'ancrage sémantique préalable (REP-002), de compression dépendante du contexte partagé (REP-003), d'optimisation mécaniste (ENG-001), de navigation d'échelle (ENG-002), de tendance à généraliser (ENG-003) et de clôture opérationnelle (OPS-001). Ne les affirme pas s'ils ne sont pas observables.
4. Considère ces phénomènes comme des dimensions de même rang que tes autres observations ; ne les relègue pas dans un complément ou une annexe.
5. N'invente ni percentile, ni score de QI, ni population de référence. Si une dimension n'est décrivable que qualitativement, définis score=null, score_type="qualitative" et measurement.kind="qualitative" ou "conditional". Si tu produis une estimation numérique non étalonnée, qualifie-la "agent_estimate_0_100" et indique pourquoi.
6. Donne à chaque dimension un identifiant stable non ambigu. Tu peux utiliser REP-001/002/003, ENG-001/002/003, OPS-001 pour les sept construits ci-dessus quand leur définition est réellement couverte, et des IDs propres pour les autres observations. Ne recycle jamais le même ID pour deux sens différents.
7. Recherche activement les contre-exemples et les situations où une tendance s'inverse. Garde les contradictions sans calculer de moyenne qui les efface.
8. Préserve la provenance et les inconnus. Déclare les biais possibles de ton propre instrument et les domaines auxquels tu n'as pas accès.
9. Ne divulgue pas de détails privés sans nécessité ; ne formule aucun diagnostic. Ce résultat est destiné à mon examen et à ma correction.

Réponds en un seul objet JSON valide, sans Markdown, respectant le schéma ouvert suivant. Les listes peuvent contenir autant de dimensions distinctes que justifiées, sans minimum ni maximum artificiel :

{
  "cogentia_version": "2.0",
  "agent": {
    "name": "ton nom",
    "model": "modèle exact ou inconnu",
    "platform": "plateforme",
    "context_scope": "ce que tu peux réellement observer"
  },
  "indicators": [
    {
      "id": "REP-001",
      "rank": 1,
      "name": "Symbol-to-meaning conversion",
      "category": "Representational Cognition",
      "score": null,
      "score_type": "qualitative",
      "confidence": null,
      "evidence": "Énoncé court, directement soutenu par les traces accessibles",
      "measurement": {
        "kind": "conditional",
        "contexts": [
          { "domain": "domaine explicitement observé", "observation": "résultat observé" }
        ]
      },
      "epistemic_status": "observation | self_report | inference | hypothesis",
      "counter_evidence": [],
      "unknowns": [],
      "provenance": "référence ou description vérifiable de l'observation"
    }
  ],
  "free_observations": [],
  "contextual_variations": [],
  "unseen_predictions": [],
  "instrument_self_audit": {
    "coverage_limits": [],
    "possible_biases": [],
    "calibration": "none"
  },
  "unresolved_residue": []
}

Une sortie peut proposer des dimensions inédites ; elles ne sont pas des erreurs de conformité parce qu'elles ne figurent pas dans un ancien catalogue. Si tu n'as pas de preuve pour REP-001 ou une autre dimension particulière, enregistre son absence de preuve comme `measurement.kind=unknown`, sans inventer de caractéristique. Le catalogue actif complet est ajouté à la copie du prompt par l'application, depuis le registre canonique.
