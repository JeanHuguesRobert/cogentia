/** Typed, no-LLM handoff: discovery report -> existing continuation protocol. */
import { createHash } from 'node:crypto';

export const RELATE_JUDGMENT_PROTOCOL = 'cogentia.packet_relation_judgment.v1';
export function packetRelateJudgmentRequest(report, {input, source='inline'}={}) {
  if (report?.protocol !== 'cogentia.packet_relation_proposal.v1') throw new Error('Expected packet relation proposal v1');
  if (!Array.isArray(report.candidates) || !report.candidates.length) throw new Error('No candidates: a judgment continuation would be empty');
  const candidates=report.candidates.map(c=>({
    reference:c.reference, packet_id:c.packet_id, status:c.status,
    title:c.title, rank_signal:c.rank_signal, matched_terms:c.matched_terms,
    evidence:c.evidence, reason:c.reason,
  }));
  const sourceText=String(input || '').slice(0,12000);
  if (!sourceText.trim()) throw new Error('Missing source input for judgment');
  const identity=JSON.stringify({source,sourceText,candidates});
  const digest=createHash('sha256').update(identity).digest('hex');
  return {
    kind:'judgment',
    title:'Semantic attachment of a cognitive Act to existing packets',
    question:'Examine the source Act and candidate packet references; decide for EACH whether the relation is a true continuation, evidence, dependency, contradiction, other relation or no relation. Verify shared finality and causal provenance from source documents; lexical matches are NOT proof. Preserve disagreement and closed packet histories. If evidence is insufficient, return needs_evidence instead of inventing a link. Do NOT create a new packet or mutate the corpus. Return the structured judgment with reasons and citations, or no_attachment.',
    dedupe_key:`packet_relate_judgment:${digest}`,
    subject:{topic:'packet_semantic_relation',path:source==='inline'?'':source},
    required_capabilities:['semantic_judgment'],
    context:{protocol:RELATE_JUDGMENT_PROTOCOL,source:{reference:source,text:sourceText},discovery:{protocol:report.protocol,candidates,notices:report.notices}, constraints:['No autonomous packet creation','No historical rewriting','No effect authorization from this judgment','Multiple or zero links allowed']},
    expected_response:{format:'json',protocol:RELATE_JUDGMENT_PROTOCOL,required:['decision','reason','relations'],relation_types:['continuation','evidence','dependency','contradiction','reference','none','needs_evidence'],schema_hint:{decision:'attach | no_attachment | needs_evidence',reason:'explain causal/finality argument',relations:[{reference:'candidate reference',relation:'continuation | evidence | dependency | contradiction | reference | none | needs_evidence',reason:'source-grounded reason',evidence_refs:['citations or source lines']}]}},
  };
}
