# Jean Hugues Robert — Interaction Packets Dashboard

## Purpose

This dashboard tracks selected public-interest interactions initiated by Jean Hugues Robert and related to his open, non-profit and public-interest work.

It is not a generic presentation of the Interaction Packets method.

It is the current public dashboard of traced interactions.

## Method

Each interaction may be documented as:

- a Markdown register entry;
- a YAML interaction packet;
- a readable public note;
- a correction when the initial interpretation was incomplete or wrong.

The objective is to trace requests, replies, refusals, delays, silences, follow-ups and corrections.

## Current register

Main register:

- [mail_trace.md](./mail_trace.md)

## Current traced cases

| ID | Date | Subject | Counterparty | Status | Disclosure | Packet |
|---|---:|---|---|---|---|---|
| 2026-05-04-001 | 2026-05-04 | Session MareNostrum | Université de Corse | Reply received: negative | D2 | [YAML](./packets/2026/2026-05-04-session_marenostrum.yaml) |

## Case 2026-05-04-001 — MareNostrum / Université de Corse

### Request

A proposal was sent to Université de Corse in the context of ICOME.

The topic was MareNostrum:

- island solar energy;
- computational sovereignty;
- AI inference;
- Mediterranean cooperation.

After the refusal to include MareNostrum in the official conference programme, a lighter request was made:

- availability of a room;
- one evening on 8, 9 or 10 June;
- informal roundtable;
- outside the official programme;
- duration: around 90 minutes;
- no budget requested;
- ICOME participants welcome if interested.

### Result

A negative reply was received on 2026-05-05.

The reply stated that:

- the special session proposal had already received a negative answer;
- the request for a room for an informal roundtable outside the official programme was also refused.

### Correction

This case was initially interpreted as `No response detected`.

Thread inspection showed that a reply had in fact been received.

The register was corrected accordingly.

This correction is methodologically important: the system must trace facts, not merely confirm impressions.

## Interpretation layer

This case may illustrate a broader difficulty in establishing local cooperation around open, non-profit and public-interest initiatives in Corsica.

It does not, by itself, prove a general thesis.

It is one documented case among others to be accumulated, compared and corrected over time.

## Related method documents

- [Interaction Packets overview](./overview.md)
- [Public-use package](./PACKAGE.md)
- [Mail trace pipeline](./mail_trace_pipeline.md)
- [Extraction prompt](./prompts/extract_interaction_packet.md)

## Status vocabulary

Recommended observable statuses:

- `sent`
- `reply_received`
- `reply_received_negative`
- `reply_received_positive`
- `no_response_detected`
- `followup_sent`
- `redirected`
- `closed`
- `corrected`

## Rule

Facts first.

Interpretations second.

Corrections always visible when they matter.
