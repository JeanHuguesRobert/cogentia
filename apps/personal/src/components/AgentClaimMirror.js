import React from "react";

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
  },
  kinds: {
    claim: "affirmation",
    preference: "préférence",
    instruction: "instruction",
    relationship: "relation",
    other: "autre",
    unknown: "genre inconnu",
  },
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

function ItemView({ item }) {
  return h("article", {
    "data-item-id": item.id,
    "data-origin": item.claimed_origin,
    "data-uncertainty": item.uncertainty_status,
    className: `pl-3 ${ORIGIN_CLASS[item.claimed_origin] || ORIGIN_CLASS.unknown}`,
  },
  h("p", { className: "font-body text-sm text-bright leading-relaxed" }, item.content),
  h("p", { className: "tag mt-2" }, COPY.origins[item.claimed_origin] || COPY.origins.unknown),
  item.uncertainty_note
    ? h("p", { className: "font-body text-xs text-dim mt-2", "data-uncertainty-note": item.id }, item.uncertainty_note)
    : null,
  item.contradicts.length
    ? h("p", { className: "font-body text-xs text-dim mt-2" }, COPY.tension)
    : null,
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
  ));
}

export function AgentClaimMirror({ model }) {
  if (!model) return null;
  const counts = COUNT_ORDER.filter((key) => Object.hasOwn(model.counts || {}, key));
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
  model.state === "claims" ? h(React.Fragment, null,
    h("p", { className: "font-body text-sm text-dim", "data-source": "agent" }, sourceLines(model.source).join(" · ")),
    counts.length
      ? h("ul", { className: "flex flex-wrap gap-2", "data-counts": "supported" }, counts.map((key) => (
        h("li", { key, className: "tag", "data-count": key }, `${model.counts[key]} ${COPY.counts[key]}`)
      )))
      : null,
    model.categories.map((category) => h("section", {
      key: category.label,
      className: "card space-y-4",
      "data-category": category.label,
    },
    h("h2", { className: "font-display text-lg font-semibold text-bright" }, categoryLabel(category.label)),
    category.items.map((item) => h(ItemView, { key: item.id, item })),
    )),
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
        model.warnings.map((warning) => h("li", { key: warning }, warning)))
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

export function LearnedContextPasteForm({ text, onText, onReveal, onPaste, mirror, pending, failure }) {
  return h("div", { className: "max-w-3xl mx-auto px-4 py-10 space-y-6" },
    h("p", { className: "font-mono text-signal text-xs tracking-widest uppercase" }, "Miroir immédiat"),
    h("h1", { className: "font-display text-3xl md:text-4xl font-bold text-bright" }, "Ce que cet agent affirme savoir"),
    h("p", { className: "font-body text-sm text-dim leading-relaxed" },
      "Collez la réponse YAML de votre agent. Le miroir s'affiche sur cette page, avant toute demande de compte."),
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
    mirror ? h(AgentClaimMirror, { model: mirror }) : null,
  );
}
