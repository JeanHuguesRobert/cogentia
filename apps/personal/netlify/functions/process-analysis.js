/**
 * netlify/functions/process-analysis.js
 *
 * Fonction principale : orchestre fetch → parse → stockage Supabase.
 * Appelée par le client React après création de l'analyse en base.
 *
 * POST /api/process-analysis
 * Body : { analysisId: string }
 */

import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { generatePresentations } from '../lib/generatePresentations.js'
import { fetchConversation } from '../lib/fetchConversation.js'
import { parseCogentiaJson } from '../lib/parseCogentia.js'

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  let analysisId, clientRawJson
  try {
    const body = await req.json()
    analysisId = body.analysisId
    clientRawJson = body.rawJson ?? null   // fourni si méthode paste ou fichier
  } catch {
    return json({ error: 'Body JSON invalide' }, 400)
  }

  if (!analysisId) return json({ error: 'analysisId manquant' }, 400)

  // ─── 1. Récupère l'analyse en base ────────────────────────────────────────
  const { data: analysis, error: fetchDbErr } = await supabaseAdmin
    .from('analyses')
    .select('id, conversation_url, status')
    .eq('id', analysisId)
    .single()

  if (fetchDbErr || !analysis) {
    return json({ error: 'Analyse introuvable' }, 404)
  }

  if (!['pending', 'error'].includes(analysis.status)) {
    return json({ error: `Analyse déjà en cours ou terminée (status: ${analysis.status})` }, 409)
  }

  // ─── 2. Statut → fetching (skip si rawJson fourni par le client) ───────────
  await setStatus(analysisId, 'fetching')

  let rawJson, platform
  if (clientRawJson) {
    // Méthode paste / fichier : le client a déjà extrait le JSON
    rawJson = clientRawJson
    platform = null
  } else {
    // Méthode auto : fetch de l'URL partagée
    const result = await fetchConversation(analysis.conversation_url)
    if (result.error) {
      await setStatus(analysisId, 'error', result.error)
      return json({ error: result.error }, 422)
    }
    rawJson = result.rawJson
    platform = result.platform
  }

  // ─── 3. Statut → parsing ──────────────────────────────────────────────────
  await setStatus(analysisId, 'parsing')

  const { data: parsed, error: parseErr, warnings } = parseCogentiaJson(rawJson)

  if (parseErr) {
    await setStatus(analysisId, 'error', parseErr)
    return json({ error: parseErr }, 422)
  }

  // ─── 4. Récupère le prompt_version_id actif ───────────────────────────────
  const { data: promptVersion } = await supabaseAdmin
    .from('prompt_versions')
    .select('id')
    .eq('is_active', true)
    .single()

  // ─── 5. Met à jour l'analyse avec les métadonnées parsées ─────────────────
  const rel = parsed.user_relationship ?? {}
  const rel2 = parsed.reliability ?? {}
  const eth = parsed.ethics_compliance ?? {}

  const { error: updateErr } = await supabaseAdmin
    .from('analyses')
    .update({
      // Identification agent
      agent_name: parsed.agent?.name ?? platform,
      agent_model: parsed.agent?.model ?? null,
      agent_platform: parsed.agent?.platform ?? platform,
      agent_is_custom: parsed.agent?.is_custom_or_finetuned ?? false,
      agent_custom_details: parsed.agent?.custom_details ?? null,

      // Relation agent/utilisateur
      rel_estimated_exchanges: rel.estimated_exchanges ?? null,
      rel_has_persistent_memory: rel.has_persistent_memory ?? null,
      rel_memory_richness: rel.memory_richness ?? null,
      rel_main_topics: rel.main_topics ?? [],
      rel_interaction_depth: rel.interaction_depth ?? null,
      rel_observed_patterns: rel.observed_patterns ?? [],
      rel_salient_traits: rel.salient_traits ?? [],
      rel_blind_spots: rel.blind_spots ?? [],
      rel_global_confidence: rel.global_confidence ?? null,
      rel_global_confidence_rationale: rel.global_confidence_rationale ?? null,

      // Fiabilité
      reliability_data_richness: rel2.data_richness ?? null,
      reliability_scoring_caveats: rel2.scoring_caveats ?? [],
      reliability_recommendation: rel2.recommended_interpretation ?? null,

      // Éthique
      ethics_no_identifying_data: eth.no_identifying_data ?? false,
      ethics_no_sensitive_categories: eth.no_sensitive_categories ?? false,
      ethics_neutral_language_used: eth.neutral_language_used ?? false,
      ethics_confirmed_by_agent: eth.confirmed_by_agent ?? false,

      // Intégrité
      prompt_version_id: promptVersion?.id ?? null,
      prompt_verified: true,
      json_valid: true,
      raw_json: parsed,

      status: 'scoring', // juste avant l'insert des scores
    })
    .eq('id', analysisId)

  if (updateErr) {
    await setStatus(analysisId, 'error', updateErr.message)
    return json({ error: updateErr.message }, 500)
  }

  // ─── 6. Insère les 73 scores ──────────────────────────────────────────────
  const scores = parsed.indicators.map(ind => ({
    analysis_id: analysisId,
    rank: ind.rank,
    category: ind.category,
    name: ind.name,
    score: ind.score,
    score_type: ind.score_type,
    confidence: ind.confidence,
    evidence: ind.evidence,
  }))

  const { error: insertErr } = await supabaseAdmin
    .from('indicator_scores')
    .upsert(scores, { onConflict: 'analysis_id,rank' })

  if (insertErr) {
    await setStatus(analysisId, 'error', insertErr.message)
    return json({ error: insertErr.message }, 500)
  }

  // ─── 7. Génère les présentations (Big Five, MBTI, DISC, Ennéagramme) ────────
  // Fire & forget — ne bloque pas le statut "complete"
  // On récupère les scores depuis la DB pour avoir les objets complets
  const { data: storedScores } = await supabaseAdmin
    .from('indicator_scores')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('rank')

  const { data: storedAnalysis } = await supabaseAdmin
    .from('analyses')
    .select('agent_name, rel_global_confidence, rel_interaction_depth')
    .eq('id', analysisId)
    .single()

  generatePresentations(analysisId, storedScores ?? [], storedAnalysis ?? {})
    .catch(e => console.error('[Cogentia] Presentations failed:', e.message))

  // ─── 8. Terminé ───────────────────────────────────────────────────────────────
  await setStatus(analysisId, 'complete')

  return json({
    success: true,
    analysisId,
    indicators: scores.length,
    warnings,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setStatus(id, status, errorMessage = null) {
  const update = { status }
  if (errorMessage) update.error_message = errorMessage
  await supabaseAdmin.from('analyses').update(update).eq('id', id)
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export const config = { path: '/api/process-analysis' }
