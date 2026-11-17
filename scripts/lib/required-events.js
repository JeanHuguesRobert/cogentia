/**
 * Neutral required-event classification and policy.
 * Shared by the governed harness and the experimental tournament kernel.
 * Not a COP Scheduler and not an authority plane.
 */

export const REQUIRED_EVENT_POLICY = "packet_required_events";

export function classifyNeed(text) {
  const raw = String(text || "");
  return {
    // Familiar French / Fractanet wording must also trigger orientation.
    // Without this, "CPS sans circuit fixe" bypasses mandatory prior art.
    corpusLike: /corpus|concept|mandate|agent|packet|kudos|vote|orient|doctrine|cogentia|\bcps\b|\bfractanet\b|\bmagistral\b|continuation|commutation de paquets|store[ -]*(?:(?:and|et|&)[ -]*)?forward|antériorit|anteriorit|\bprincipe\b/i.test(raw),
    livingLike:
      /state of the art|current law|current price|leave the corpus|external research|latest/i.test(raw),
    exploratory: /possible|should we|architecture|design|strategy|could|what if/i.test(raw),
  };
}

export function requiredEventsForTurn(input = {}, options = {}) {
  if (options.requiredEvents === false) return [];
  if (Array.isArray(options.requiredEvents)) return [...options.requiredEvents];
  const text = String(input.text || input.prompt || input.question || "");
  const flags = classifyNeed(text);
  const required = [];
  if (flags.corpusLike) required.push("orientation.required");
  if (flags.livingLike) required.push("living_evidence.required");
  return required;
}

export const DEFAULT_REQUIRED_EVENT_CAPABILITIES = Object.freeze({
  "orientation.required": "corpus.orient",
});
