/**
 * Public Guide profiles and draft-only act preparation.
 *
 * Conversation is not a submission. A prepared act is not an executed act.
 * Preparation is local and has no send, retrieval, packet, or corpus write.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_PREFIX = "projects/suicide-corse/";
const CORPUS_REPOS = new Set(["barons-mariani", "jeanhuguesrobert/barons-mariani"]);

export const SUICIDE_CORSE_PROFILE_PROMPT = [
  "Public Guide profile: suicide-corse.",
  "This profile overrides the generic FractaVolta product identity for this turn.",
  "You are the public Suicide Corse Guide. You are not Marie-Louise and you are not a private intake desk.",
  "Answer only from the supplied in-scope public excerpts. If they do not establish a fact, the fact stays unknown.",
  "Do not invent dates, names, places, documents, motives, or evidence.",
  "Do not convert speculation into observation. Hypotheses remain hypotheses.",
  "Never write in her voice. Never invent Marie-Louise's wishes, memories, motives, or answers.",
  "A conversation with this Guide is not testimony, not evidence, and not a submission.",
  "Political material stays descriptive or analytical. Do not endorse, rank, or predict.",
  "Private testimony and private registers are unreadable here. Do not imply access to them.",
  "Do not say that this conversation has been sent, recorded, or accepted as a contribution.",
].join("\n");

const FRACTAVOLTA_MANDATE = Object.freeze({
  instance_id: "fractavolta-public-guide",
  surface: "web-guide",
  maturity: "infant",
  corpus_view: "public",
  profile: "fractavolta",
  allowed: Object.freeze(["orient", "retrieve", "cite", "explain-public-corpus", "prepare-act"]),
  forbidden: Object.freeze([
    "private-view",
    "mutate",
    "publish",
    "send",
    "unbounded-provider-spend",
    "owner-impersonation",
  ]),
});

const SUICIDE_CORSE_MANDATE = Object.freeze({
  instance_id: "suicide-corse-public-guide",
  surface: "web-guide",
  maturity: "infant",
  corpus_view: "public",
  profile: "suicide-corse",
  allowed: Object.freeze([
    "orient",
    "retrieve-public-suicide-corse-corpus",
    "cite",
    "explain-public-corpus",
    "prepare-act",
  ]),
  forbidden: Object.freeze([
    "private-view",
    "mutate",
    "publish",
    "send",
    "intake",
    "corpus-write",
    "marie-louise-impersonation",
    "edition-mutation",
    "unbounded-web",
    "agent-john-bypass",
    "owner-impersonation",
  ]),
});

const ACTS = {
  fractavolta: [
    act("technical-report", "jhr@baronsmariani.org", {
      fr: "FractaVolta — brouillon de signalement technique",
      en: "FractaVolta — technical report draft",
    }, {
      fr: "Ce brouillon ne dépose pas un signalement et n'ouvre pas de chantier.",
      en: "This draft does not file a report and does not open work.",
    }),
    act("pilot-contact", "jhr@baronsmariani.org", {
      fr: "FractaVolta — brouillon de contact pilote",
      en: "FractaVolta — pilot contact draft",
    }, {
      fr: "Ce brouillon ne démarre pas un pilote et n'envoie pas de message.",
      en: "This draft does not start a pilot and does not send a message.",
    }),
  ],
  "suicide-corse": [
    act("submit-testimony", "institutmariani@gmail.com", {
      fr: "Suicide Corse — brouillon de témoignage",
      en: "Suicide Corse — testimony draft",
    }, {
      fr: "Ce brouillon ne parle pas à la place de Marie-Louise et n'ajoute aucun fait que le visiteur n'a pas écrit.",
      en: "This draft does not speak as Marie-Louise and adds no fact the visitor did not write.",
    }),
    act("report-correction", "institutmariani@gmail.com", {
      fr: "Suicide Corse — brouillon de correction",
      en: "Suicide Corse — correction draft",
    }, {
      fr: "Ce brouillon ne parle pas à la place de Marie-Louise et ne transforme pas une correction en fait établi.",
      en: "This draft does not speak as Marie-Louise and does not turn a correction into an established fact.",
    }),
  ],
};

const scopeCache = new Map();

function act(id, to, subject, closing) {
  return { id, transport: "email", to, subject, closing };
}

export function defaultSuicideCorseManifestPath() {
  return path.resolve(moduleDir, "../../../barons-Mariani/projects/suicide-corse/corpus.yml");
}

export function resolvePublicGuideProfile(raw, options = {}) {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!id) return { ok: true, profile: null };
  if (id === "fractavolta") return { ok: true, profile: fractavoltaProfile() };
  if (id === "suicide-corse") return { ok: true, profile: suicideCorseProfile(options) };
  return { ok: false, error: "unknown_profile" };
}

export function filterRetrievalForProfile(retrieval, profile) {
  if (!profile?.sourceScope || !retrieval || typeof retrieval !== "object") return retrieval;
  const sources = Array.isArray(retrieval.sources) ? retrieval.sources : [];
  const kept = sources.filter(source => sourceAllowed(source, profile.sourceScope));
  const keptIds = new Set(kept.map(source => String(source.source_id || "")));
  const context = Array.isArray(retrieval.context)
    ? retrieval.context.filter(item => keptIds.has(String(item?.source_id || "")))
    : retrieval.context;
  const removed = sources.length - kept.length;
  let s7 = retrieval.s7;
  if (s7?.ok && !sourceAllowed({
    repo: s7.canonical_repo,
    path: s7.canonical_rel,
    source_id: s7.ref || "",
  }, profile.sourceScope)) {
    s7 = { ...s7, ok: false, filtered_by_profile: true };
  }
  return {
    ...retrieval,
    sources: kept,
    context,
    s7,
    warnings: [
      ...(Array.isArray(retrieval.warnings) ? retrieval.warnings : []),
      ...(removed > 0 ? [`profile_source_filtered:${removed}`] : []),
    ],
  };
}

export function sourceAllowedByProfile(source, profile) {
  if (!profile?.sourceScope) return true;
  return sourceAllowed(source, profile.sourceScope);
}

export function resolveProfileWebSearch(profile, question, payload = {}) {
  if (!profile || profile.webSearch === "inherit") return { mode: "inherit" };
  if (payload.web_search === false || payload.webSearch === false) {
    return { mode: "off", reason: "profile_web_caller_disabled" };
  }
  if (payload.web_search === true || payload.webSearch === true) {
    return { mode: "on", reason: "profile_web_explicit_flag" };
  }
  if (questionRequestsExternalVerification(question)) {
    return { mode: "on", reason: "profile_web_explicit_question" };
  }
  return { mode: "off", reason: "profile_web_default_off" };
}

export function preparePublicGuideAct(input = {}) {
  const profileId = String(input.profile ?? "").trim().toLowerCase();
  const templates = ACTS[profileId];
  if (!templates) return actError(400, "unknown_profile");
  const actId = String(input.act || input.template || input.act_id || "").trim();
  const template = templates.find(item => item.id === actId);
  if (!template) return actError(400, "unknown_act");
  const locale = String(input.locale || "fr").toLowerCase() === "en" ? "en" : "fr";
  const visitorText = collectVisitorText(input.context ?? input.text, input.history);
  if (!visitorText) return actError(400, "missing_act_context");
  const notice = locale === "en" ? "Draft — not sent" : "Brouillon — non envoyé";
  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      profile: profileId,
      prepared_act: {
        kind: template.id,
        transport: template.transport,
        to: template.to,
        subject: template.subject[locale],
        body: renderDraft(template, locale, visitorText, notice),
        executed: false,
        draft: true,
        notice,
      },
    },
  };
}

function fractavoltaProfile() {
  return {
    id: "fractavolta",
    bindsSurface: false,
    surfaceId: "fractavolta-public-guide",
    usesCanonicalCache: true,
    webSearch: "inherit",
    mandate: FRACTAVOLTA_MANDATE,
    sourceScope: null,
    sourceScopeSummary: null,
    prompt: "",
  };
}

function suicideCorseProfile(options) {
  const sourceScope = loadSuicideCorseScope(options);
  return {
    id: "suicide-corse",
    bindsSurface: true,
    surfaceId: "suicide-corse-public-guide",
    usesCanonicalCache: false,
    webSearch: "explicit",
    mandate: SUICIDE_CORSE_MANDATE,
    sourceScope,
    sourceScopeSummary: {
      mode: sourceScope.mode,
      repos: ["barons-Mariani"],
      path_prefix: PROJECT_PREFIX,
      manifest_path: sourceScope.manifestPath,
      manifest_path_count: sourceScope.exactPaths.size,
      issue_numbers: [...sourceScope.issueNumbers],
    },
    prompt: SUICIDE_CORSE_PROFILE_PROMPT,
  };
}

function loadSuicideCorseScope(options = {}) {
  if (typeof options.manifestText === "string") {
    return scopeFromManifest(options.manifestText, "manifest", options.manifestPath || null);
  }
  const manifestPath = options.manifestPath || defaultSuicideCorseManifestPath();
  if (scopeCache.has(manifestPath)) return scopeCache.get(manifestPath);
  let scope;
  try {
    scope = scopeFromManifest(fs.readFileSync(manifestPath, "utf8"), "manifest", manifestPath);
  } catch {
    scope = failClosedScope(manifestPath);
  }
  scopeCache.set(manifestPath, scope);
  return scope;
}

function failClosedScope(manifestPath) {
  return {
    mode: "fail_closed",
    manifestPath: manifestPath || null,
    exactPaths: new Set(),
    issueNumbers: [],
  };
}

function scopeFromManifest(text, mode, manifestPath) {
  const parsed = parseCorpusManifest(text);
  if (!parsed.paths.length && !parsed.issueNumbers.length) return failClosedScope(manifestPath);
  return {
    mode,
    manifestPath: manifestPath || null,
    exactPaths: new Set(parsed.paths),
    issueNumbers: parsed.issueNumbers,
  };
}

function parseCorpusManifest(text) {
  const paths = [];
  const issueNumbers = [];
  let section = "";
  for (const line of String(text || "").split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (top) {
      section = top[1];
      continue;
    }
    if (section === "sources" || section === "projections" || section === "architecture") {
      const found = line.match(/^\s+(?:path|contract|freeze):\s*(.+?)\s*$/);
      if (found) paths.push(unquote(found[1]));
    }
    if (section === "issues") {
      const found = line.match(/^\s+[A-Za-z0-9_]+:\s*(\d+)\s*$/);
      if (found) issueNumbers.push(Number(found[1]));
    }
  }
  return {
    paths: paths.filter(Boolean),
    issueNumbers,
  };
}

function sourceAllowed(source, scope) {
  const located = locateSource(source);
  if (isIssueProjection(source, located, scope)) return true;
  if (!CORPUS_REPOS.has(located.repo)) return false;
  if (located.filePath === PROJECT_PREFIX.slice(0, -1) || located.filePath.startsWith(PROJECT_PREFIX)) return true;
  return scope.exactPaths.has(located.filePath);
}

function isIssueProjection(source, located, scope) {
  if (!scope.issueNumbers.length) return false;
  const blob = [
    located.repo,
    located.filePath,
    located.sourceId,
    source?.title,
    source?.description,
  ].join("\n").toLowerCase();
  if (!blob.includes("suicide-corse") && !blob.includes("barons-mariani")) return false;
  const looksLikeIssue = /(?:^|[^\w])issues?[\/#_-]|\.cogentia\/issues|#\d+/.test(blob);
  if (!looksLikeIssue) return false;
  return scope.issueNumbers.some(number => new RegExp(`(?:^|[^0-9])${number}(?:[^0-9]|$)`).test(blob));
}

function locateSource(source) {
  let repo = String(source?.repo || "").trim().toLowerCase();
  let filePath = String(source?.path || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const sourceId = String(source?.source_id || "").trim();
  if ((!repo || !filePath) && sourceId) {
    const match = sourceId.match(/^([^:#\s]+):([^#]+)/);
    if (match) {
      if (!repo) repo = match[1].trim().toLowerCase();
      if (!filePath) filePath = match[2].trim().replace(/^\/+/, "");
    }
  }
  return { repo, filePath, sourceId };
}

function questionRequestsExternalVerification(question) {
  return /\b(web|internet|en ligne|online)\b|\b(actualités|actualites|news)\b|\b(aujourd['’]hui|today)\b|\b(source externe|external source|verify online|vérifi\w* en ligne|look up online)\b/i
    .test(String(question || ""));
}

function collectVisitorText(context, history) {
  const chunks = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (String(item?.role || "user").toLowerCase() !== "user") continue;
      const text = sanitizeActText(item?.content);
      if (text) chunks.push(text);
    }
  }
  const supplied = sanitizeActText(context);
  if (supplied) chunks.push(supplied);
  const unique = [];
  for (const chunk of chunks) {
    if (unique.at(-1) !== chunk) unique.push(chunk);
  }
  return unique.join("\n\n").slice(0, 12000);
}

function sanitizeActText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 4000);
}

function renderDraft(template, locale, visitorText, notice) {
  if (locale === "en") {
    return [
      `${notice}.`,
      "This message has not been sent. Preparing it did not submit, record, or prove anything.",
      "This conversation is not testimony.",
      `To: ${template.to}`,
      `Subject: ${template.subject.en}`,
      "",
      "Text supplied by the visitor:",
      visitorText,
      "",
      template.closing.en,
      "Sending, if it happens, remains the person's own act from their own mail client.",
    ].join("\n");
  }
  return [
    `${notice}.`,
    "Ce message n'a pas été envoyé. Le préparer n'a rien soumis, enregistré, ni prouvé.",
    "Cette conversation n'est pas un témoignage.",
    `Destinataire : ${template.to}`,
    `Objet : ${template.subject.fr}`,
    "",
    "Texte fourni par le visiteur :",
    visitorText,
    "",
    template.closing.fr,
    "L'envoi, s'il a lieu, reste un acte de la personne, depuis son propre logiciel de messagerie.",
  ].join("\n");
}

function actError(status, error) {
  return { ok: false, status, body: { ok: false, error } };
}

function unquote(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}
