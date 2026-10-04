# KYS Continuity and Progressive Enrolment Architecture

This document specifies the privacy, legal, and architectural rules governing returning-user continuity and progressive relationship states within Cogentia Personal and the KYS (Know Your Self) protocol.

---

## 1. Core Doctrinal Axiom

$$\text{Contact} \neq \text{Compte} \neq \text{Participation aux tests} \neq \text{Jumeau Numérique}$$

The system enforces strict non-collapse of relationship regimes:
- **Contact:** An voluntary email sent or drafted to Cogentia is a bilateral human correspondence. It does *not* create an account, does *not* enroll the user in testing cohorts, and does *not* authorize Digital Twin creation.
- **Account:** An authenticated profile (e.g. Supabase) is purely voluntary and separated from anonymous or local KYS inspection.
- **Testing Participation:** An explicit opt-in to scientific/psychometric evaluation cohorts.
- **Digital Twin:** A sovereign personal model requiring separate governance and explicit authority.

---

## 2. Retention Model & Purpose Limitation

All data generated during the KYS-AMI protocol resides exclusively on the user's client machine (browser `localStorage` and memory):

| Storage Key | Content | Purpose | Scope |
|---|---|---|---|
| `kys_turn_log_v1` | Multi-turn prompts, pasted agent responses, parsed claims, human reviews | Local continuity, multi-turn comparison, alignment generation | Local to browser |
| `kys_snapshot_draft_v1` | Latest snapshot portrait and human reviews | Fast resumption without re-pasting | Local to browser |
| `kys_enrolment_prefs_v1` | Declared user intention, continuity preferences | Inspectable relationship state | Local to browser |

### Purpose Specification
1. **`session_mirror`**: Immediate visualization of agent assertions.
2. **`multi_turn_comparison`**: Observing whether human corrections were respected in subsequent turns.
3. **`local_convenience`**: Retaining preferences across visits so returning users avoid repetitive manual inputs.
4. **`bilateral_contact`**: Preserving the user's declared purpose when preparing an email.

---

## 3. Human Sovereignty & Rights

Every returning user is equipped with direct controls:
- **Inspectability:** The user can see all active purposes, turn counts, retained claims, and declared intentions in the Continuity Panel.
- **Change of Mind:** The user can modify or revoke any previously stated intention at any time. Past intent is never silently assumed to represent current intent.
- **Local Erasure:** A 1-click "Purger toutes les données locales" action clears all stored keys and returns the browser to a clean anonymous state.
- **Portability:** The user can export their complete snapshot draft and annotations as standard JSON before or after review.
