# Comparable dimensions (#79 first slice)

| Dimension | Rule | FAIL example |
|-----------|------|----------------|
| effects | ⊆ | child adds `publish` |
| repos / paths / scopes | ⊆ | child adds repo |
| disclosure | ⊆ | child adds `private` |
| prohibitions | ⊇ | child drops `publish` ban |
| obligations | ⊇ | child drops `trace_material` |
| budget.* | ≤ | child raises token cap |
| delegation_depth | ≤ | child allows deeper elves |
| risk_ceiling | ≤ | low → high |
| trace_minimum | ≥ | full → none |
| validity | interval ⊆ | child outlives parent |
| may_* flags | no false→true | parent may_disclose false, child true |

Unknown dimensions: report **WARN**; do not treat as PASS for consequential Acts.
