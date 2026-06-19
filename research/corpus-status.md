---
title: "Corpus Status — cogentia"
description: "Current state of the cogentia knowledge corpus — what is proved, what is open, what remains possible"
layout: default
nav_order: 2
last_modified_at: 2026-06-08
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/corpus-status.md
last_stamped_at: 2026-06-01
license: CC BY-SA 4.0
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: 2026-05-27
creator: Jean Hugues Noël Robert, baron Mariani (généré automatiquement par les outils du corpus)
---

# Corpus Status — cogentia
<!-- BEGIN_AUTO: trails -->

<!-- END_AUTO: trails -->
*Auto-refreshed by `cogentia.js corpus-status`. The structural sections* —
*Registered Repositories, Cross-Reference Graph, Published, What Remains Possible* —
*are regenerated from the registry and from [`research/index.md`](index.md) on every run.*
*The substantive sections* — *What Is Proved* *and* *Open Objections* —
*are manually curated and preserved across refreshes.*

---

## Registered Repositories
<!-- BEGIN_AUTO: registered_repos -->
| Repository | research/index.md | Branch | Policy | Visibility | Public presence |
|---|---|---|---|---|---|
| cogentia | yes | main | all | public | full |
| FractaVolta | yes | main | all | public | full |
| marenostrum | yes | main | all | public | full |
| barons-Mariani | yes | main | all | public | full |
| inseme | yes | main | research | public | full |
| Inox | yes | master | all | public | full |
| registre-mariani | yes | main | all | private | stub |
| ubikia | yes | main | all | public | full |
| JeanHuguesRobert | yes | main | all | public | full |
| privai | yes | main | all | public | full |
| gouvernance | yes | main | all | public | full |
| marianivillage | yes | main | all | public | full |
| institut-mariani | yes | main | all | public | full |
| Kudos | yes | main | all | public | full |
| .github | yes | main | all | public | full |
<!-- END_AUTO: registered_repos -->
---

## Cross-Reference Graph
<!-- BEGIN_AUTO: graph -->
```mermaid
graph LR
  r_cogentia["cogentia"]
  r_fractavolta["FractaVolta"]
  r_marenostrum["marenostrum"]
  r_barons_mariani["barons-Mariani"]
  r_inseme["inseme"]
  r_inox["Inox"]
  r_registre_mariani["registre-mariani"]
  r_ubikia["ubikia"]
  r_jeanhuguesrobert["JeanHuguesRobert"]
  r_privai["privai"]
  r_gouvernance["gouvernance"]
  r_marianivillage["marianivillage"]
  r_institut_mariani["institut-mariani"]
  r_kudos["Kudos"]
  r_github[".github"]
  r_jeanhuguesrobert -->|171| r_barons_mariani
  r_jeanhuguesrobert -->|104| r_cogentia
  r_cogentia -->|98| r_barons_mariani
  r_barons_mariani -->|62| r_cogentia
  r_jeanhuguesrobert -->|45| r_marenostrum
  r_fractavolta -->|41| r_cogentia
  r_fractavolta -->|37| r_marenostrum
  r_jeanhuguesrobert -->|32| r_fractavolta
  r_barons_mariani -->|23| r_marenostrum
  r_cogentia -->|22| r_inseme
  r_jeanhuguesrobert -->|21| r_inox
  r_cogentia -->|19| r_marenostrum
  r_fractavolta -->|18| r_inseme
  r_fractavolta -->|18| r_barons_mariani
  r_jeanhuguesrobert -->|18| r_inseme
  r_jeanhuguesrobert -->|18| r_kudos
  r_barons_mariani -->|17| r_fractavolta
  r_barons_mariani -->|16| r_inseme
  r_inseme -->|15| r_cogentia
  r_marenostrum -->|13| r_cogentia
  r_marenostrum -->|12| r_fractavolta
  r_inox -->|11| r_barons_mariani
  r_inox -->|11| r_cogentia
  r_marenostrum -->|11| r_barons_mariani
  r_inox -->|10| r_fractavolta
  r_fractavolta -->|8| r_inox
  r_inox -->|8| r_marenostrum
  r_jeanhuguesrobert -->|8| r_ubikia
  r_inox -->|7| r_inseme
  r_inseme -->|7| r_inox
  r_jeanhuguesrobert -->|7| r_privai
  r_barons_mariani -->|5| r_inox
  r_barons_mariani -->|5| r_jeanhuguesrobert
  r_cogentia -->|5| r_fractavolta
  r_jeanhuguesrobert -->|5| r_gouvernance
  r_barons_mariani -->|4| r_ubikia
  r_cogentia -->|4| r_jeanhuguesrobert
  r_marianivillage -->|4| r_fractavolta
  r_github -->|3| r_gouvernance
  r_inseme -->|3| r_barons_mariani
  r_inseme -->|3| r_jeanhuguesrobert
  r_kudos -->|3| r_barons_mariani
  r_cogentia -->|2| r_inox
  r_fractavolta -->|2| r_jeanhuguesrobert
  r_gouvernance -->|2| r_barons_mariani
  r_gouvernance -->|2| r_fractavolta
  r_inox -->|2| r_jeanhuguesrobert
  r_inseme -->|2| r_marenostrum
  r_inseme -->|2| r_fractavolta
  r_institut_mariani -->|2| r_barons_mariani
  r_institut_mariani -->|2| r_fractavolta
  r_jeanhuguesrobert -->|2| r_institut_mariani
  r_jeanhuguesrobert -->|2| r_marianivillage
  r_marenostrum -->|2| r_jeanhuguesrobert
  r_marenostrum -->|2| r_inseme
  r_marenostrum -->|2| r_inox
  r_privai -->|2| r_institut_mariani
  r_github -->|1| r_institut_mariani
  r_gouvernance -->|1| r_jeanhuguesrobert
  r_gouvernance -->|1| r_cogentia
  r_gouvernance -->|1| r_inseme
  r_gouvernance -->|1| r_marenostrum
  r_gouvernance -->|1| r_inox
  r_gouvernance -->|1| r_kudos
  r_gouvernance -->|1| r_marianivillage
  r_inseme -->|1| r_ubikia
  r_institut_mariani -->|1| r_privai
  r_institut_mariani -->|1| r_kudos
  r_institut_mariani -->|1| r_marianivillage
  r_institut_mariani -->|1| r_inseme
  r_institut_mariani -->|1| r_cogentia
  r_institut_mariani -->|1| r_marenostrum
  r_institut_mariani -->|1| r_inox
  r_kudos -->|1| r_institut_mariani
  r_marianivillage -->|1| r_institut_mariani
  r_ubikia -->|1| r_cogentia
```
<!-- END_AUTO: graph -->
---

## Concepts
<!-- BEGIN_AUTO: concepts -->
| Concept | Scope | Status | Type |
|---|---|---|---|
| [Civilizational Stakes](./concepts.md#civilizational-stakes) | - | - | - |
| [Machine à explorer](./concepts.md#machine-a-explorer) | Global | Seed | abstract concept / infrastructure protocol |
| [Machine à empêcher](./concepts.md#machine-a-empecher) | Global | Seed | abstract concept |
| [Effet Ubik](./concepts.md#effet-ubik) | Global | Working | sociological / infrastructural pathology |
| [Stabilisateurs (anti-Ubik / procéduraux)](./concepts.md#stabilisateurs-anti-ubik-proceduraux) | Global | Working | mechanism / anti-capture pattern |
| [Cogentia](./concepts.md#cogentia) | - | - | - |
| [Cogentigram](./concepts.md#cogentigram) | Global | Working | representation / map |
| [Continuation Protocol](./concepts.md#continuation-protocol) | Global | Operational | protocol |
| [Non-deterministic Cognitive Step (Agentic Step)](./concepts.md#non-deterministic-cognitive-step-agentic-step) | - | - | process concept **Scope:** Global **Status:** Working |
| [Human Enacted Decision Artifact](./concepts.md#human-enacted-decision-artifact) | - | - | artifact type / imputability anchor **Scope:** Global **Status:** Working |
| [Causal Trace Replay (Auditable Causal Reconstruction)](./concepts.md#causal-trace-replay-auditable-causal-reconstruction) | - | - | audit / replay mechanism **Scope:** Global **Status:** Working |
| [Cognitive Packet](./concepts.md#cognitive-packet) | Global | Defined | protocol / envelope+payload format |
| [Cogentia Commons](./concepts.md#cogentia-commons) | Global | Canonical | methodology |
| [Cogentia Pipeline](./concepts.md#cogentia-pipeline) | Global | Defined | methodology / packet-based transformation network |
| [Derived Product](./concepts.md#derived-product) | Global | Defined | editorial form / publication mode |
| [Sovereign Digital Twin](./concepts.md#sovereign-digital-twin) | Global | Defined | system model |
| [Agent-Resumable CLI](./concepts.md#agent-resumable-cli) | Global | Operational | architecture |
| [Kernel Extractor](./concepts.md#kernel-extractor) | repository-specific | Working | mechanism |
| [KYS (Know Your System) / Psychocognitive Analysis](./concepts.md#kys-know-your-system-psychocognitive-analysis) | project-specific | Working | protocol |
| [Cogentia Workflows](./concepts.md#cogentia-workflows) | repository-specific | Defined | system model |
<!-- END_AUTO: concepts -->
## Concept Graph
<!-- BEGIN_AUTO: concept_graph -->
```mermaid
graph LR
  c_civilizational_stakes["Civilizational Stakes"]
  c_machine_a_explorer["Machine à explorer"]
  c_machine_a_empecher["Machine à empêcher"]
  c_effet_ubik["Effet Ubik"]
  c_stabilisateurs_anti_ubik_proceduraux["Stabilisateurs (anti-Ubik / procéduraux)"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_continuation_protocol["Continuation Protocol"]
  c_non_deterministic_cognitive_step_agentic_step["Non-deterministic Cognitive Step (Agentic Step)"]
  c_human_enacted_decision_artifact["Human Enacted Decision Artifact"]
  c_causal_trace_replay_auditable_causal_reconstruction["Causal Trace Replay (Auditable Causal Reconstruction)"]
  c_cognitive_packet["Cognitive Packet"]
  c_cogentia_commons["Cogentia Commons"]
  c_cogentia_pipeline["Cogentia Pipeline"]
  c_derived_product["Derived Product"]
  c_sovereign_digital_twin["Sovereign Digital Twin"]
  c_agent_resumable_cli["Agent-Resumable CLI"]
  c_kernel_extractor["Kernel Extractor"]
  c_kys_know_your_system_psychocognitive_analysis["KYS (Know Your System) / Psychocognitive Analysis"]
  c_cogentia_workflows["Cogentia Workflows"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_ipn_inference_packet_network["IPN (Inference Packet Network)"]
  c_epn_energy_packet_network["EPN (Energy Packet Network)"]
  c_pgn_power_generation_node["PGN (Power Generation Node)"]
  c_packet_attractors["Packet Attractors"]
  c_the_unconscious_grid["The Unconscious Grid"]
  c_mariani_village["Mariani Village"]
  c_value_shaped_solar["Value-Shaped Solar"]
  c_containerized_compute_tera["Containerized Compute (Tera)"]
  c_traceable_governance["Traceable Governance"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_dhitl_democratic_human_in_the_loop["DHITL (Democratic Human In The Loop)"]
  c_cxu_compute_and_exergy_unit["CXU (Compute and Exergy Unit)"]
  c_safe_compute_exergy["Safe Compute Exergy"]
  c_constellia["Constellia"]
  c_corsica_forest_synergies["Corsica Forest Synergies"]
  c_infrastructure_is_all_you_need["Infrastructure is All You Need"]
  c_sun_to_sovereignty["Sun to Sovereignty"]
  c_civilizational_stakes["Civilizational Stakes"]
  c_machine_a_explorer["Machine à explorer"]
  c_machine_a_empecher["Machine à empêcher"]
  c_effet_ubik["Effet Ubik"]
  c_stabilisateurs_anti_ubik_proceduraux["Stabilisateurs (anti-Ubik / procéduraux)"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_potentics["Potentics"]
  c_cognitive_waves["Cognitive Waves"]
  c_mimetic_desynchronization["Mimetic Desynchronization"]
  c_invidia["Invidia"]
  c_transition_markets["Transition Markets"]
  c_the_uchronian_museum["The Uchronian Museum"]
  c_possibilism["Possibilism"]
  c_territoires_possibilistes["Territoires Possibilistes"]
  c_autonomie_de_capacite["Autonomie de capacité"]
  c_kudocracy["Kudocracy"]
  c_kudos["Kudos"]
  c_pathologie_du_secret["Pathologie du secret"]
  c_the_second_method["The Second Method"]
  c_projet_minesteggio["Projet Minesteggio"]
  c_discret_holography["Discret Holography"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_cop_continuous_operation_protocol["COP (Continuous Operation Protocol)"]
  c_briques["Briques"]
  c_kudocracy["Kudocracy"]
  c_agora["Agora"]
  c_ophelia["Ophélia"]
  c_cop_invariants["COP Invariants"]
  c_non_deterministic_cognitive_step_agentic_step["Non-deterministic Cognitive Step (Agentic Step)"]
  c_human_enacted_decision_artifact["Human Enacted Decision Artifact"]
  c_causal_trace_replay_auditable_causal_reconstruction["Causal Trace Replay (Auditable Causal Reconstruction)"]
  c_cop_cognitive_orchestration_protocol["COP (Cognitive Orchestration Protocol)"]
  c_brique_spec_multi_instance["Brique Spec / Multi-Instance"]
  c_modular_system["Modular System"]
  c_concatenative_language["Concatenative language"]
  c_stack_vm["Stack VM"]
  c_control_data_plane_separation["Control/data plane separation"]
  c_named_values["Named values"]
  c_reactive_sets["Reactive sets"]
  c_actors["Actors"]
  c_dialects["Dialects"]
  c_fractanet["Fractanet"]
  c_cogentia["Cogentia"]
  c_cogentigram["Cogentigram"]
  c_possibilism --> c_machine_a_explorer
  c_democratic_ai_safety --> c_machine_a_explorer
  c_machine_a_explorer --> c_cogentia_commons_declinaison_manuelle
  c_machine_a_explorer --> c_fractanet_cop_declinaison_automatisee
  c_machine_a_explorer --> c_stabilisateurs_anti_ubik
  c_machine_a_explorer -.-> c_continuation_protocol
  c_machine_a_explorer -.-> c_cognitive_packet
  c_machine_a_explorer -.-> c_dhitl_couches_4_5
  c_machine_a_explorer -.-> c_effet_ubik_oppose
  c_machine_a_empecher -.-> c_effet_ubik
  c_machine_a_empecher -.-> c_machine_a_explorer_oppose_symetrique
  c_machine_a_empecher -.-> c_fm_11_outer_optimizer_capture
  c_machine_a_empecher -.-> c_concentration_de_compute_85_frontier
  c_machine_a_empecher --> c_effet_ubik
  c_effet_ubik -.-> c_stabilisateurs_anti_ubik
  c_effet_ubik -.-> c_pathologie_du_secret
  c_effet_ubik -.-> c_invidia_densite_sociale_destructrice
  c_machine_a_explorer --> c_stabilisateurs_anti_ubik_proceduraux
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_effet_ubik
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_continuation_protocol
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_cognitive_packet
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_dhitl_compute_exergy_comme_unite_tracable
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  c_agent_resumable_cli --> c_continuation_protocol
  c_machine_a_explorer --> c_continuation_protocol
  c_continuation_protocol -.-> c_non_deterministic_cognitive_step
  c_continuation_protocol -.-> c_human_enacted_decision_artifact
  c_continuation_protocol -.-> c_causal_trace_replay
  c_machine_a_explorer --> c_non_deterministic_cognitive_step_agentic_step
  c_non_deterministic_cognitive_step_agentic_step -.-> c_human_enacted_decision_artifact
  c_non_deterministic_cognitive_step_agentic_step -.-> c_causal_trace_replay
  c_non_deterministic_cognitive_step_agentic_step -.-> c_continuation_protocol
  c_machine_a_explorer --> c_human_enacted_decision_artifact
  c_cop_hitl_profile --> c_human_enacted_decision_artifact
  c_human_enacted_decision_artifact -.-> c_non_deterministic_cognitive_step
  c_human_enacted_decision_artifact -.-> c_rule_0_seconde_methode
  c_human_enacted_decision_artifact -.-> c_dhitl_layer_5
  c_cop_invariants --> c_causal_trace_replay_auditable_causal_reconstruction
  c_machine_a_explorer --> c_causal_trace_replay_auditable_causal_reconstruction
  c_causal_trace_replay_auditable_causal_reconstruction -.-> c_continuation_protocol
  c_causal_trace_replay_auditable_causal_reconstruction -.-> c_non_deterministic_cognitive_step
  c_continuation_protocol --> c_cognitive_packet
  c_agent_resumable_cli --> c_cognitive_packet
  c_cognitive_packet --> c_envelope_kind_agnostic_metadata_layer
  c_cognitive_packet --> c_payload_kind_specific_content_layer
  c_cognitive_packet --> c_continuation_payload
  c_cognitive_packet --> c_objection_payload
  c_cognitive_packet --> c_hypothesis_payload
  c_cognitive_packet --> c_decision_payload
  c_cognitive_packet --> c_failure_payload
  c_cognitive_packet --> c_routing_payload
  c_cognitive_packet -.-> c_cogentia_commons
  c_cogentia_commons --> c_cogentia_pipeline
  c_cognitive_packet --> c_cogentia_pipeline
  c_cogentia_pipeline --> c_source_document
  c_cogentia_pipeline --> c_derived_product
  c_cogentia_pipeline --> c_derived_product
  c_derived_product -.-> c_source_document
  c_traceable_agency --> c_cogentia
  c_cogentia --> c_cogentigram
  c_cogentia --> c_operational_memory
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  c_traceable_agency --> c_cogentia
  c_cogentia --> c_cogentigram
  c_cogentia --> c_operational_memory
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  c_dhitl --> c_infrastructure_is_all_you_need
  c_possibilism --> c_machine_a_explorer
  c_democratic_ai_safety --> c_machine_a_explorer
  c_machine_a_explorer --> c_cogentia_commons_declinaison_manuelle
  c_machine_a_explorer --> c_fractanet_cop_declinaison_automatisee
  c_machine_a_explorer --> c_stabilisateurs_anti_ubik
  c_machine_a_explorer -.-> c_continuation_protocol
  c_machine_a_explorer -.-> c_cognitive_packet
  c_machine_a_explorer -.-> c_dhitl_couches_4_5
  c_machine_a_explorer -.-> c_effet_ubik_oppose
  c_machine_a_empecher -.-> c_effet_ubik
  c_machine_a_empecher -.-> c_machine_a_explorer_oppose_symetrique
  c_machine_a_empecher -.-> c_fm_11_outer_optimizer_capture
  c_machine_a_empecher -.-> c_concentration_de_compute_85_frontier
  c_machine_a_empecher --> c_effet_ubik
  c_effet_ubik -.-> c_stabilisateurs_anti_ubik
  c_effet_ubik -.-> c_pathologie_du_secret
  c_effet_ubik -.-> c_invidia_densite_sociale_destructrice
  c_machine_a_explorer --> c_stabilisateurs_anti_ubik_proceduraux
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_effet_ubik
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_continuation_protocol
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_cognitive_packet
  c_stabilisateurs_anti_ubik_proceduraux -.-> c_dhitl_compute_exergy_comme_unite_tracable
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  c_possibilism --> c_autonomie_de_capacite
  c_capabilities_approach_sen_nussbaum --> c_autonomie_de_capacite
  c_autonomie_de_capacite --> c_specificite_de_phase
  c_autonomie_de_capacite --> c_flexibilite_d_usage_redistributive_vs_predatory
  c_autonomie_de_capacite -.-> c_territoires_possibilistes
  c_autonomie_de_capacite -.-> c_auto_institution_democratique_castoriadis
  c_possibilism --> c_kudocracy
  c_auto_institution_democratique_castoriadis --> c_kudocracy
  c_kudocracy -.-> c_autonomie_de_capacite
  c_kudocracy -.-> c_kudos
  c_kudocracy -.-> c_pathologie_du_secret
  c_kudocracy -.-> c_cognitive_packet
  c_possibilism --> c_kudos
  c_communs_ostrom --> c_kudos
  c_kudos -.-> c_kudocracy
  c_kudos -.-> c_autonomie_de_capacite
  c_kudos -.-> c_mauss_gift_counter_gift
  c_democratic_ai_safety_thesis_kernel --> c_pathologie_du_secret
  c_the_second_method --> c_pathologie_du_secret
  c_pathologie_du_secret -.-> c_dhitl_democratic_humans_in_the_loop
  c_pathologie_du_secret -.-> c_cogentia_commons_auditable_knowledge
  c_pathologie_du_secret -.-> c_tracabilite_civique_anti_mafieuse
  c_traceable_agency --> c_cogentia
  c_cogentia --> c_cogentigram
  c_cogentia --> c_operational_memory
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  c_machine_a_explorer --> c_cop_invariants
  c_stabilisateurs_anti_ubik_proceduraux --> c_cop_invariants
  c_machine_a_explorer --> c_non_deterministic_cognitive_step_agentic_step
  c_non_deterministic_cognitive_step_agentic_step -.-> c_human_enacted_decision_artifact
  c_non_deterministic_cognitive_step_agentic_step -.-> c_causal_trace_replay
  c_machine_a_explorer --> c_human_enacted_decision_artifact
  c_cop_hitl_profile --> c_human_enacted_decision_artifact
  c_human_enacted_decision_artifact -.-> c_non_deterministic_cognitive_step
  c_human_enacted_decision_artifact -.-> c_rule_0_seconde_methode
  c_human_enacted_decision_artifact -.-> c_dhitl_layer_5
  c_cop_invariants --> c_causal_trace_replay_auditable_causal_reconstruction
  c_machine_a_explorer --> c_causal_trace_replay_auditable_causal_reconstruction
  c_causal_trace_replay_auditable_causal_reconstruction -.-> c_deterministic_replay_protocol_layer_only
  c_causal_trace_replay_auditable_causal_reconstruction -.-> c_non_deterministic_cognitive_step
  c_concatenative_language -.-> c_stack_vm
  c_concatenative_language -.-> c_named_values
  c_stack_vm -.-> c_concatenative_language
  c_stack_vm -.-> c_control_data_plane_separation
  c_stack_vm -.-> c_named_values
  c_stack_vm --> c_control_data_plane_separation
  c_control_data_plane_separation -.-> c_energy_packet_network_fractavolta
  c_control_data_plane_separation -.-> c_cognitive_packet_envelope_payload_cogentia
  c_stack_vm --> c_named_values
  c_fractanet -.-> c_energy_packet_network_fractavolta
  c_fractanet -.-> c_auxilia_inseme_brique_human_scale_fractanet_exchange
  c_fractanet -.-> c_actors
  c_traceable_agency --> c_cogentia
  c_cogentia --> c_cogentigram
  c_cogentia --> c_operational_memory
  c_cogentia --> c_cogentigram
  c_cogentigram -.-> c_map_vs_territory
  c_cogentigram -.-> c_operational_memory
  c_cogentigram -.-> c_traceable_agency
  click c_civilizational_stakes "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#civilizational-stakes" "Open Civilizational Stakes"
  click c_machine_a_explorer "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#machine-a-explorer" "Open Machine à explorer"
  click c_machine_a_empecher "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#machine-a-empecher" "Open Machine à empêcher"
  click c_effet_ubik "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#effet-ubik" "Open Effet Ubik"
  click c_stabilisateurs_anti_ubik_proceduraux "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#stabilisateurs-anti-ubik-proceduraux" "Open Stabilisateurs (anti-Ubik / procéduraux)"
  click c_cogentia "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
  click c_continuation_protocol "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#continuation-protocol" "Open Continuation Protocol"
  click c_non_deterministic_cognitive_step_agentic_step "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#non-deterministic-cognitive-step-agentic-step" "Open Non-deterministic Cognitive Step (Agentic Step)"
  click c_human_enacted_decision_artifact "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#human-enacted-decision-artifact" "Open Human Enacted Decision Artifact"
  click c_causal_trace_replay_auditable_causal_reconstruction "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#causal-trace-replay-auditable-causal-reconstruction" "Open Causal Trace Replay (Auditable Causal Reconstruction)"
  click c_cognitive_packet "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cognitive-packet" "Open Cognitive Packet"
  click c_cogentia_commons "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cogentia-commons" "Open Cogentia Commons"
  click c_cogentia_pipeline "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cogentia-pipeline" "Open Cogentia Pipeline"
  click c_derived_product "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#derived-product" "Open Derived Product"
  click c_sovereign_digital_twin "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#sovereign-digital-twin" "Open Sovereign Digital Twin"
  click c_agent_resumable_cli "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#agent-resumable-cli" "Open Agent-Resumable CLI"
  click c_kernel_extractor "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#kernel-extractor" "Open Kernel Extractor"
  click c_kys_know_your_system_psychocognitive_analysis "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#kys-know-your-system-psychocognitive-analysis" "Open KYS (Know Your System) / Psychocognitive Analysis"
  click c_cogentia_workflows "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md#cogentia-workflows" "Open Cogentia Workflows"
  click c_cogentia "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
  click c_ipn_inference_packet_network "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#ipn-inference-packet-network" "Open IPN (Inference Packet Network)"
  click c_epn_energy_packet_network "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#epn-energy-packet-network" "Open EPN (Energy Packet Network)"
  click c_pgn_power_generation_node "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#pgn-power-generation-node" "Open PGN (Power Generation Node)"
  click c_packet_attractors "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#packet-attractors" "Open Packet Attractors"
  click c_the_unconscious_grid "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#the-unconscious-grid" "Open The Unconscious Grid"
  click c_mariani_village "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#mariani-village" "Open Mariani Village"
  click c_value_shaped_solar "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#value-shaped-solar" "Open Value-Shaped Solar"
  click c_containerized_compute_tera "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#containerized-compute-tera" "Open Containerized Compute (Tera)"
  click c_traceable_governance "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/concepts.md#traceable-governance" "Open Traceable Governance"
  click c_cogentia "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
  click c_dhitl_democratic_human_in_the_loop "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#dhitl-democratic-human-in-the-loop" "Open DHITL (Democratic Human In The Loop)"
  click c_cxu_compute_and_exergy_unit "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#cxu-compute-and-exergy-unit" "Open CXU (Compute and Exergy Unit)"
  click c_safe_compute_exergy "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#safe-compute-exergy" "Open Safe Compute Exergy"
  click c_constellia "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#constellia" "Open Constellia"
  click c_corsica_forest_synergies "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#corsica-forest-synergies" "Open Corsica Forest Synergies"
  click c_infrastructure_is_all_you_need "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#infrastructure-is-all-you-need" "Open Infrastructure is All You Need"
  click c_sun_to_sovereignty "https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/concepts.md#sun-to-sovereignty" "Open Sun to Sovereignty"
  click c_civilizational_stakes "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#civilizational-stakes" "Open Civilizational Stakes"
  click c_machine_a_explorer "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#machine-a-explorer" "Open Machine à explorer"
  click c_machine_a_empecher "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#machine-a-empecher" "Open Machine à empêcher"
  click c_effet_ubik "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#effet-ubik" "Open Effet Ubik"
  click c_stabilisateurs_anti_ubik_proceduraux "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#stabilisateurs-anti-ubik-proceduraux" "Open Stabilisateurs (anti-Ubik / procéduraux)"
  click c_cogentia "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
  click c_potentics "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#potentics" "Open Potentics"
  click c_cognitive_waves "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#cognitive-waves" "Open Cognitive Waves"
  click c_mimetic_desynchronization "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#mimetic-desynchronization" "Open Mimetic Desynchronization"
  click c_invidia "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#invidia" "Open Invidia"
  click c_transition_markets "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#transition-markets" "Open Transition Markets"
  click c_the_uchronian_museum "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#the-uchronian-museum" "Open The Uchronian Museum"
  click c_possibilism "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#possibilism" "Open Possibilism"
  click c_territoires_possibilistes "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#territoires-possibilistes" "Open Territoires Possibilistes"
  click c_autonomie_de_capacite "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#autonomie-de-capacite" "Open Autonomie de capacité"
  click c_kudocracy "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#kudocracy" "Open Kudocracy"
  click c_kudos "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#kudos" "Open Kudos"
  click c_pathologie_du_secret "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#pathologie-du-secret" "Open Pathologie du secret"
  click c_the_second_method "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#the-second-method" "Open The Second Method"
  click c_projet_minesteggio "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#projet-minesteggio" "Open Projet Minesteggio"
  click c_discret_holography "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/concepts.md#discret-holography" "Open Discret Holography"
  click c_cogentia "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
  click c_cop_continuous_operation_protocol "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#cop-continuous-operation-protocol" "Open COP (Continuous Operation Protocol)"
  click c_briques "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#briques" "Open Briques"
  click c_kudocracy "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#kudocracy" "Open Kudocracy"
  click c_agora "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#agora" "Open Agora"
  click c_ophelia "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#ophelia" "Open Ophélia"
  click c_cop_invariants "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#cop-invariants" "Open COP Invariants"
  click c_non_deterministic_cognitive_step_agentic_step "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#non-deterministic-cognitive-step-agentic-step" "Open Non-deterministic Cognitive Step (Agentic Step)"
  click c_human_enacted_decision_artifact "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#human-enacted-decision-artifact" "Open Human Enacted Decision Artifact"
  click c_causal_trace_replay_auditable_causal_reconstruction "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#causal-trace-replay-auditable-causal-reconstruction" "Open Causal Trace Replay (Auditable Causal Reconstruction)"
  click c_cop_cognitive_orchestration_protocol "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#cop-cognitive-orchestration-protocol" "Open COP (Cognitive Orchestration Protocol)"
  click c_brique_spec_multi_instance "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#brique-spec-multi-instance" "Open Brique Spec / Multi-Instance"
  click c_modular_system "https://github.com/JeanHuguesRobert/inseme/blob/main/research/concepts.md#modular-system" "Open Modular System"
  click c_concatenative_language "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#concatenative-language" "Open Concatenative language"
  click c_stack_vm "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#stack-vm" "Open Stack VM"
  click c_control_data_plane_separation "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#control-data-plane-separation" "Open Control/data plane separation"
  click c_named_values "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#named-values" "Open Named values"
  click c_reactive_sets "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#reactive-sets" "Open Reactive sets"
  click c_actors "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#actors" "Open Actors"
  click c_dialects "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#dialects" "Open Dialects"
  click c_fractanet "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#fractanet" "Open Fractanet"
  click c_cogentia "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/concepts.md#cogentia" "Open Cogentia"
  click c_cogentigram "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/concepts.md#cogentigram" "Open Cogentigram"
```

*Orphan concepts: `Civilizational Stakes` (cogentia), `Cogentia` (cogentia), `Cogentia Commons` (cogentia), `Sovereign Digital Twin` (cogentia), `Agent-Resumable CLI` (cogentia), `Kernel Extractor` (cogentia), `KYS (Know Your System) / Psychocognitive Analysis` (cogentia), `Cogentia Workflows` (cogentia), `IPN (Inference Packet Network)` (FractaVolta), `EPN (Energy Packet Network)` (FractaVolta), `PGN (Power Generation Node)` (FractaVolta), `Packet Attractors` (FractaVolta), `The Unconscious Grid` (FractaVolta), `Mariani Village` (FractaVolta), `Value-Shaped Solar` (FractaVolta), `Containerized Compute (Tera)` (FractaVolta), `Traceable Governance` (FractaVolta), `DHITL (Democratic Human In The Loop)` (marenostrum), `CXU (Compute and Exergy Unit)` (marenostrum), `Safe Compute Exergy` (marenostrum), `Constellia` (marenostrum), `Corsica Forest Synergies` (marenostrum), `Sun to Sovereignty` (marenostrum), `Civilizational Stakes` (barons-Mariani), `Cogentia` (barons-Mariani), `Potentics` (barons-Mariani), `Cognitive Waves` (barons-Mariani), `Mimetic Desynchronization` (barons-Mariani), `Invidia` (barons-Mariani), `Transition Markets` (barons-Mariani), `The Uchronian Museum` (barons-Mariani), `Possibilism` (barons-Mariani), `Territoires Possibilistes` (barons-Mariani), `The Second Method` (barons-Mariani), `Projet Minesteggio` (barons-Mariani), `Discret Holography` (barons-Mariani), `COP (Continuous Operation Protocol)` (inseme), `Briques` (inseme), `Kudocracy` (inseme), `Agora` (inseme), `Ophélia` (inseme), `COP (Cognitive Orchestration Protocol)` (inseme), `Brique Spec / Multi-Instance` (inseme), `Modular System` (inseme), `Reactive sets` (Inox), `Actors` (Inox), `Dialects` (Inox).*

*Referenced but undefined: `Democratic AI Safety`, `Cogentia Commons (déclinaison manuelle)`, `Fractanet / COP (déclinaison automatisée)`, `Stabilisateurs (anti-Ubik)`, `DHITL (couches 4/5)`, `Effet Ubik (opposé)`, `Machine à explorer (opposé symétrique)`, `FM-11 (outer optimizer capture)`, `Concentration de compute (85% frontier)`, `Invidia (densité sociale destructrice)`, `DHITL (Compute Exergy comme unité traçable)`, `Map vs territory`, `Operational memory`, `Traceable agency`, `Non-deterministic Cognitive Step`, `Causal Trace Replay`, `COP/HITL Profile`, `Rule 0 (seconde méthode)`, `DHITL Layer 5`, `Envelope (kind-agnostic metadata layer)`, `Payload (kind-specific content layer)`, `Continuation payload`, `Objection payload`, `Hypothesis payload`, `Decision payload`, `Failure payload`, `Routing payload`, `Source Document`, `DHITL`, `Capabilities approach (Sen, Nussbaum)`, `Spécificité de phase`, `Flexibilité d'usage (redistributive vs. predatory)`, `Auto-institution démocratique (Castoriadis)`, `Communs (Ostrom)`, `Mauss — gift / counter-gift`, `Democratic AI Safety (thesis kernel)`, `DHITL — Democratic Humans in the Loop`, `Cogentia Commons (auditable knowledge)`, `Traçabilité civique anti-mafieuse`, `Deterministic Replay (protocol layer only)`, `Energy Packet Network (FractaVolta)`, `Cognitive Packet envelope/payload (Cogentia)`, `Auxilia (Inseme brique — human-scale Fractanet exchange)`.*
<!-- END_AUTO: concept_graph -->
---

## Published in this repo
<!-- BEGIN_AUTO: published -->
| Title | Location | Date |
|---|---|---|
| [**Cogentia — the framework, in five distinctive moves**](../COGENTIA.md) *(identity document; entry point)* | this repo | 2026-05-13 |
| [Lien avec C.O.R.S.I.C.A., l’Institut Mariani et PrivAI](acorsica-institut-mariani.md) *(institutional boundary note — documentary links without institutional confusion)* | this repo | 2026-06-03 |
| [Agent-Resumable CLI — Externalized Judgment, Continuations, and Provider-Neutral Resumption for AI-Compatible CLI Tools](agent_resumable_cli.md) *(defines the v1 continuation pattern; current `scripts/cogentia.js continuation` uses the v2 operational surface)* | this repo | 2026-05-14 |
| [Cognitive Packets — An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation](cognitive_packets.md) *(working paper v0.3 — envelope/payload split ; paired operational prompt in [`prompts/cognitive_packet.md`](../prompts/cognitive_packet.md))* | this repo | 2026-05-21 |
| [Pipeline — From cognitive packets to source documents and derived products](pipeline.md) *(method note v0.4 — packet-switched, self-applicative; canonical operational method of the corpus)* | this repo | 2026-05-25 |
| [Derived Products — Versioned Source Corpora, Situated Forms, and Publication Agents](derived_products.md) *(working paper v0.2 — source ↔ derived split; companion to [`pipeline.md`](pipeline.md))* | this repo | 2026-05-23 |
| [cogentia.js - Tutorial and Near-Specification](cogentia_js_tutorial.md) *(generated automatically from the current v2 CLI and corpus docs; derived operational walkthrough, not a sovereign source document)* | this repo | 2026-06-16 |
| [Self-Contained Documents in an Interconnected Corpus](self_contained_documents.md) *(method note v0.3 — formalises the auto-portance principle: a document may cite/extend/transform other texts, but its main claims remain assessable without prior external reading; emerged from work on `traceabilite_des_actes`)* | this repo | 2026-05-27 |
| [Traçabilité symétrique et capture relationnelle](tracabilite_symetrique_capture_relationnelle.md) *(working paper v0.4 — consolidated draft for review; concept de « capture relationnelle par architecture de canal »; email vs portails propriétaires, preuve opposable, rééquilibrage individu / personne morale; lié à Interaction Packets et Autonomie de Capacité)* | this repo | 2026-05-29 |
| [Persistence Backends — cadre minimum suffisant (FR)](persistence_backends.md) *(working-note v0.1 — git+GitHub n'est qu'une instance ; six couches (A–F), points GitHub-tied identifiés, seam d'adapter esquissé mais non-implémenté ; trace d'antériorité, pas une roadmap)* | this repo | 2026-05-30 |
| [Simplicité d'action — KISS, Small is beautiful, Worse is better (FR)](simplicite_action.md) *(working-note v0.1 — éthique de l'action contre la sur-ingénierie, l'analysis paralysis et les pieds qui décollent du sol ; rigueur sur la trace, simplicité sur le geste)* | this repo | 2026-05-30 |
| [Cogentia Workflows](cogentia_workflows.md) *(private/group/public/federated workflow architecture, draft v0.2)* | this repo | 2026-05-11 |
| [Cogentia Commons Working Paper](Cogentia_Commons_Working_Paper.md) | this repo | 2026 |
| [Cogentia Commons — Public by Default, Private by Exception](cogentia_commons_visibility_and_private_modes.md) *(source document v0.1 — visibility modes, private communities, patent-oriented exploration, and private-use financing of the commons; addresses cogentia#34)* | this repo | 2026-06-09 |
| [Cogentia and Cogentigram](Cogentia-and-Cogentigram.md) | this repo | 2026 |
| [The Sovereign Digital Twin — Cogentia, Cogentigram, Cogentiscope](cogentia-digital-twin.md) | this repo | 2026-04 |
| [Cogentia Personal Data Portability](cogentia_personal_data_portability.md) *(generic reusable layer for schemas, templates, normalizers and redacted/fictitious examples; explicitly separated from any private personal register)* | this repo | 2026-06-11 |
| [Agent Configuration Layer](agent_configuration_layer.md) *(method note v0.2 — AGENTS.md, `.agents/`, and governed operational projections of the corpus)* | this repo | 2026-06-13 |
| [Pipeline Conversation vers Corpus (Conversia)](conversation_to_corpus_pipeline.md) *(source document v0.4 — progressive transformation of conversations into living corpus, models, agents, mandates and traces)* | this repo | 2026-06-12 |
| [Démocratie de capacité](democracy_of_capability.md) *(structured hypothesis — publics capables, open democracy and AI under mandate)* | this repo | 2026-06-12 |
| [Démocratie rapide mandatée](mandated_fast_democracy.md) *(short conceptual synthesis — deciding quickly without abandoning democratic principles)* | this repo | 2026-06-12 |
| [From Biometrics and Psychometrics to Structural Signatures](structural_signatures.md) *(working paper v0.9 — non-biographical identifying structures, Cogentigrams and consent-based sovereign digital twins)* | this repo | 2026-05-22 |
| [Cogentigraphic Distillation](cogentigraphic_distillation.md) *(working paper v0.1 — separating cognitive operating rules from biographical and factual memory in corpus-grounded AI agents)* | this repo | 2026-05-30 |
| [Individual and Collective Digital Twins](individual_and_collective_digital_twins.md) *(working paper v0.1 — dialectic between sovereign twins of natural persons (Marie-Louise case) and of legal persons (C.O.R.S.I.C.A. case); extends the twin family — Cogentigram, structural signatures, cogentigraphic distillation; addresses cogentia#14)* | this repo | 2026-05-31 |
| [Democratic AI Safety — alias](democratic_ai_safety.md) *(canonical in barons-Mariani; this file is now a stub)* | this repo | 2026-05-18 |
| [KYS — Psychocognitive Analysis Protocol v1.0](kys-prompt.md) | this repo | 2026 |
| [COGENTIA v1.0 — Prompt d'analyse psychocognitive (FR)](cogentia_prompt_v1.md) | this repo | 2026 |
| [Cognitive Packet Switching — A Protocol Layer for Routable Ideas, Continuations, and Agent Orchestration](cognitive_packet_switching.md) *(published source document v1.0 — extends the cognitive packets envelope/payload model into a switching/routing layer)* | this repo | 2026-06-01 |
| [Concept Situation Briefs — A Derived Product Category for Locating Ideas in Origin, Lineage, Neighborhood, Current Relevance, and Use](concept_situation_briefs.md) *(published source document v1.0 — defines a new derived product category)* | this repo | 2026-06-01 |
| [Cognitive Programming](cognitive_programming.md) *(working paper v0.1.1 — programming model for cognitive operations, packetized work, and reviewable source artifacts)* | this repo | 2026-06-02 |
| [Act, mandate and responsibility](act_mandate_responsibility.md) *(working note — compact doctrine linking action, delegated mandate, and accountability)* | this repo | 2026-06-05 |
| [Concept Situation Brief — Cognitive Packet Switching](derived_products/concept_situation_brief_cognitive_packet_switching.md) *(derived product v0.1 — first concept situation brief, applied to cognitive packet switching)* | this repo | 2026-06-01 |
| [TCP/IP for Ideas: Cognitive Packets for Agent Orchestration](derived_products/tcp_ip_for_ideas_hacker_news.md) *(derived product v0.1 — Hacker News optimized form of Cognitive Packet Switching)* | this repo | 2026-06-01 |
| [Cogentia Commons — Method Packets, Continuations, and the Generative Corpus](cogentia_commons_method_packets.md) *(working paper v0.1 — infrastructure for producing/transmitting/criticising method packets across humans, agents, tools, repos)* | this repo | 2026-05-22 |
| [Generator, Production, Instillation — Discrete Propagation and Operational Expression in a Reactive Corpus](generator_production_instillation.md) *(working-note v0.2)* | this repo | 2026-05-31 |
| [Ideas to Explore as GitHub Issues — A lightweight memory category for open-ended explorations](ideas_to_explore_as_issues.md) *(working-note v0.4)* | this repo | 2026-06-01 |
| [Corpus Status](corpus-status.md) *(living view — auto-refreshed by `cogentia.js corpus-status`)* | this repo | refreshable |
| [Concept Index](concepts.md) *(typed concept registry — mapped by `cogentia.js concepts`)* | this repo | refreshable |
| [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md) *(meta-prompt for AI agents — bundle, query, continuation)* | this repo | 2026-05-16 |
| [The Knowledge Mesh (Decentralized Wiki)](../docs/knowledge_mesh.md) *(backlinks, trails, Jekyll — human navigation guide)* | this repo | 2026-05-16 |
| [Trail — From Method to Machine](trails/from_method_to_machine.md) *(curated reading path for newcomers — technical / cognitive infrastructure entry)* | this repo | 2026-05 |
| [Trail — From Autonomia to DHITL](trails/from_autonomia_to_dhitl.md) *(curated reading path for the political / territorial entry into the Democratic AI Safety thesis)* | this repo | 2026-05-18 |
<!-- END_AUTO: published -->
---

## What Is Proved

*Manually curated: claims demonstrated by the published work in this corpus.*

| Claim | Status | Evidence |
|---|---|---|
| Cogentia Commons MVP is fully specifiable as a coherent set of contracts | ✅ Demonstrated | 7 research documents totalling ~4500 lines: [MVP spec](cogentia_commons_mvp_spec.md) v0.10.2 + [COMMUNITY.md sub-spec](cogentia_commons_community_manifest.md) v0.2 + 3 plugin sub-specs + [workflows](cogentia_commons_workflows.md) + [continuation snapshot](cogentia_commons_continuation.md) |
| The CLI face of Cogentia Commons (`cogentia.js`) is operational with 18 commands | ✅ Operational | `scripts/cogentia.js` v0.4.0; see `cogentia.js manifest --json` for the live tool surface |
| Rule 4 ("let the corpus be its own evidence") runs in practice | ✅ Demonstrated | `cogentia.js scan` surfaced a real uncatalogued working paper on 2026-05-13 ([`cogentia_workflows.md`](cogentia_workflows.md)); gap closed by `cogentia.js ref` + index.md edit; this very file is auto-refreshed evidence |
| The 6-repo network is structurally symmetric | ✅ Verified | `cogentia.js graph` shows complete K6 (30 directed cross-references) since 2026-05-26 when Inox was added to every other repo's *Referenced* section; see *Cross-Reference Graph* above |
| Every research document carries its own canonical URL | ✅ Demonstrated | 71+ files stamped with `canonical_url:` in YAML front-matter via `cogentia.js stamp --all` |
| Cogentia Commons can ship as an inseme brique | 🔄 Specified, implementation pending | [MVP spec §12](cogentia_commons_mvp_spec.md) maps the brique deployment in detail; `@inseme/brique-cogentia-commons` package not yet created |
| The CLI is AI-agent-bindable as an OpenAI tool palette | ✅ Demonstrated | `cogentia.js manifest --json` returns OpenAI-compatible `tools[]` with parameters + side_effects; same shape as `brique-actes/brique.config.js` tools array |
| AI-agent state changes can leave a signed reasoning trail | ✅ Demonstrated | `.cogentia/audit.jsonl` captures `--narrative-short`, `--narrative-long`, `--chat-url` per state-changing operation; this very corpus-status refresh is in the log |

---

## Open Objections

*Manually curated: objections received publicly, not yet fully resolved.*

| Objection | Source | Status |
|---|---|---|
| `cogentia.js scan` uses substring-basename matching, not proper markdown link parsing | self-audit (`cogentia_js_doctrine.md` memory + this session) | 🔄 Known doctrinal gap; `.cogentiaignore` works around it but does not replace the principled fix (Rule 4) |
| Brique `@inseme/brique-cogentia-commons` is specified but not implemented | MVP spec §12 (own roadmap) | ❌ Implementation has not started; specs are the deliverable |
| Corpus remains solo-authored — fractal claim unverified at scale | inherited from [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) §"Conditions of Failure" | ❌ Structural — invitation to fork is open, no external forks yet |
| Multi-owner stewardship of `COMMUNITY.md` is single-Founder in v1 | COMMUNITY.md sub-spec §10.1 | 🔄 Named, deferred to v1.1 |
| Retrofit / proxied actors workflow is sketched, schema is reserved, but full protocol is post-v1 | MVP spec §1.4 + Workflow #11 | 🔄 Deliberately deferred; v1 schema honours the future without implementing it |

---

## What Remains Possible
<!-- BEGIN_AUTO: possibilities -->
- Cogentia Commons as methodology for any distributed peer-review process
- Cogentigram as visual language for knowledge graph navigation
- PrivAI governance model — from non-profit to cooperative structure
- [Rendre capable — noyau doctrinal provisoire](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/noyau_doctrinal_rendre_capable.md)
- [Research Index — barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/index.md)
- [Agent-Resumable CLI](agent_resumable_cli.md)
- [Cogentia](../README.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Public by Default, Private by Exception](cogentia_commons_visibility_and_private_modes.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [cogentia.js - Tutorial and Near-Specification](cogentia_js_tutorial.md)
- [Cogentigraphic Distillation](cogentigraphic_distillation.md)
- [Corpus Status — cogentia](corpus-status.md)
- [From Biometrics and Psychometrics to Structural Signatures](structural_signatures.md)
- [Frontmatter Schema — v0.1 (Corpus)](../docs/frontmatter-schema.md)
- [Frontmatter Synonym Mapping — v0.1](../docs/frontmatter-synonym-mapping.md)
- [Research Index — FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/index.md)
- [Research Index — Inox](https://github.com/JeanHuguesRobert/Inox/blob/master/research/index.md)
- [Research Index — Inseme](https://github.com/JeanHuguesRobert/inseme/blob/main/research/index.md)
- [Research Index — Jean Hugues Noël Robert (Profile / Entry Point)](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/index.md)
- [Research Index — MareNostrum](https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/index.md)
<!-- END_AUTO: possibilities -->
---

*Generated with `cogentia.js corpus-status` — [scripts/cogentia.js](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/cogentia.js)*
*Challenge via issues. Fork to explore alternatives.*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia](../COGENTIA.md)
- [Cogentia](../README.md)
- [Frontmatter Schema — v0.1 (Corpus)](../docs/frontmatter-schema.md)
- [Frontmatter Synonym Mapping — v0.1](../docs/frontmatter-synonym-mapping.md)
- [Research Index — Cogentia](index.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
