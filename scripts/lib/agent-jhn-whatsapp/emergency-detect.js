/**
 * High-precision emergency detection for WhatsApp.
 *
 * John is not an emergency service. A hit means: speak (break stealth),
 * tell people to call the authorities, gather facts, alert the principal.
 * False positives would unmask John in ordinary group chat — stay strict.
 */

export const AUTHORITIES_FR = Object.freeze({
  medical: { number: "15", name: "SAMU" },
  police: { number: "17", name: "police" },
  fire: { number: "18", name: "pompiers" },
  european: { number: "112", name: "numéro d’urgence européen" },
});

const STRONG = [
  /\bau secours\b/i,
  /\bà l['’]aide\b/i,
  /\ba l['’]aide\b/i,
  /\burgence vitale\b/i,
  /\bdanger (immédiat|imminent)\b/i,
  /\bimmediate danger\b/i,
  /\bthis is an emergency\b/i,
  /\bc['’]est une urgence\b/i,
  /\bappel(ez|er)?\s+(le\s+)?(15|17|18|112|samu|pompiers)\b/i,
  /\bcall\s+(911|999|112|999)\b/i,
  /\barr[eê]t cardiaque\b/i,
  /\bcardiac arrest\b/i,
  /\b(infarctus|heart attack)\b/i,
  /\b(avc|stroke)\b/i,
  /\bne respire plus\b/i,
  /\bnot breathing\b/i,
  /\bplus de pouls\b/i,
  /\bno pulse\b/i,
  /\bagression en cours\b/i,
  /\bbeing attacked\b/i,
  /\bnoyade\b/i,
  /\bdrowning\b/i,
  /\boverdose\b/i,
  /\bincendie (en cours|dans|à la|a la)\b/i,
  /\b(house|apartment) (is )?on fire\b/i,
  /\bje (vais|veut|veux) me tuer\b/i,
  /\bgoing to (kill|hurt) (my)?self\b/i,
];

const WEAK_URGENCY = [
  /\burgence\b/i,
  /\bemergency\b/i,
  /\baidez[- ]moi\b/i,
  /\bhelp me\b/i,
  /\baccident\b/i,
  /\bmalaise\b/i,
  /\bbleeding\b/i,
  /\bsaigne(ment|)\b/i,
  /\binconscient[e]?\b/i,
  /\bunconscious\b/i,
  /\bsuicide\b/i,
  /\bincendie\b/i,
  /\bon fire\b/i,
];

const WEAK_HARM = [
  /\b(vite|immédiat|immediat|grave|dying|meurt|mourir|hospital|hôpital|samu|pompiers|blessé|blesse|secours)\b/i,
  /\b(15|17|18|112|911|999)\b/,
  /\bnow\b/i,
  /\bright now\b/i,
];

function matchList(text, list) {
  const hits = [];
  for (const re of list) {
    const m = String(text).match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/**
 * @param {string} text
 * @returns {{ hit: boolean, precision: 'none'|'strong'|'compound', matches: string[], locale: 'fr'|'en' }}
 */
export function detectEmergency(text) {
  const s = String(text || "").trim();
  const locale = inferLocale(s);
  if (!s) {
    return { hit: false, precision: "none", matches: [], locale };
  }
  const strong = matchList(s, STRONG);
  if (strong.length) {
    return { hit: true, precision: "strong", matches: strong, locale };
  }
  const weakU = matchList(s, WEAK_URGENCY);
  const weakH = matchList(s, WEAK_HARM);
  if (weakU.length && weakH.length) {
    return {
      hit: true,
      precision: "compound",
      matches: [...weakU, ...weakH],
      locale,
    };
  }
  return { hit: false, precision: "none", matches: [], locale };
}

export function inferLocale(text) {
  const s = String(text || "");
  if (/[àâçéèêëîïôùûœ]/i.test(s) || /\b(je|tu|nous|vous|les|des|une|est|pas|pour|avec|secours|urgence|pompiers)\b/i.test(s)) {
    return "fr";
  }
  if (/\b(the|and|you|help|emergency|please|call)\b/i.test(s)) return "en";
  return "fr";
}

/**
 * Body only (disclosure wrapper applied by caller).
 * Redirects to authorities; does not give competing medical advice.
 */
export function emergencyGroupReplyBody(locale = "fr") {
  if (locale === "en") {
    return [
      "If this is a life-threatening or immediate danger: call emergency services now (in France: 15 SAMU, 18 fire, 17 police, or 112). I am not a substitute for the authorities.",
      "I am alerting Jean Hugues. Meanwhile tell me: where you are, what is happening, since when, how many people, and whether help has already been called.",
    ].join("\n\n");
  }
  return [
    "Si c’est une urgence vitale ou un danger immédiat : appelez tout de suite le 15 (SAMU), le 18 (pompiers), le 17 (police) ou le 112. Je ne remplace pas les services de secours.",
    "J’alerte Jean Hugues. Dites-moi : où vous êtes, ce qui se passe, depuis quand, combien de personnes, et si les secours ont déjà été appelés.",
  ].join("\n\n");
}

export function emergencyFollowUpBody(locale = "fr") {
  if (locale === "en") {
    return [
      "If help is not already on the way, call 15 / 18 / 17 / 112 first — I cannot replace them.",
      "Keep going: location, what happened, timing, who is affected, what you already did.",
    ].join("\n\n");
  }
  return [
    "Si les secours ne sont pas déjà en route, appelez d’abord le 15 / 18 / 17 / 112 — je ne les remplace pas.",
    "Continuez : lieu, ce qui se passe, depuis quand, qui est concerné, ce qui a déjà été fait.",
  ].join("\n\n");
}

/**
 * Self-chat ping to the principal. Truncated; no extra group roster.
 */
export function emergencyPrincipalAlertBody({
  groupId,
  authorJid,
  text,
  matches,
} = {}) {
  const snippet = String(text || "").replace(/\s+/g, " ").trim().slice(0, 280);
  const markers = (matches || []).slice(0, 6).join(", ") || "(none)";
  const group = String(groupId || "").slice(-24);
  const author = String(authorJid || "").slice(-18);
  return [
    "⚠️ Possible urgence WhatsApp (groupe).",
    `Groupe: …${group}`,
    `Auteur: …${author}`,
    `Marqueurs: ${markers}`,
    `Extrait: ${snippet || "(vide)"}`,
    "J’ai renvoyé vers 15 / 17 / 18 / 112 et demandé lieu / nature / timing. Ce n’est pas un service de secours.",
  ].join("\n");
}

export const EMERGENCY_GATHER_PREFIX =
  "[URGENCE — ne pas remplacer les secours. Rappeler 15/17/18/112 en France. " +
  "Collecter: lieu, nature, timing, personnes, secours déjà appelés. " +
  "Pas de conseil médical qui retarde l’appel aux autorités.] ";
