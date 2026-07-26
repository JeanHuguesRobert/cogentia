# Magistral coding-agent routing — moved to Operium

**Do not treat this file as the operational source of truth.**

Operational desired state, apply steps, health checks, and the Magistral map
template live in **Operium**:

- Decision: [`operium/decisions/magistral-coding-agent-routing.md`](https://github.com/JeanHuguesRobert/operium/blob/main/decisions/magistral-coding-agent-routing.md)
- Procedure: [`operium/docs/magistral-coding-agent-routing.md`](https://github.com/JeanHuguesRobert/operium/blob/main/docs/magistral-coding-agent-routing.md)
- Map template: [`operium/profiles/magistral-map.coding-agents.v1.json`](https://github.com/JeanHuguesRobert/operium/blob/main/profiles/magistral-map.coding-agents.v1.json)

This directory only holds **app-side** unit scripts and Caddy *fragments* for the
Cogentia Guide stack. Deployment ownership, evidence, and change control belong
to Operium (`operium up`, invoke tool, trust perimeter docs).
