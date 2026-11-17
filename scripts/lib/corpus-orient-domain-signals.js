/**
 * Source-bound, bilingual navigation cues for corpus.orient (#122/#105).
 * A cue is NOT evidence. At least two independent facets must match.
 * Targets MUST already appear in the caller's view-filtered inventory.
 * No new ontology, provider, index, or LLM call.
 */
const SIGNALS = Object.freeze([
  {
    id: "distributed-cognitive-continuity",
    source: ["cogentia", "research/cognitive_packet_switching.md"],
    facets: [
      ["session", "circuit", "liaison", "connexion", "connectivite", "reseau", "network", "connection"],
      ["execution", "executeur", "traitement", "processus", "tache", "travail", "job", "task", "processing", "agent"],
      ["coupure", "eteint", "interruption", "suspend", "indisponible", "panne", "repris", "reprise", "absent", "disparu", "attendre", "return", "resume", "restart"],
    ],
  },
  {
    id: "delay-tolerant-delivery",
    source: ["cogentia", "research/calculette_of_the_mind.md"],
    facets: [
      ["message", "requete", "paquet", "data", "transfert", "transfer", "packet", "relay", "relais"],
      ["contact", "demain", "lendemain", "differe", "plus tard", "attendre", "intermittent", "deconnect", "offline", "later", "delay", "retour"],
      ["progress", "livrai", "faire suivre", "transmet", "achemin", "expedit", "envoi", "forward", "deliver", "repartir", "transit", "stocke"],
    ],
  },
  {
    id: "minimum-sufficient-locality",
    source: ["cogentia", "research/locality_principle.md"],
    facets: [
      ["local", "rapproch", "deplac", "placement", "proxim", "transport", "move", "relocate", "minimis", "choisir"],
      ["calcul", "compute", "inference", "execution", "traitement", "processing", "workload", "task"],
      ["donnee", "data", "stockage", "storage", "octet", "transfert", "network", "memoire", "copy"],
    ],
  },
  {
    id: "optimistic-reconciliation",
    source: ["cogentia", "research/optimistic_mainline_governance.md"],
    facets: [
      ["concurr", "simultan", "parallel", "collision", "races", "deux redact", "plusieurs auteur", "concurrent"],
      ["modifi", "ecrit", "version", "edition", "branche", "merge", "change", "fichier", "document", "write"],
      ["verrou", "conflit", "reconcil", "coordination", "lock", "interdire", "merge", "conflict", "sans attendre"],
    ],
  },
  {
    id: "authority-versus-capability",
    source: ["cogentia", "research/capability_authority_control_data_planes_2026-11-10.md"],
    facets: [
      ["capacit", "capable", "pouvoir", "possible", "possibilit", "machine", "agent", "technique", "outil", "capability"],
      ["droit", "permission", "autorisa", "mandat", "habilit", "legitime", "admiss", "authority", "permitted", "allowed"],
      ["operation", "agir", "execut", "acte", "action", "effect", "execution", "outbound", "dispatch"],
    ],
  },
  {
    id: "packet-envelope-separation",
    source: ["cogentia", "research/cognitive_packets.md"],
    facets: [
      ["paquet", "packet", "cogniti", "enveloppe", "envelope", "conteneur"],
      ["metadonn", "header", "identit", "enveloppe", "envelope", "metadata", "format"],
      ["charge", "contenu", "payload", "donnee", "idee", "travail", "transport", "useful", "work"],
    ],
  },
  {
    id: "immutable-publication",
    source: ["cogentia", "research/living_book_press_architecture.md"],
    facets: [
      ["livre vivant", "magazine", "numero", "publication", "edition", "living book", "issue"],
      ["gel", "fige", "figee", "archive", "publie", "publiee", "frozen", "stable", "immutable"],
      ["corrig", "modifi", "reecr", "revision", "version", "suivante", "mise a jour", "update", "changer"],
    ],
  },
  {
    id: "content-addressed-object-identity",
    source: ["inseme", "packages/magistral/docs/object-memory-v0.md"],
    min_facets: 3, // hash + storage alone does not imply an identity question
    facets: [
      ["octet", "binaire", "hash", "sha256", "empreinte", "digest", "objet", "piece", "bytes", "object"],
      ["disque", "copie", "repliqu", "appareil", "stockage", "memoire", "serveur", "provider", "copies", "disk"],
      ["identit", "unique", "meme", "distinct", "different", "content address", "adress", "instance"],
    ],
  },
]);

function normalize(value) {
  return " " + String(value || "").normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() + " ";
}

function termMatches(haystack, raw) {
  const term = normalize(raw).trim();
  if (!term) return false;
  if (haystack.includes(" " + term + " ")) return true;
  // Prefixes support inflection, only for reasonably long single terms.
  if (term.length < 5 || term.includes(" ")) return false;
  return haystack.split(" ").some(token =>
    token.length >= term.length && token.startsWith(term)
  );
}

export function sourceBoundDomainSeeds(query, visibleDocuments, limit = 4) {
  const queryNorm = normalize(query);
  const bySource = new Map(
    visibleDocuments.map(doc => [doc.repo + "/" + (doc.rel || doc.path), doc])
  );
  const hits = [];
  for (const domain of SIGNALS) {
    const doc = bySource.get(domain.source.join("/"));
    if (!doc) continue;
    const evidence = domain.facets.map(facet =>
      facet.find(term => termMatches(queryNorm, term)) || null
    );
    const matched = evidence.filter(Boolean);
    if (matched.length < (domain.min_facets || 2)) continue;
    hits.push({
      name: doc.title || domain.id,
      repo: doc.repo,
      rel: doc.rel || doc.path,
      domain: domain.id,
      facet_matches: matched,
      matched_facets: matched.length,
      score: 104 + 7 * matched.length,
    });
  }
  return hits.sort((a,b)=>b.score-a.score || a.domain.localeCompare(b.domain))
    .slice(0,Math.max(0,limit));
}
