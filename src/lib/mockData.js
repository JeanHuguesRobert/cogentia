export const thesis = {
  title: 'Cogentia Commons',
  core_question: 'How can collaborative exploration remain scientifically disciplined without collapsing into epistemic populism?',
  premises: ['Knowledge advances via contestation and correction.', 'Traceability improves accountability.'],
  references: ['Popper (1963)', 'Kuhn (1962)', 'Ostrom (1990)'],
  constraints: ['No truth-by-vote', 'Explicit epistemic status tags'],
  forbidden_confusions: ['Donations = truth', 'Popularity = validity'],
  expected_audiences: ['Researchers', 'Civic institutions', 'Philanthropic funders'],
  epistemic_status: 'operational proposal'
}

export const reviews = [
  { agent: 'Builder', summary: 'Expanded kernel into staged workflow with artifacts and governance.' },
  { agent: 'Skeptic', summary: 'Questioned status-tag consistency and moderation burden.' },
  { agent: 'Adversary', summary: 'Attacked capture vectors through coordinated donation campaigns.' },
  { agent: 'Historian', summary: 'Connected to peer review history and commons institutions.' },
  { agent: 'Editor-Arbiter', summary: 'Synthesized unresolved risks into explicit roadmap.' }
]

export const trace = [
  { version: 1, event: 'Kernel created', objectionsAccepted: 0, objectionsRejected: 0, unresolved: 4 },
  { version: 2, event: 'Skeptic pass', objectionsAccepted: 3, objectionsRejected: 1, unresolved: 5 },
  { version: 3, event: 'Adversary pass', objectionsAccepted: 5, objectionsRejected: 2, unresolved: 6 },
  { version: 4, event: 'Editor synthesis', objectionsAccepted: 7, objectionsRejected: 3, unresolved: 3 }
]
