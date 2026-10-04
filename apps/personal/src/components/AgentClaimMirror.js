import React from "react";
import {
  REVIEW_VERDICTS,
  isSalientItem,
  verdictToStance,
} from "../../../../scripts/lib/agent-acquired-context-review.js";
import {
  buildAlignmentPrompt,
  compareSnapshots,
} from "../../../../scripts/lib/agent-acquired-context-alignment.js";

const COPY = {
  banner: "Ceci est ce que l'agent affirme. Ce n'est pas une vérité objective.",
  absence: "L'absence d'un sujet ici ne signifie pas que l'agent ne le sait pas.",
  unreadable: "Cette réponse n'a pas été lue comme un instantané. Cela ne dit pas ce que l'agent sait ou ignore.",
  annotation: "Cette réponse est une annotation humaine. Elle ne remplace pas ce que l'agent affirme.",
  tension: "En tension avec un autre élément de cet instantané.",
  origins: {
    explicit_user_statement: "Énoncé attribué à la personne",
    inference: "Inférence",
    provider_memory: "Mémoire du fournisseur",
    unknown: "Origine inconnue",
  },
  counts: {
    explicit_user_statement: "énoncés attribués à la personne",
    inference: "inférences",
    provider_memory: "mémoire du fournisseur",
    unknown_origin: "origine inconnue",
    uncertainty_stated: "incertitude indiquée",
    contradictions: "contradictions conservées",
  },
  categories: {
    preferences: "Préférences",
    career: "Activité",
    instructions: "Instructions",
    identity: "Identité",
    relationships: "Relations",
    projects: "Projets",
    "capture-limit": "Limite de la capture",
    known: "Ce qu'il pense savoir",
    inferred: "Ce qu'il suppose",
    recurring_topics: "Sujets récurrents",
    working_style: "Manière de travailler",
    unknowns: "Limites reconnues",
    context_limits: "Limites du contexte",
  },
  kinds: {
    claim: "affirmation",
    preference: "préférence",
    instruction: "instruction",
    relationship: "relation",
    other: "autre",
    unknown: "genre inconnu",
  },
  verdicts: {
    accepted: "Confirmé (Oui, c’est moi)",
    nuanced: "À nuancer",
    rejected: "Rejeté (Faux)",
    obsolete: "Périmé / obsolète",
    private: "Ne pas conserver (Restreint)",
    unknown: "Inconnu (Non vérifiable)",
  },
  salienceHeader: "Points d'attention prioritaires",
  salienceNotice: "Examen facultatif : vous pouvez cibler les affirmations en tension ou incertaines sans devoir tout valider.",
  unreviewedBadge: "Non examiné (optionnel)",
  userReviewHeading: "Votre examen",
};

const COUNT_ORDER = Object.keys(COPY.counts);

const ORIGIN_CLASS = {
  explicit_user_statement: "border-l-2 border-signal",
  inference: "border-l-2 border-amber-400",
  provider_memory: "border-l-2 border-blue-400",
  unknown: "border-l-2 border-slate-600",
};

function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}

function categoryLabel(label) {
  return COPY.categories[label] || label;
}

function visibleDetail(detail) {
  const prefix = "Declared basis: ";
  if (typeof detail === "string" && detail.startsWith(prefix)) {
    return `Base déclarée : ${detail.slice(prefix.length)}`;
  }
  return detail;
}

function visibleUncertainty(note) {
  if (note === "Declared confidence: low.") return "Confiance déclarée : faible.";
  if (note === "Declared confidence: medium.") return "Confiance déclarée : moyenne.";
  return note;
}

function visibleWarning(warning) {
  if (typeof warning === "string" && warning.startsWith("This paste is a kys snapshot portrait.")) {
    return "Cette réponse est un portrait d'instantané. Elle est montrée comme ce que l'agent affirme, et elle n'a pas été validée comme cogentia.agent-acquired-context.v0.";
  }
  return warning;
}

function sourceLines(source) {
  if (!source) return [];
  return [
    `Agent : ${source.agent}`,
    `Fournisseur : ${source.provider}`,
    source.model ? `Modèle : ${source.model}` : "Modèle non indiqué",
    source.platform ? `Plateforme : ${source.platform}` : "Plateforme non indiquée",
    source.memory_scope ? `Portée déclarée : ${source.memory_scope}` : "Portée de mémoire non indiquée",
  ];
}

function ItemView({ item, review = null, onReview = null }) {
  const salient = isSalientItem(item);
  return h("article", {
    "data-item-id": item.id,
    "data-origin": item.claimed_origin,
    "data-uncertainty": item.uncertainty_status,
    "data-user-review": review?.verdict || "unreviewed",
    "data-review-stance": review?.stance || (review?.verdict ? verdictToStance(review.verdict) : "unreviewed"),
    "data-salience": salient ? "priority" : "regular",
    className: `pl-3 space-y-2 ${ORIGIN_CLASS[item.claimed_origin] || ORIGIN_CLASS.unknown}`,
  },
  h("div", { "data-agent-assertion": item.id, className: "space-y-1" },
    h("p", { className: "font-body text-sm text-bright leading-relaxed" }, item.content),
    item.detail
      ? h("p", { className: "font-body text-xs text-dim mt-2", "data-basis": item.id }, visibleDetail(item.detail))
      : null,
    h("p", { className: "tag mt-2" }, COPY.origins[item.claimed_origin] || COPY.origins.unknown),
    item.uncertainty_note
      ? h("p", { className: "font-body text-xs text-dim mt-2", "data-uncertainty-note": item.id }, visibleUncertainty(item.uncertainty_note))
      : null,
    item.contradicts.length
      ? h("p", { className: "font-body text-xs text-dim mt-2" }, COPY.tension)
      : null,
  ),
  h("details", { "data-item-details": item.id, className: "mt-2" },
    h("summary", { className: "font-mono text-xs text-muted cursor-pointer" }, "Détail de l'élément"),
    h("dl", { className: "mt-2 space-y-1 font-mono text-xs text-muted" },
      h("div", null, `Identifiant : ${item.id}`),
      h("div", null, `Genre : ${COPY.kinds[item.record_kind] || item.record_kind}`),
      h("div", null, `Sensibilité : ${item.sensitivity}`),
      h("div", null, item.claimed_time_status === "known"
        ? `Moment allégué : ${item.claimed_time_value}`
        : "Moment allégué non indiqué"),
      item.contradicts.length
        ? h("div", null, `Contredit : ${item.contradicts.join(", ")}`)
        : null,
    ),
  ),
  h("div", {
    "data-human-review": item.id,
    className: "mt-3 pt-2 border-t border-border/40 space-y-2",
  },
    h("div", { className: "flex flex-wrap items-center justify-between gap-2" },
      h("span", { className: "font-mono text-xs text-muted" }, COPY.userReviewHeading),
      review?.verdict
        ? h("span", {
          className: "tag text-xs font-mono text-signal border-signal/40",
          "data-review-badge": item.id,
        }, `${COPY.verdicts[review.verdict] || review.verdict}${review.note ? " · avec précision" : ""}`)
        : h("span", { className: "font-mono text-xs text-muted/60" }, COPY.unreviewedBadge),
    ),
    onReview ? h(React.Fragment, null,
      h("div", { className: "flex flex-wrap gap-1.5", "data-review-controls": item.id },
        REVIEW_VERDICTS.map((verdict) => {
          const active = review?.verdict === verdict.id;
          return h("button", {
            key: verdict.id,
            type: "button",
            "data-verdict-button": verdict.id,
            onClick: () => {
              if (active) onReview(item.id, null);
              else onReview(item.id, { verdict: verdict.id, stance: verdict.stance, note: review?.note || "" });
            },
            className: `px-2.5 py-1 rounded text-xs transition-colors border ${
              active
                ? "border-signal bg-signal/15 text-bright font-medium"
                : "border-border text-dim hover:border-dim hover:text-bright"
            }`,
          }, verdict.label);
        }),
      ),
      review?.verdict ? h("div", { className: "pt-1" },
        h("input", {
          type: "text",
          className: "input text-xs w-full",
          value: review.note || "",
          placeholder: "Votre précision ou restriction d'usage (facultative)…",
          "data-review-note-input": item.id,
          onChange: (event) => onReview(item.id, { note: event.target.value }),
        }),
      ) : null,
    ) : null,
  ));
}

export function AlignmentPromptSection({
  reviews = {},
  snapshot = null,
  provider = "votre agent conversationnel",
}) {
  const [copied, setCopied] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState(null);

  const defaultPrompt = React.useMemo(() => {
    return buildAlignmentPrompt({
      reviews,
      snapshot,
      provider: typeof provider === "string" ? provider : (provider?.provider || "votre agent conversationnel"),
      language: "fr",
    });
  }, [reviews, snapshot, provider]);

  const promptValue = customPrompt !== null ? customPrompt : defaultPrompt;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(promptValue).catch(() => {});
    }
    setCopied(true);
    if (typeof window !== "undefined" && window.setTimeout) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return h("section", {
    "data-alignment-section": "true",
    className: "card border-signal/40 bg-panel/30 p-4 space-y-4",
  },
    h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" },
      h("div", null,
        h("h3", { className: "font-display text-base font-semibold text-bright" }, "Consigne d'alignement pour l'agent"),
        h("p", {
          "data-bounded-memory-notice": "true",
          className: "font-body text-xs text-dim mt-1",
        }, "Cette consigne facultative transmet vos rectifications à l'agent sans supposer de mémoire persistante garantie. Vous pouvez la relire, l'ajuster ou la copier."),
      ),
      h("button", {
        type: "button",
        onClick: handleCopy,
        "data-copy-alignment-prompt": "true",
        className: "btn-primary text-xs shrink-0 self-start sm:self-center",
      }, copied ? "Copié ✓" : "Copier la consigne"),
    ),
    h("textarea", {
      "data-alignment-prompt-text": "true",
      className: "input min-h-36 font-mono text-xs w-full leading-relaxed resize-y",
      value: promptValue,
      onChange: (event) => setCustomPrompt(event.target.value),
      spellCheck: false,
    }),
  );
}

export function ReobservationComparisonCard({
  comparison = null,
  preSnapshot = null,
  postSnapshot = null,
  preReviews = {},
}) {
  const comp = comparison || (preSnapshot && postSnapshot ? compareSnapshots(preSnapshot, postSnapshot, preReviews) : null);
  if (!comp) return null;

  return h("section", {
    "data-reobservation-comparison": "true",
    className: "card border-signal/40 bg-panel/20 p-4 space-y-4",
  },
    h("div", { className: "space-y-1" },
      h("h3", { className: "font-display text-base font-semibold text-bright" }, "Ré-observation : comparaison avec l'instantané précédent"),
      h("p", {
        "data-epistemic-disclaimer": "true",
        role: "note",
        className: "font-body text-xs text-dim border-l-2 border-signal/60 pl-3 py-1",
      }, comp.epistemicDisclaimer),
    ),
    h("div", {
      "data-comparison-metrics": "true",
      className: "flex flex-wrap gap-2 text-xs font-mono",
    },
      h("span", {
        "data-metric": "remedied",
        className: "tag text-signal border-signal/30",
      }, `${comp.remediedCount} rectifications prises en compte`),
      comp.conflictsCount > 0 ? h("span", {
        "data-metric": "conflicts",
        className: "tag text-amber-400 border-amber-400/30",
      }, `${comp.conflictsCount} tensions persistantes`) : null,
      h("span", {
        "data-metric": "retained",
        className: "tag text-dim",
      }, `${comp.retainedCount} affirmations conservées`),
      h("span", {
        "data-metric": "dropped",
        className: "tag text-dim",
      }, `${comp.droppedCount} affirmations disparues`),
      comp.addedCount > 0 ? h("span", {
        "data-metric": "added",
        className: "tag text-dim",
      }, `${comp.addedCount} nouvelles affirmations`) : null,
    ),
    comp.reviewAdherence && comp.reviewAdherence.length > 0 ? h("div", {
      "data-adherence-list": "true",
      className: "space-y-2 pt-2 border-t border-border/40",
    },
      h("h4", { className: "font-body text-xs font-semibold text-bright uppercase tracking-wider" }, "Suivi de vos rectifications"),
      h("ul", { className: "space-y-2 text-xs font-body" },
        comp.reviewAdherence.map((item, idx) => h("li", {
          key: idx,
          "data-adherence-item": item.claim,
          "data-outcome": item.outcome,
          className: `p-2 rounded border ${item.outcome === "persisting_conflict" ? "border-amber-400/40 bg-amber-950/20 text-bright" : "border-border/40 bg-panel/30 text-dim"}`,
        },
          h("div", { className: "flex flex-wrap items-center justify-between gap-1 mb-1 font-mono text-xs" },
            h("span", { className: "font-medium text-bright" }, item.claim),
            h("span", {
              className: `tag text-[10px] ${item.outcome === "remedied" ? "text-signal border-signal/30" : item.outcome === "persisting_conflict" ? "text-amber-400 border-amber-400/30" : "text-dim"}`,
            }, item.outcome),
          ),
          h("p", { className: "text-dim text-[11px]" }, item.statusMessage),
        )),
      ),
    ) : null,
  );
}

export function AgentClaimMirror({ model, reviews = {}, onReview = null, comparison = null }) {
  if (!model) return null;
  const [filter, setFilter] = React.useState("all");
  const counts = COUNT_ORDER.filter((key) => Object.hasOwn(model.counts || {}, key));
  const allItems = (model.categories || []).flatMap((cat) => cat.items || []);
  const salientItems = allItems.filter(isSalientItem);
  const reviewedCount = allItems.filter((item) => reviews && reviews[item.id]?.verdict).length;

  const displayedCategories = (model.categories || []).map((category) => {
    let items = category.items;
    if (filter === "salient") items = items.filter(isSalientItem);
    else if (filter === "reviewed") items = items.filter((it) => reviews && reviews[it.id]?.verdict);
    else if (filter === "unreviewed") items = items.filter((it) => !reviews || !reviews[it.id]?.verdict);
    return { ...category, items };
  }).filter((category) => category.items.length > 0);

  return h("section", {
    "aria-label": "Miroir des affirmations de l'agent",
    "data-mirror": "agent-claims",
    "data-mirror-state": model.state,
    className: "space-y-4",
  },
  h("p", {
    "data-claim-banner": "agent_claim_not_fact",
    role: "note",
    className: "font-body text-sm text-bright border border-signal/30 bg-panel/40 rounded-lg px-4 py-3",
  }, COPY.banner),
  comparison ? h(ReobservationComparisonCard, { comparison }) : null,
  model.state === "claims" ? h(React.Fragment, null,
    h("p", { className: "font-body text-sm text-dim", "data-source": "agent" }, sourceLines(model.source).join(" · ")),
    model.summary
      ? h("p", { className: "font-body text-sm text-bright leading-relaxed", "data-relationship-summary": "true" }, model.summary)
      : null,
    counts.length
      ? h("ul", { className: "flex flex-wrap gap-2", "data-counts": "supported" }, counts.map((key) => (
        h("li", { key, className: "tag", "data-count": key }, `${model.counts[key]} ${COPY.counts[key]}`)
      )))
      : null,
    salientItems.length > 0 ? h("div", {
      "data-salience-banner": "true",
      className: "card bg-panel/30 border border-signal/30 p-4 space-y-3",
    },
      h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" },
        h("div", null,
          h("p", { className: "font-display text-sm font-semibold text-bright" },
            `${COPY.salienceHeader} (${salientItems.length})`),
          h("p", { className: "font-body text-xs text-dim mt-0.5" },
            COPY.salienceNotice),
        ),
        h("div", { className: "flex flex-wrap gap-1.5", "data-salience-filters": "true" },
          h("button", {
            type: "button",
            onClick: () => setFilter("all"),
            className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "all" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
            "data-filter": "all",
          }, `Toutes (${allItems.length})`),
          h("button", {
            type: "button",
            onClick: () => setFilter("salient"),
            className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "salient" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
            "data-filter": "salient",
          }, `Prioritaires (${salientItems.length})`),
          reviewedCount > 0 ? h("button", {
            type: "button",
            onClick: () => setFilter("reviewed"),
            className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "reviewed" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
            "data-filter": "reviewed",
          }, `Examinées (${reviewedCount})`) : null,
          h("button", {
            type: "button",
            onClick: () => setFilter("unreviewed"),
            className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "unreviewed" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
            "data-filter": "unreviewed",
          }, `Non examinées (${allItems.length - reviewedCount})`),
        ),
      ),
    ) : null,
    displayedCategories.map((category) => h("section", {
      key: category.label,
      className: "card space-y-4",
      "data-category": category.label,
    },
    h("h2", { className: "font-display text-lg font-semibold text-bright" }, categoryLabel(category.label)),
    category.items.map((item) => h(ItemView, { key: item.id, item, review: reviews?.[item.id] || null, onReview })),
    )),
    reviewedCount > 0 ? h(AlignmentPromptSection, {
      reviews,
      snapshot: model,
      provider: model.source?.provider || model.source?.agent,
    }) : null,
    h("p", { className: "font-body text-xs text-muted", "data-absence-note": "true" }, COPY.absence),
  ) : h("p", { className: "font-body text-sm text-dim", role: "status" },
    model.state === "annotation" ? COPY.annotation : COPY.unreadable,
  ),
  model.state !== "claims" && model.diagnostics?.length
    ? h("ul", { className: "list-disc pl-5 font-body text-xs text-dim space-y-1", "data-diagnostics": "true" },
      model.diagnostics.map((diagnostic) => h("li", { key: diagnostic }, diagnostic)))
    : null,
  h("details", { "data-raw-details": "true", className: "card" },
    h("summary", { className: "font-body text-sm text-dim cursor-pointer" }, "Réponse brute et champs avancés"),
    model.raw?.sha256 ? h("p", { className: "font-mono text-xs text-muted mt-3 break-all" }, model.raw.sha256) : null,
    model.advanced?.capture_id
      ? h("p", { className: "font-mono text-xs text-muted mt-2" }, model.advanced.capture_id)
      : null,
    model.warnings?.length
      ? h("ul", { className: "mt-3 font-body text-xs text-dim space-y-1" },
        model.warnings.map((warning) => h("li", { key: warning }, visibleWarning(warning))))
      : null,
    model.extensions?.length
      ? h("ul", { className: "mt-3 font-mono text-xs text-muted space-y-1", "data-extensions": "true" },
        model.extensions.map((extension) => h("li", { key: extension.path }, extension.path)))
      : null,
    h("pre", { className: "mt-3 whitespace-pre-wrap font-mono text-xs text-dim" }, model.raw?.text || ""),
  ));
}

export function immediatePasteText(currentText, pastedText) {
  const current = String(currentText ?? "");
  const pasted = String(pastedText ?? "");
  if (!current.trim() && pasted.trim()) return pasted;
  return null;
}

export function LearnedContextPasteForm({ text, onText, onReveal, onPaste, mirror, reviews = {}, onReview = null, pending, failure, comparison = null }) {
  return h("div", { className: "max-w-3xl mx-auto px-4 py-10 space-y-6" },
    h("p", { className: "font-mono text-signal text-xs tracking-widest uppercase" }, "Miroir immédiat"),
    h("h1", { className: "font-display text-3xl md:text-4xl font-bold text-bright" }, "Ce que cet agent affirme savoir"),
    h("p", { className: "font-body text-sm text-dim leading-relaxed" },
      "Collez la réponse de votre agent, en YAML ou en JSON. Le miroir s'affiche sur cette page, avant toute demande de compte."),
    h("form", {
      "data-paste-form": "learned-context",
      className: "space-y-3",
      onSubmit: (event) => {
        event.preventDefault();
        onReveal();
      },
    },
    h("label", { className: "label", htmlFor: "learned-context-reply" }, "Réponse collée"),
    h("textarea", {
      id: "learned-context-reply",
      className: "input min-h-40 font-mono text-xs",
      value: text,
      onChange: (event) => onText(event.target.value),
      onPaste,
      spellCheck: false,
    }),
    h("button", { className: "btn-primary w-full sm:w-auto", type: "submit" },
      pending ? "Lecture de la réponse…" : "Afficher le miroir"),
    h("p", { className: "font-body text-xs text-muted" }, "Sans compte. La réponse reste dans cette page."),
    ),
    failure ? h("p", { role: "alert", className: "font-body text-sm text-dim" }, failure) : null,
    mirror ? h(AgentClaimMirror, { model: mirror, reviews, onReview, comparison }) : null,
  );
}


