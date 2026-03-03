/**
 * anonymousSession.js
 * Gestion de la session anonyme côté client pour Cogentia / PrivAI
 *
 * Flux :
 * 1. À l'arrivée sur le site → getOrCreateSessionId() génère un UUID en localStorage
 * 2. À chaque analyse créée → l'UUID est envoyé à Supabase (anonymous_session_id)
 * 3. À l'inscription → claimAnalyses() rattache toutes les analyses au nouveau compte
 */

import { supabase } from '../supabaseClient'

const SESSION_KEY = 'cogentia_anonymous_session_id'

/**
 * Retourne le session_id anonyme existant ou en crée un nouveau.
 * @returns {string} UUID v4
 */
export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Retourne le session_id anonyme sans en créer un.
 * @returns {string|null}
 */
export function getSessionId() {
  return localStorage.getItem(SESSION_KEY)
}

/**
 * Supprime le session_id local après un claim réussi.
 * Appelé après claimAnalyses() si le claim a fonctionné.
 */
export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Réclame les analyses anonymes de la session courante
 * et les rattache au compte de l'utilisateur connecté.
 *
 * À appeler immédiatement après supabase.auth.signUp() ou signIn()
 * si un session_id anonyme existe en localStorage.
 *
 * @returns {{ claimed: number, error: string|null }}
 */
export async function claimAnalyses() {
  const sessionId = getSessionId()

  if (!sessionId) {
    return { claimed: 0, error: null } // rien à réclamer
  }

  const { data, error } = await supabase.rpc('claim_anonymous_analyses', {
    p_session_id: sessionId,
  })

  if (error) {
    console.error('[Cogentia] Claim failed:', error.message)
    return { claimed: 0, error: error.message }
  }

  // Nettoyage local après claim réussi
  clearSessionId()

  return { claimed: data, error: null }
}

/**
 * Helper : crée une analyse en base avec le session_id anonyme.
 * À utiliser côté client quand l'utilisateur n'est pas connecté.
 *
 * @param {object} analysisData - Les champs de l'analyse (sans user_id ni anonymous_session_id)
 * @returns {{ data, error }}
 */
export async function createAnonymousAnalysis(analysisData) {
  const sessionId = getOrCreateSessionId()

  return await supabase
    .from('analyses')
    .insert({
      ...analysisData,
      anonymous_session_id: sessionId,
      user_id: null,
    })
    .select()
    .single()
}

/**
 * Récupère les analyses de la session anonyme courante.
 * @returns {{ data, error }}
 */
export async function getAnonymousAnalyses() {
  const sessionId = getSessionId()
  if (!sessionId) return { data: [], error: null }

  return await supabase
    .from('analyses_summary')
    .select('*')
    .eq('anonymous_session_id', sessionId) // la vue devra exposer ce champ
    .order('created_at', { ascending: false })
}
