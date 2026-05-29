# Extract Interaction Packet

Analyse the raw interaction below as a traceability event.

The interaction may be:
- an email;
- a meeting note;
- a call note;
- a public post;
- a commitment;
- a decision;
- an absence of reply.

Extract:
- date;
- channel;
- sender or initiator;
- recipients or counterparties;
- cc or observers if any;
- subject or title;
- thread or continuity context;
- follow-up number if detectable;
- elapsed days since previous event if detectable;
- expected continuation;
- observed continuation;
- probable status;
- suggested disclosure level;
- minimal public summary.

Produce:
1. a YAML packet;
2. a Markdown registry line;
3. if useful, a sober follow-up draft.

Constraints:
- distinguish facts from interpretations;
- avoid psychological speculation;
- avoid automatic accusations;
- preserve confidentiality according to the selected disclosure level;
- mark unknown fields explicitly as `unknown` rather than inventing them.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Jean Hugues Robert — Tableau de bord Interaction Packets](../dashboard.md)

<!-- END_AUTO: backlinks -->
