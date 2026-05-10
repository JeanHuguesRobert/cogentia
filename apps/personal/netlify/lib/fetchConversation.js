/**
 * netlify/lib/fetchConversation.js
 *
 * Récupère le texte brut d'une conversation partagée.
 * Stratégie : fetch HTML simple + extraction par sélecteurs CSS selon la plateforme.
 * Pas de Puppeteer en MVP — les pages de partage ChatGPT/Claude/Gemini rendent le
 * contenu essentiel en HTML statique (SSR ou pre-render).
 */

// Sélecteurs CSS pour extraire le texte des réponses de l'agent IA
// On cible le DERNIER message assistant (qui contient le JSON Cogentia)
const PLATFORM_SELECTORS = {
  'chat.openai.com': {
    // ChatGPT shared conversations : messages dans des divs avec data-message-author-role
    messageContainer: '[data-message-author-role="assistant"]',
    // On prend le dernier
    last: true,
  },
  'claude.ai': {
    // Claude shared conversations
    messageContainer: '.font-claude-message, [data-is-streaming="false"]',
    last: true,
  },
  'gemini.google.com': {
    messageContainer: 'message-content model-response, .response-content',
    last: true,
  },
}

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url)
    return Object.keys(PLATFORM_SELECTORS).find(h => hostname.includes(h)) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Extraction naïve mais robuste : on cherche le bloc JSON Cogentia
 * directement dans le HTML brut via regex, sans parser tout le DOM.
 * Plus fiable que les sélecteurs CSS qui changent souvent.
 */
function extractCogentiaJson(html) {
  // Le JSON est encadré par ```json ... ``` dans la réponse de l'agent
  const match = html.match(/```json\s*(\{[\s\S]*?"cogentia_version"[\s\S]*?\})\s*```/)
  if (match) return match[1]

  // Fallback : cherche un objet JSON contenant cogentia_version n'importe où
  const fallback = html.match(/(\{[^{}]*"cogentia_version"[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/)
  if (fallback) return fallback[1]

  return null
}

/**
 * Nettoie le HTML pour extraire le texte lisible.
 * Simple replace des balises — suffisant pour le JSON.
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Fetche une URL de conversation et retourne le JSON Cogentia brut.
 * @param {string} url
 * @returns {{ rawJson: string|null, platform: string, error: string|null }}
 */
export async function fetchConversation(url) {
  const platform = detectPlatform(url)

  let html
  try {
    const res = await fetch(url, {
      headers: {
        // User-agent neutre pour éviter les blocages basiques
        'User-Agent': 'Mozilla/5.0 (compatible; PrivAI-Cogentia/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      // Timeout 15s
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return { rawJson: null, platform, error: `HTTP ${res.status} — URL inaccessible ou lien expiré` }
    }

    html = await res.text()
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return { rawJson: null, platform, error: 'Timeout — la page met trop de temps à répondre' }
    }
    return { rawJson: null, platform, error: `Fetch échoué : ${err.message}` }
  }

  const rawJson = extractCogentiaJson(html)

  if (!rawJson) {
    // Tenter une extraction du texte brut pour diagnostic
    const text = stripHtml(html)
    const hasAnyJson = text.includes('cogentia_version')
    return {
      rawJson: null,
      platform,
      error: hasAnyJson
        ? 'JSON Cogentia détecté mais non extractible — la page nécessite peut-être JavaScript'
        : 'Aucune réponse Cogentia trouvée dans la conversation',
    }
  }

  return { rawJson, platform, error: null }
}
