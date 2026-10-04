import React, { useState } from "react";
import {
  EPISTEMIC_LAYERS,
  KNOWN_TRANSPARENCY_GAPS,
} from "../../../../scripts/lib/cogentia-introspection.js";

function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}

export function CogentiaIntrospectionPanel({
  model,
  onExport = null,
  onPurge = null,
  className = "",
}) {
  const [activeTab, setActiveTab] = useState("knows");
  const [selectedLayer, setSelectedLayer] = useState("all");

  if (!model || !model.ok) {
    return null;
  }

  const { counts, knows, why_cogentia_thinks_it, what_is_being_used_now, known_transparency_gaps } = model;

  return h("section", {
    "data-cogentia-introspection": "true",
    className: `card border-signal/40 bg-panel/30 p-5 space-y-5 ${className}`,
    "aria-label": "Auto-introspection et transparence symétrique de Cogentia",
  },
    // Header
    h("div", { className: "space-y-1.5" },
      h("div", { className: "flex flex-wrap items-center justify-between gap-2" },
        h("h3", { className: "font-display text-lg font-bold text-bright" },
          "Auto-introspection & Transparence symétrique"),
        h("span", {
          "data-symmetric-doctrine": "true",
          className: "tag font-mono text-[10px] text-signal border-signal/30",
        }, "Anti-capture symétrique"),
      ),
      h("p", { className: "font-body text-xs text-dim leading-relaxed" },
        "Cogentia applique à elle-même les règles de contestabilité exigées des agents tiers. Inspectez ici les 5 couches de ce qui est retenu, déduit et utilisé en temps réel."),
    ),

    // Top Level Counts
    h("div", {
      "data-introspection-counts": "true",
      className: "flex flex-wrap gap-2 text-xs font-mono",
    },
      h("span", {
        "data-count-layer": "source_data",
        className: "tag text-dim border-border/40",
      }, `${counts.source_data} sources brutes`),
      h("span", {
        "data-count-layer": "explicit_self_description",
        className: "tag text-signal border-signal/40 bg-signal/10",
      }, `${counts.explicit_self_description} auto-descriptions humaines`),
      h("span", {
        "data-count-layer": "external_agent_assertion",
        className: "tag text-bright border-border/40 bg-panel/50",
      }, `${counts.external_agent_assertion} affirmations d'agents`),
      h("span", {
        "data-count-layer": "cogentia_inference",
        className: "tag text-amber-400 border-amber-400/30 bg-amber-950/20",
      }, `${counts.cogentia_inference} inférences Cogentia`),
      counts.contested_or_obsolete_assertions > 0 ? h("span", {
        "data-count-layer": "contested_preserved",
        className: "tag text-dim border-border/40",
      }, `${counts.contested_or_obsolete_assertions} contestations historiques préservées`) : null,
    ),

    // Tab Navigation
    h("div", {
      className: "flex flex-wrap gap-1.5 pt-2 border-t border-border/40",
      "data-tab-nav": "true",
    },
      h("button", {
        type: "button",
        onClick: () => setActiveTab("knows"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${activeTab === "knows" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-tab-btn": "knows",
      }, "1. Que sait Cogentia ?"),
      h("button", {
        type: "button",
        onClick: () => setActiveTab("why"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${activeTab === "why" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-tab-btn": "why",
      }, "2. Pourquoi Cogentia le déduit-il ?"),
      h("button", {
        type: "button",
        onClick: () => setActiveTab("using"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${activeTab === "using" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-tab-btn": "using",
      }, "3. Qu'utilise Cogentia en ce moment ?"),
      h("button", {
        type: "button",
        onClick: () => setActiveTab("gaps"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${activeTab === "gaps" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-tab-btn": "gaps",
      }, "4. Limites de transparence connues"),
    ),

    // Tab Contents
    h("div", { className: "space-y-3 pt-2" },
      // Tab 1: Que sait Cogentia ?
      activeTab === "knows" ? h("div", { className: "space-y-4", "data-tab-content": "knows" },
        h("div", { className: "flex flex-wrap gap-1.5 text-xs", "data-layer-filters": "true" },
          h("button", {
            type: "button",
            onClick: () => setSelectedLayer("all"),
            className: `px-2 py-0.5 rounded text-[11px] ${selectedLayer === "all" ? "text-bright font-medium underline" : "text-dim"}`,
          }, "Toutes les couches"),
          Object.values(EPISTEMIC_LAYERS).map((layer) => h("button", {
            key: layer.id,
            type: "button",
            onClick: () => setSelectedLayer(layer.id),
            className: `px-2 py-0.5 rounded text-[11px] ${selectedLayer === layer.id ? "text-signal font-medium underline" : "text-dim"}`,
            "data-layer-btn": layer.id,
          }, layer.label)),
        ),
        // Layer list
        (selectedLayer === "all" || selectedLayer === "source_data") && knows.source_data.length > 0 ? (
          h("div", { className: "p-3 rounded border border-border/40 bg-panel/20 space-y-2", "data-layer-box": "source_data" },
            h("div", { className: "flex items-center justify-between text-xs font-mono" },
              h("span", { className: "font-semibold text-dim uppercase" }, "Couche : Données sources brutes"),
              h("span", { className: "tag text-[10px]" }, `${knows.source_data.length} item(s)`),
            ),
            h("ul", { className: "space-y-1.5 text-xs font-mono" },
              knows.source_data.map((item) => h("li", {
                key: item.id,
                "data-item-id": item.id,
                className: "p-2 rounded bg-panel/30 border border-border/30",
              },
                h("p", { className: "text-dim text-[11px]" }, item.provenance),
                h("p", { className: "text-bright truncate mt-1" }, item.content.slice(0, 100) + (item.content.length > 100 ? "…" : "")),
              )),
            ),
          )
        ) : null,

        (selectedLayer === "all" || selectedLayer === "explicit_self_description") && knows.explicit_self_description.length > 0 ? (
          h("div", { className: "p-3 rounded border border-signal/40 bg-signal/5 space-y-2", "data-layer-box": "explicit_self_description" },
            h("div", { className: "flex items-center justify-between text-xs font-mono" },
              h("span", { className: "font-semibold text-signal uppercase" }, "Couche : Auto-description humaine (Autorité prioritaire)"),
              h("span", { className: "tag text-[10px] text-signal border-signal/40" }, `${knows.explicit_self_description.length} item(s)`),
            ),
            h("ul", { className: "space-y-1.5 text-xs font-body" },
              knows.explicit_self_description.map((item) => h("li", {
                key: item.id,
                "data-item-id": item.id,
                className: "p-2 rounded bg-panel/40 border border-signal/20 space-y-0.5",
              },
                h("div", { className: "flex items-center justify-between font-mono text-[10px] text-dim" },
                  h("span", null, item.provenance),
                  item.verdict ? h("span", { className: "tag text-signal border-signal/30 text-[9px]" }, item.verdict) : null,
                ),
                item.note ? h("p", { className: "text-bright italic" }, `« ${item.note} »`) : null,
                item.content ? h("p", { className: "text-bright font-mono text-xs" }, item.content) : null,
              )),
            ),
          )
        ) : null,

        (selectedLayer === "all" || selectedLayer === "external_agent_assertion") && knows.external_agent_assertion.length > 0 ? (
          h("div", { className: "p-3 rounded border border-border/40 bg-panel/20 space-y-2", "data-layer-box": "external_agent_assertion" },
            h("div", { className: "flex items-center justify-between text-xs font-mono" },
              h("span", { className: "font-semibold text-bright uppercase" }, "Couche : Affirmations d'agents externes (Indices, non vérités)"),
              h("span", { className: "tag text-[10px]" }, `${knows.external_agent_assertion.length} item(s)`),
            ),
            h("ul", { className: "space-y-1.5 text-xs font-body" },
              knows.external_agent_assertion.map((item) => h("li", {
                key: item.id,
                "data-item-id": item.id,
                "data-active-truth": String(item.active_in_current_truth),
                className: `p-2 rounded border ${item.is_contested_or_obsolete ? "border-amber-400/30 bg-amber-950/10 text-dim" : "border-border/30 bg-panel/30 text-bright"}`,
              },
                h("div", { className: "flex items-center justify-between font-mono text-[10px] text-muted mb-1" },
                  h("span", null, item.historical_provenance),
                  item.is_contested_or_obsolete ? h("span", {
                    "data-historical-archive": "true",
                    className: "tag text-amber-400 border-amber-400/30 text-[9px]",
                  }, "Archive historique (contestée / obsolète)") : h("span", { className: "tag text-dim text-[9px]" }, "Observation active"),
                ),
                h("p", { className: item.is_contested_or_obsolete ? "line-through opacity-80" : "" }, item.content),
                item.human_review ? h("p", { className: "text-[11px] text-signal mt-1 italic" },
                  `Examen humain : ${item.human_review.verdict} ${item.human_review.note ? `(« ${item.human_review.note} »)` : ""}`) : null,
              )),
            ),
          )
        ) : null,

        (selectedLayer === "all" || selectedLayer === "cogentia_inference") && knows.cogentia_inference.length > 0 ? (
          h("div", { className: "p-3 rounded border border-amber-400/40 bg-amber-950/10 space-y-2", "data-layer-box": "cogentia_inference" },
            h("div", { className: "flex items-center justify-between text-xs font-mono" },
              h("span", { className: "font-semibold text-amber-400 uppercase" }, "Couche : Inférences de Cogentia"),
              h("span", { className: "tag text-[10px] text-amber-400 border-amber-400/30" }, `${knows.cogentia_inference.length} inférence(s)`),
            ),
            h("ul", { className: "space-y-1.5 text-xs font-body" },
              knows.cogentia_inference.map((inf) => h("li", {
                key: inf.id,
                "data-inference-id": inf.id,
                className: "p-2 rounded bg-panel/40 border border-amber-400/20 space-y-1",
              },
                h("div", { className: "flex items-center justify-between font-mono text-[10px]" },
                  h("span", { className: "font-semibold text-amber-400" }, inf.kind),
                  inf.label ? h("span", { className: "tag text-[9px]" }, inf.label) : null,
                ),
                h("p", { className: "text-dim text-[11px]" }, inf.derivation_rule),
                inf.derived_from ? h("p", { className: "font-mono text-[10px] text-muted" },
                  `Sources : ${inf.derived_from.join(" · ")}`) : null,
              )),
            ),
          )
        ) : null,
      ) : null,

      // Tab 2: Pourquoi Cogentia le déduit-il ?
      activeTab === "why" ? h("div", { className: "space-y-3", "data-tab-content": "why" },
        why_cogentia_thinks_it.map((item, idx) => h("div", {
          key: idx,
          "data-why-item": idx,
          className: "p-3 rounded border border-border/40 bg-panel/20 space-y-1",
        },
          h("h4", { className: "font-display text-xs font-bold text-bright" }, item.topic),
          h("p", { className: "font-body text-xs text-dim leading-relaxed" }, item.explanation),
        )),
        h("div", { className: "p-3 rounded border border-signal/30 bg-signal/5 text-xs font-body text-dim leading-relaxed" },
          "Règle de non-conflation : aucune inférence de Cogentia n'est confondue avec une assertion d'agent tiers. Chaque catégorisation (saillance, relation, alignement) repose sur une règle logique traçable et réversible."),
      ) : null,

      // Tab 3: Qu'utilise Cogentia en ce moment ?
      activeTab === "using" ? h("div", { className: "space-y-3 font-mono text-xs", "data-tab-content": "using" },
        h("div", { className: "p-3 rounded border border-border/40 bg-panel/20 space-y-2" },
          h("div", { className: "flex items-center justify-between border-b border-border/40 pb-2" },
            h("span", { className: "text-dim" }, "Tour en cours d'édition"),
            h("span", { className: "text-bright font-semibold" }, `Tour ${what_is_being_used_now.active_turn}`),
          ),
          h("div", { className: "flex items-center justify-between border-b border-border/40 pb-2" },
            h("span", { className: "text-dim" }, "Étape active"),
            h("span", { className: "text-bright font-semibold" }, `Étape ${what_is_being_used_now.active_step}`),
          ),
          h("div", { className: "flex items-center justify-between border-b border-border/40 pb-2" },
            h("span", { className: "text-dim" }, "Agent du tour actif"),
            h("span", { className: "text-bright font-semibold" }, what_is_being_used_now.active_provider),
          ),
          h("div", { className: "flex items-center justify-between border-b border-border/40 pb-2" },
            h("span", { className: "text-dim" }, "Instantané actif chargé"),
            h("span", { className: "text-bright" }, what_is_being_used_now.has_active_snapshot ? "Oui" : "Non"),
          ),
          h("div", { className: "flex items-center justify-between" },
            h("span", { className: "text-dim" }, "Persistance locale désactivée"),
            h("span", { className: "text-bright" }, what_is_being_used_now.local_persistence_disabled ? "Oui (Session éphémère)" : "Non (Conservé localement)"),
          ),
        ),
      ) : null,

      // Tab 4: Limites de transparence connues
      activeTab === "gaps" ? h("div", { className: "space-y-3", "data-tab-content": "gaps" },
        h("p", { className: "font-body text-xs text-muted leading-relaxed" },
          "Cogentia refuse d'afficher une illusion de transparence absolue. Les trois zones suivantes représentent des asymétries techniques réelles assumées :"),
        known_transparency_gaps.map((gap) => h("div", {
          key: gap.id,
          "data-transparency-gap": gap.id,
          className: "p-3 rounded border border-border/40 bg-panel/20 space-y-1",
        },
          h("div", { className: "flex items-center justify-between text-xs font-mono" },
            h("span", { className: "font-semibold text-bright" }, gap.area),
            h("span", { className: "tag text-[10px] text-dim" }, gap.status),
          ),
          h("p", { className: "font-body text-xs text-dim leading-relaxed" }, gap.explanation),
        )),
      ) : null,
    ),

    // Footer with Governance Controls
    h("div", {
      "data-governance-footer": "true",
      className: "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs",
    },
      h("span", { className: "text-dim font-mono" }, "Vos droits : rectifier · restreindre · exporter · purger"),
      h("div", { className: "flex flex-wrap gap-2" },
        onExport ? h("button", {
          type: "button",
          onClick: onExport,
          className: "btn-ghost text-xs py-1.5 px-3",
          "data-action": "export-introspection",
        }, "Exporter le modèle JSON") : null,
        onPurge ? h("button", {
          type: "button",
          onClick: onPurge,
          className: "btn-ghost text-xs py-1.5 px-3 text-red-400 border-red-500/30 hover:bg-red-500/10",
          "data-action": "purge-introspection",
        }, "Purger toutes les données") : null,
      ),
    ),
  );
}
