---
title: "Package Access Check"
author: "Jean Hugues Noel Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
date: "2026-09-21"
status: "stable — active"
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
language: en
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 9d06587d7196ee82ce0906886913804d9b0a599d
  origin_date: "2026-09-21"
  derived_from:
    - "scripts/check-package-access.js"
review:
  status: unreviewed
  reviewed_by: []
---

# Package Access Check

`scripts/check-package-access.js` is a read-only diagnostic for a Node project.
It reads the project's `package.json`, then verifies that every direct
production, development, and optional dependency has a readable
`node_modules/<package>/package.json` from the current Node process.

It distinguishes an absent package from one that is present but inaccessible.
It does not run package code, install dependencies, or alter permissions.

```bash
npm run check:package-access
node scripts/check-package-access.js --json
node scripts/check-package-access.js --root C:\path\to\project --json
```

The machine-readable report uses `cogentia.package_access.v1`. A nonzero exit
status means at least one declared dependency is missing or unreadable. The
check therefore catches incomplete installs and process-identity access gaps,
including an ACL mismatch between a package cache and an automation sandbox.
