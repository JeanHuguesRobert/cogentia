---
title: "Contributive Campaigns — 3Code and physical incarnations service"
language: en
date: 2026-11-18
last_modified_at: 2026-11-18
license: CC BY-SA 4.0
status: "MVP implementation — deployment evidence separate"
document_role: implementation
document_kind: application
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: derived
  origin_repository: JeanHuguesRobert/cogentia
  derived_from:
    - research/contributive_campaign_service.md
    - research/3code.md
    - research/cognitive_packet_incarnations_and_missions.md
review:
  status: unreviewed
  reviewed_by: []
---

# Contributive Campaign Service — MVP

Neutral experimental KYS service. Open to all candidates and nonpolitical initiatives under the same technical conditions. No political targeting, mass-message sending, donations, or automatic endorsement counting.

**Intended entrypoint:** https://services.acorsica.org/3code . Production status requires a successful live HTTPS test and persistence check.

## Capabilities

- Local accountless 3Code generator: 3 + 8 uniform Crockford characters (3XX-XXX-XXX). Resolution accepts collisions and lists candidates. The code is not an authentication/ownership credential.
- Create a campaign with one-time management token, draft by default, activatable by its manager; no email, no account required.
- Create missions; register singular paper/textile/book/object incarnations with UUIDs, own 3Codes and parent ID or parent code. Parent links are explicitly declared, not authenticated.
- Photocopying a QR does not generate a new identity. Readers can create a child with a fresh code and preserve parent reference.
- Public contributions remain pending until the campaign manager reviews them.
- Browser-only printable A4 template supports text, a local-only logo, common QR, child code and parent code; no upload of logo.
- SQLite WAL local data, no scans/tracker logs, geolocation, contact fields or mass mailing. Minimal write rate limiting.

**Pilot risks:** campaign claims and physical provenance are unverified. Management secrets are stored in browser localStorage for usability, with a one-time copyable display; user must back them up. Public activation can enable spam; pilot has basic rate limiting but not full abuse reporting, deletion/retention automation, key recovery, backup verification, moderation of campaign titles or substantive legal review. Fix these before major external promotion. No personal identification, political support or electoral presentation is inferred from any action.

## Tests

Node 26 and built-in SQLite; qr SVG via qrcode 1.5.4. No DB server.

    cd apps/contributive-service
    npm ci --ignore-scripts
    npm test
    CAMPAIGNS_DB=/tmp/contributive-mvp.sqlite HOST=127.0.0.1 PORT=8879 npm start

HTTP endpoints under /3code/api: GET health, generate, resolve, campaigns, campaigns/{id}, copies/{id}, qr; POST campaigns, campaigns/{id}/activate, missions, copies, contributions, contributions/{id}/review. Campaign management via x-management-token header, never public 3Code.

## Fracta2 deployment

Use existing general host administration and actual governed authority. Idempotent recipe in deploy/install-fracta2.sh uses an identified Git SHA in /srv/cogentia/services/contributive/releases, persists the database in /srv/cogentia/data/contributive, launches as ubuntu via systemd, adds only /3code route on existing services.acorsica.org. Does not replace KYS SPA.

Live Reality Test: correct /3code HTML and JSON health, create/activate campaign, create copy and fork, same 3Code ambiguity, pending and reviewed contributions, restart persistence, regression of existing KYS routes. Test data is marked as synthetic. Source implementation, HTTP reachability, deployed revision and durable persistence are separate claims.

## Related work

- Requirements: ../../research/contributive_campaign_service.md
- 3Code: ../../research/3code.md ; Cogentia #323
- Campaigns: Cogentia #319, #320, #321, #322
- Incarnations/mission lineage: ../../research/cognitive_packet_incarnations_and_missions.md
- A Voce/Capable pilot: https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/capable/campaign/tracts-a-voce/README.md
