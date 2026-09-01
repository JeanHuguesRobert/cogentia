/**
 * Live Media & Web Search Ingestion Adapter for Corsica Senate Watch.
 *
 * Implements real-time feed fetching from Corsican news outlets,
 * institutional sources, and web search engines for the Rossignol watch system.
 */

export const CORSICA_LIVE_FEEDS = [
  {
    source_name: "Corse Net Infos (CNI)",
    url: "https://www.corsenetinfos.corsica/xml/syndication.rss",
    category: "regional_news"
  },
  {
    source_name: "France 3 Corse ViaStella",
    url: "https://france3-regions.francetvinfo.fr/corse/rss",
    category: "regional_broadcast"
  },
  {
    source_name: "Alta Frequenza",
    url: "https://www.alta-frequenza.corsica/actu/rss",
    category: "radio_regional"
  }
];

// Campaign Keyword Scoring Table
const KEYWORD_WEIGHTS = {
  // Axe 1: Sénat & Institutions
  "sénat": 1.8,
  "sénatorial": 1.9,
  "grands électeurs": 1.8,
  "parigi": 1.5,
  "article 72-5": 1.7,
  "autonomie": 1.5,
  "maire": 1.3,
  "commune": 1.2,
  "haute-corse": 1.4,
  "dgf": 1.5,
  // Axe 2: Énergie
  "électricité": 1.3,
  "edf": 1.2,
  "solaire": 1.3,
  "zni": 1.5,
  "fium'orbu": 1.2,
  "step": 1.3,
  // Axe 3: Foncier
  "foncier": 1.4,
  "logement": 1.3,
  "indivision": 1.5,
  "girtec": 1.6,
  "brs": 1.6,
  "résidence secondaire": 1.4,
  // Axe 4: Eau & Déchets
  "eau": 1.2,
  "sécheresse": 1.5,
  "oehc": 1.6,
  "déchets": 1.3,
  "syvadec": 1.6,
  "teom": 1.5,
  // Axe 5: Transparence & Justice
  "chambre régionale des comptes": 1.7,
  "crc": 1.5,
  "marchés publics": 1.5,
  "tribunal administratif": 1.4
};

/**
 * Calculates a relevance score for a text snippet based on campaign keywords.
 */
export function calculateCampaignRelevance(title, description) {
  const fullText = `${title} ${description}`.toLowerCase();
  let rawScore = 0.2; // base score
  let matches = [];

  for (const [kw, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (fullText.includes(kw)) {
      rawScore += weight * 0.15;
      matches.push(kw);
    }
  }

  // Normalize between 0.0 and 1.0
  const normalizedScore = Math.min(1.0, Math.round(rawScore * 100) / 100);
  return {
    score: normalizedScore,
    matched_keywords: matches,
    is_senate_relevant: normalizedScore >= 0.40
  };
}

/**
 * Parses RSS XML into structured items.
 */
export function parseRssXml(xmlText, sourceName) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
                       itemContent.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
                      itemContent.match(/<description>([\s\S]*?)<\/description>/i);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
      const link = linkMatch ? linkMatch[1].trim() : "";
      const rawDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      const relevance = calculateCampaignRelevance(title, rawDesc);

      items.push({
        source_feed: sourceName,
        title,
        url: link,
        published_at: pubDate,
        summary: rawDesc.slice(0, 350) + (rawDesc.length > 350 ? "..." : ""),
        relevance_score: relevance.score,
        matched_keywords: relevance.matched_keywords,
        is_senate_relevant: relevance.is_senate_relevant
      });
    }
  }

  return items;
}

/**
 * Fetches all configured live Corsican media RSS feeds.
 */
export async function fetchAllLiveCorsicaFeeds(timeoutMs = 6000) {
  const allItems = [];

  for (const feed of CORSICA_LIVE_FEEDS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Cogentia-Rossignol-Watch/1.0 (+https://baronsmariani.org)" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const parsed = parseRssXml(text, feed.source_name);
        allItems.push(...parsed);
      }
    } catch (err) {
      // Graceful fallback on network timeout
      // console.warn(`Feed fetch skipped for ${feed.source_name}: ${err.message}`);
    }
  }

  // Sort by relevance score descending
  return allItems.sort((a, b) => b.relevance_score - a.relevance_score);
}
