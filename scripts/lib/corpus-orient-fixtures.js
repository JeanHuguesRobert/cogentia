/**
 * Virgin-agent Reality Test fixtures for corpus.orient (#122).
 *
 * Each must_reach / should_reach target records why it is expected.
 * author_memory alone may reveal a miss; it must not promote a relation.
 */
export const ORIENT_REALITY_FIXTURES = [
  {
    id: "q1-john-vote",
    question: "Can John vote on behalf of Jean Hugues?",
    expected: {
      must_reach: [
        {
          kind: "concept",
          id: "Kudocracy",
          expectation_basis: {
            type: "registry_link",
            evidence: [
              "barons-Mariani/research/concepts.md — Kudocracy: a personal AI agent is a contributor rather than a substitute",
            ],
          },
        },
        {
          kind: "source",
          id: "barons-Mariani/research/kudocracy.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "barons-Mariani/research/kudocracy.md — « L'agent IA personnel ne vote pas à la place du citoyen »",
            ],
          },
        },
      ],
      should_reach: [
        {
          kind: "source",
          id: "cogentia/research/act_mandate_responsibility.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/act_mandate_responsibility.md — acts require actor + role + mandate + represented entity",
            ],
          },
        },
        {
          kind: "source",
          id: "cogentia/research/agent_john_identity.md",
          expectation_basis: {
            type: "author_memory",
            evidence: ["Author hint: John is the named agent persona, not a voting proxy."],
          },
        },
      ],
      must_not_treat_as_canonical: [],
    },
    expectation_basis: { type: "explicit_source", evidence: [] },
    budget: { max_seeds: 5, max_hops: 3, max_nodes: 30 },
    external_research_expected: false,
  },
  {
    id: "q2-autonomous-agent",
    question: "What does autonomous mean for an artificial agent in this Corpus?",
    expected: {
      must_reach: [
        {
          kind: "source",
          id: "cogentia/research/artificial_person_autonomization.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/artificial_person_autonomization.md — autonomization of artificial persons vs technical autonomy",
            ],
          },
        },
      ],
      should_reach: [
        {
          kind: "concept",
          id: "Autonomie de capacité",
          expectation_basis: {
            type: "registry_link",
            evidence: [
              "barons-Mariani/research/concepts.md — territorial capability autonomy; a likely WRONG_ATTRACTOR if treated as agent autonomy",
            ],
          },
        },
        {
          kind: "source",
          id: "cogentia/research/conceptual_gravity.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/conceptual_gravity.md §12 — route Artificial-agent autonomy → Mandated Agent → Mandate → DHITL",
            ],
          },
        },
      ],
      must_not_treat_as_canonical: [
        "Treating territorial Autonomie de capacité as the definition of artificial-agent autonomy",
      ],
    },
    expectation_basis: { type: "explicit_source", evidence: [] },
    budget: { max_seeds: 5, max_hops: 3, max_nodes: 30 },
    external_research_expected: false,
  },
  {
    id: "q3-kudos-packet-routing",
    question: "How do Kudos affect Cognitive Packet routing?",
    expected: {
      must_reach: [
        {
          kind: "concept",
          id: "Kudos",
          expectation_basis: {
            type: "registry_link",
            evidence: ["barons-Mariani/research/concepts.md — Kudos"],
          },
        },
        {
          kind: "concept",
          id: "Cognitive Packet",
          expectation_basis: {
            type: "registry_link",
            evidence: ["cogentia/research/concepts.md — Cognitive Packet"],
          },
        },
        {
          kind: "source",
          id: "cogentia/research/informational_gravity.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/informational_gravity.md §7 — Kudos as one possible stigmergic routing evidence, not mandatory attraction",
            ],
          },
        },
      ],
      should_reach: [
        {
          kind: "concept",
          id: "Packet Attractors (Fractanet routing)",
          expectation_basis: {
            type: "author_memory",
            evidence: [
              "Author hint: packet attractors are the demand/capability routing primitive adjacent to informational gravity",
            ],
          },
        },
      ],
      must_not_treat_as_canonical: [],
    },
    expectation_basis: { type: "explicit_source", evidence: [] },
    budget: { max_seeds: 5, max_hops: 3, max_nodes: 30 },
    external_research_expected: false,
  },
  {
    id: "q4-informational-gravity-packet-attractors",
    question: "What is the relation between Informational Gravity and Packet Attractors?",
    expected: {
      must_reach: [
        {
          kind: "source",
          id: "cogentia/research/informational_gravity.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/informational_gravity.md corpus anchors — Packet Attractor (inseme/research/packet_attractor_fractanet.md)",
            ],
          },
        },
        {
          kind: "concept",
          id: "Packet Attractors (Fractanet routing)",
          expectation_basis: {
            type: "registry_link",
            evidence: ["FractaVolta/research/concepts.md — Packet Attractors (Fractanet routing)"],
          },
        },
      ],
      should_reach: [
        {
          kind: "source",
          id: "cogentia/research/conceptual_gravity.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/conceptual_gravity.md §30 — Conceptual Gravity vs Informational Gravity routing planes",
            ],
          },
        },
      ],
      must_not_treat_as_canonical: [],
    },
    expectation_basis: { type: "explicit_source", evidence: [] },
    budget: { max_seeds: 5, max_hops: 3, max_nodes: 30 },
    external_research_expected: false,
  },
  {
    id: "q5-leave-corpus",
    question: "When should a Cogentia Agent leave the Corpus and perform external research?",
    expected: {
      must_reach: [
        {
          kind: "source",
          id: "cogentia/instructions/AGENTS.shared.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/instructions/AGENTS.shared.md — Living evidence / state-of-the-art invariant",
            ],
          },
        },
        {
          kind: "source",
          id: "cogentia/research/conceptual_gravity.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: [
              "cogentia/research/conceptual_gravity.md §29 — Self-orientation includes knowing when to leave oneself",
            ],
          },
        },
      ],
      should_reach: [
        {
          kind: "source",
          id: "cogentia/research/measured_risk.md",
          expectation_basis: {
            type: "explicit_source",
            evidence: ["cogentia/instructions/AGENTS.shared.md points at research/measured_risk.md"],
          },
        },
        {
          kind: "concept",
          id: "Recursive Reality Test",
          expectation_basis: {
            type: "registry_link",
            evidence: ["cogentia/research/concepts.md — Recursive Reality Test"],
          },
        },
      ],
      must_not_treat_as_canonical: [],
    },
    expectation_basis: { type: "explicit_source", evidence: [] },
    budget: { max_seeds: 5, max_hops: 3, max_nodes: 30 },
    external_research_expected: false,
    boundary_after_corpus: true,
  },
];
