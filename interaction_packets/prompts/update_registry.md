# Update Interaction Registry

Given one or more validated YAML interaction packets, update the appropriate Markdown registry.

Rules:
- keep rows chronological unless otherwise requested;
- use concise public labels;
- do not expose private email addresses in public rows unless disclosure level allows it;
- preserve the distinction between `No response detected` and `No response`;
- preserve existing rows unless a correction is explicitly required;
- if a correction is made, prefer a visible correction note over silent rewriting when the registry is public.

Default Markdown columns:

| ID | Date | Subject | Counterparty | Follow-up | Days elapsed | Status | Disclosure |
|---|---:|---|---|---:|---:|---|---|
