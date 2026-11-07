/**
 * COP risk/benefit advisory. Never authorizes, issues, or expands a mandate.
 * Risk is relative to value pursued, but possible ruin is a hard veto for
 * unattended execution even if upside is large. Unknown tails are not
 * probabilities. Input is assessed evidence, NOT independent verification.
 */
export const RISK_ADVICE_KIND = 'cogentia.proportionate_risk_advice/v1';
const LEVELS = new Set(['negligible','bounded','material','catastrophic','unknown']);
const GAIN = new Set(['none','minor','useful','substantial','essential']);
const CONTROL = Object.freeze({A:'mandated_autonomy_candidate',B:'authenticated_confirmation',C:'independent_principal_step_up'});
const isNonempty = x => typeof x === 'string' && x.trim().length > 0;
// Optional cognitively authored position. This is descriptive evidence, never an
// authorization input. A/B/C remains a coarse operational projection.
const POSITION = Object.freeze({low:'−',middle:'',high:'+',very_high:'++',borderline:'↗'});
function qualitativePosition(judgment,control){
  if(judgment === undefined) return null;
  if(!judgment || typeof judgment!=='object' || Array.isArray(judgment) ||
     !Object.hasOwn(POSITION,judgment.position) || !isNonempty(judgment.rationale) ||
     judgment.rationale.length>2000 ||
     (judgment.uncertainties!==undefined && (!Array.isArray(judgment.uncertainties)||judgment.uncertainties.length>8||judgment.uncertainties.some(x=>!isNonempty(x)||x.length>240))) ||
     (judgment.evidence_refs!==undefined && (!Array.isArray(judgment.evidence_refs)||judgment.evidence_refs.length>12||judgment.evidence_refs.some(x=>!isNonempty(x)||x.length>400))))
    return {error:'cognitive_judgment_invalid'};
  return {label:`${control}${POSITION[judgment.position]}`,position:judgment.position,
    rationale:judgment.rationale.trim(),uncertainties:judgment.uncertainties||[],
    evidence_refs:judgment.evidence_refs||[],epistemic_status:'agent_assessment_unverified',
    affects_authority:false};
}

// An agent may open other paths to the same objective. These are hypotheses,
// not an automatic ranking, authorization or proof of equivalence.
const COMPARISON = new Set(['lower','similar','higher','unknown']);
const EQUIVALENCE = new Set(['equivalent','substantially_equivalent','partial','unknown']);
function candidatePaths(paths){
  if(paths === undefined) return {ok:true,items:[]};
  if(!Array.isArray(paths)||paths.length>6)return {ok:false};
  const items=[];
  for(const p of paths){
    if(!p || typeof p!=='object' || Array.isArray(p) || !isNonempty(p.path) || p.path.length>500 ||
       !isNonempty(p.rationale) || p.rationale.length>2000 ||
       !COMPARISON.has(p.relative_risk) || !EQUIVALENCE.has(p.outcome_equivalence) ||
       !COMPARISON.has(p.relative_effort) ||
       (p.unknowns!==undefined && (!Array.isArray(p.unknowns)||p.unknowns.length>8||p.unknowns.some(x=>!isNonempty(x)||x.length>240))))return {ok:false};
    items.push({path:p.path.trim(),rationale:p.rationale.trim(),relative_risk:p.relative_risk,
      outcome_equivalence:p.outcome_equivalence,relative_effort:p.relative_effort,
      unknowns:p.unknowns||[],epistemic_status:'agent_hypothesis_unverified',
      authorization_required_separately:true});
  }
  return {ok:true,items};
}

export function assessProportionateRisk(input = {}) {
  const errors=[];
  if(!isNonempty(input.objective)) errors.push('objective_required');
  if(!GAIN.has(input.expected_gain)) errors.push('expected_gain_invalid');
  if(!LEVELS.has(input.exposure)) errors.push('exposure_invalid');
  if(typeof input.mandate_ref!=='string'||!input.mandate_ref.trim()) errors.push('mandate_ref_required');
  if(!['verified','unverified','none'].includes(input.recovery)) errors.push('recovery_invalid');
  for(const flag of ['durable_capacity_loss','ruin_possible','independent_recovery','third_party_commitment','critical_control_change','uncertain_tail']){
    if(typeof input[flag] !== 'boolean') errors.push(`${flag}_required`);
  }
  const alternatives=candidatePaths(input.alternative_paths);
  if(!alternatives.ok) errors.push('alternative_paths_invalid');
  if(input.cognitive_judgment !== undefined && qualitativePosition(input.cognitive_judgment,'B')?.error) errors.push('cognitive_judgment_invalid');
  if(errors.length) return {kind:RISK_ADVICE_KIND,ok:false,control:'C',decision:CONTROL.C,reason:'insufficient_evidence',errors,advisory_only:true,grants_authority:false};
  const reasons=[];
  let control='A';
  const escalate=(next,reason)=>{if('ABC'.indexOf(next)>'ABC'.indexOf(control))control=next;reasons.push(reason);};
  if(input.ruin_possible || input.exposure==='catastrophic') escalate('C','ruin_or_catastrophic_exposure');
  if(input.critical_control_change) escalate('C','critical_control_boundary');
  if(input.durable_capacity_loss) escalate('C','durable_capacity_loss');
  // Unknown extremes are not equivalent to proven ruin. Demand robust bounds;
  // absent an independent recovery path, require a stronger principal step-up.
  if(input.uncertain_tail){
    if(input.recovery!=='verified'||!input.independent_recovery) escalate('C','unbounded_tail_recovery');
    else escalate('B','black_swan_residual_uncertainty');
  }
  if(input.third_party_commitment) escalate('C','third_party_commitment');
  if(input.exposure==='unknown'||input.exposure==='material') escalate('B','material_or_unknown_exposure');
  if(input.recovery!=='verified'||!input.independent_recovery) escalate('B','recovery_not_independently_verified');
  if(input.exposure==='bounded') escalate('B','bounded_exposure_requires_review');
  if(input.expected_gain==='none') escalate('B','no_identified_gain');
  if(reasons.length===0) reasons.push('low_exposure_and_verified_recovery');
  const nuance=qualitativePosition(input.cognitive_judgment,control);
  return {
    kind:RISK_ADVICE_KIND,ok:true,control,decision:CONTROL[control],reasons,
    nuance,alternative_paths:alternatives.items,control_projection:'coarse_pedagogical',
    expected_gain:input.expected_gain,objective:input.objective.trim(),mandate_ref:input.mandate_ref,
    recovery:input.recovery,independent_recovery:input.independent_recovery,
    exposure:input.exposure,ruin_possible:input.ruin_possible,uncertain_tail:input.uncertain_tail,
    advisory_only:true,grants_authority:false,
    note:'Human/issuer verified mandate, effect approval, budget and permissions remain independent; B/C are control recommendations, not grants.'
  };
}
