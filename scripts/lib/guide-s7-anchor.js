/**
 * The upstream S7 card index sometimes stores a human-readable section label
 * appended to the file path, e.g. "research/second_method.md (Rule 0 + Five
 * Rules)". That label is not part of the path or URL — strip it before
 * building source_id/canonical_rel/canonical_url, or it leaks into visible
 * citations and produces a broken GitHub URL (2026-09-24, found via the
 * legacy-vs-V2 Guide re-A/B, operium#45).
 */
export function stripS7AnchorLabel(value) {
  return String(value || "").replace(/\s*\([^()]*\)\s*$/, "").trim();
}
