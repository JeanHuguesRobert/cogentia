import React, { useState } from "react";
import {
  COMPARISON_CATEGORIES,
  AUTHORITY_LEVELS,
  EPISTEMIC_DISCLAIMERS,
} from "../../../../scripts/lib/agent-context-comparison.js";

function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}

export function MultiAgentComparison({ comparison, className = "" }) {
  const [filter, setFilter] = useState("all");

  if (!comparison || !comparison.ok) {
    return null;
  }

  const { metrics, disclaimers, agents } = comparison;

  let displayedItems = comparison.items || [];
  if (filter === "convergence") displayedItems = comparison.convergences || [];
  else if (filter === "divergence") displayedItems = comparison.divergences || [];
  else if (filter === "unique") displayedItems = comparison.uniques || [];
  else if (filter === "disappeared") displayedItems = comparison.disappeared || [];
  else if (filter === "humanReviewed") displayedItems = comparison.humanReviewed || [];

  return h("section", {
    "data-multi-agent-comparison": "true",
    className: `card border-signal/40 bg-panel/30 p-5 space-y-5 ${className}`,
    "aria-label": "Comparaison multi-agents et longitudinale",
  },
    // Header
    h("div", { className: "space-y-2" },
      h("div", { className: "flex flex-wrap items-center justify-between gap-2" },
        h("h3", { className: "font-display text-lg font-bold text-bright" },
          "Comparaison multi-agents et longitudinale"),
        h("span", {
          "data-agents-count": agents.length,
          className: "tag font-mono text-xs text-signal border-signal/30",
        }, `${agents.length} agent(s) : ${agents.join(", ")}`),
      ),
      h("p", {
        "data-epistemic-disclaimer": "agreement_not_truth",
        role: "note",
        className: "font-body text-xs text-dim border-l-2 border-signal/60 pl-3 py-1",
      }, disclaimers.agreement_not_truth),
      h("p", {
        "data-epistemic-disclaimer": "disappearance_not_forgetting",
        role: "note",
        className: "font-body text-xs text-muted border-l-2 border-slate-600 pl-3 py-1",
      }, disclaimers.disappearance_not_forgetting),
    ),

    // Metric Badges
    h("div", {
      "data-comparison-metrics": "true",
      className: "flex flex-wrap gap-2 text-xs font-mono",
    },
      h("span", {
        "data-metric": "convergence",
        className: "tag text-bright border-signal/30 bg-panel/50",
      }, `${metrics.convergenceCount} convergences d'agents`),
      metrics.divergenceCount > 0 ? h("span", {
        "data-metric": "divergence",
        className: "tag text-amber-400 border-amber-400/40 bg-amber-950/20",
      }, `${metrics.divergenceCount} tensions & divergences`) : null,
      h("span", {
        "data-metric": "unique",
        className: "tag text-dim",
      }, `${metrics.uniqueCount} connaissances exclusives`),
      metrics.disappearedCount > 0 ? h("span", {
        "data-metric": "disappeared",
        className: "tag text-dim border-border/40",
      }, `${metrics.disappearedCount} disparitions temporelles (cause inconnue)`) : null,
      metrics.contestedCount > 0 ? h("span", {
        "data-metric": "contested",
        className: "tag text-signal border-signal/50 bg-signal/10",
      }, `${metrics.contestedCount} contestations humaines prioritaires`) : null,
    ),

    // Filter Navigation
    h("div", {
      className: "flex flex-wrap gap-1.5 pt-2 border-t border-border/40",
      "data-filter-bar": "true",
    },
      h("button", {
        type: "button",
        onClick: () => setFilter("all"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "all" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "all",
      }, `Toutes (${comparison.items.length})`),
      h("button", {
        type: "button",
        onClick: () => setFilter("convergence"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "convergence" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "convergence",
      }, `Convergences (${comparison.convergences.length})`),
      comparison.divergences.length > 0 ? h("button", {
        type: "button",
        onClick: () => setFilter("divergence"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "divergence" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "divergence",
      }, `Divergences (${comparison.divergences.length})`) : null,
      h("button", {
        type: "button",
        onClick: () => setFilter("unique"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "unique" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "unique",
      }, `Exclusivités (${comparison.uniques.length})`),
      comparison.disappeared.length > 0 ? h("button", {
        type: "button",
        onClick: () => setFilter("disappeared"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "disappeared" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "disappeared",
      }, `Disparitions (${comparison.disappeared.length})`) : null,
      comparison.humanReviewed.length > 0 ? h("button", {
        type: "button",
        onClick: () => setFilter("humanReviewed"),
        className: `px-2.5 py-1 rounded text-xs transition-colors ${filter === "humanReviewed" ? "bg-signal text-night font-medium" : "bg-panel text-dim hover:text-bright"}`,
        "data-filter-btn": "humanReviewed",
      }, `Arbitrages humains (${comparison.humanReviewed.length})`) : null,
    ),

    // Items List
    h("div", { className: "space-y-3 pt-2" },
      // Special rendering if filter is 'divergence'
      filter === "divergence" ? (
        comparison.divergences.map((divItem) => h("div", {
          key: divItem.id,
          "data-divergence-item": divItem.id,
          className: "p-3 rounded border border-amber-400/40 bg-amber-950/10 space-y-3",
        },
          h("div", { className: "flex items-center justify-between text-xs" },
            h("span", { className: "font-semibold text-amber-400 uppercase tracking-wider" }, "Tension / Contradiction conservée"),
            h("span", { className: "tag text-[10px] text-dim border-border/40" }, divItem.resolution_status),
          ),
          h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
            // Branch A
            h("div", { className: "p-2.5 rounded bg-panel/40 border border-border/40 space-y-1.5" },
              h("div", { className: "flex items-center justify-between text-xs font-mono" },
                h("span", { className: "text-signal font-medium" }, divItem.branch_a.providers.join(", ")),
                h("span", { className: "tag text-[10px]" }, divItem.branch_a.authority.label),
              ),
              h("p", { className: "text-xs font-body text-bright" }, divItem.branch_a.content),
              divItem.branch_a.human_review ? h("p", { className: "text-[11px] text-signal italic" },
                `Note humaine : ${divItem.branch_a.human_review.note || divItem.branch_a.human_review.verdict}`) : null,
            ),
            // Branch B
            h("div", { className: "p-2.5 rounded bg-panel/40 border border-border/40 space-y-1.5" },
              h("div", { className: "flex items-center justify-between text-xs font-mono" },
                h("span", { className: "text-amber-400 font-medium" }, divItem.branch_b.providers.join(", ")),
                h("span", { className: "tag text-[10px]" }, divItem.branch_b.authority.label),
              ),
              h("p", { className: "text-xs font-body text-bright" }, divItem.branch_b.content),
              divItem.branch_b.human_review ? h("p", { className: "text-[11px] text-signal italic" },
                `Note humaine : ${divItem.branch_b.human_review.note || divItem.branch_b.human_review.verdict}`) : null,
            ),
          ),
          h("p", { className: "text-[11px] font-body text-muted italic" }, divItem.epistemic_rule),
        ))
      ) : filter === "disappeared" ? (
        comparison.disappeared.map((item) => h("div", {
          key: item.id,
          "data-disappeared-item": item.id,
          className: "p-3 rounded border border-border/40 bg-panel/20 space-y-2",
        },
          h("div", { className: "flex items-center justify-between text-xs font-mono" },
            h("span", { className: "text-dim font-medium" }, item.provider),
            h("span", {
              "data-causal-attribution": item.causal_attribution,
              className: "tag text-[10px] text-muted",
            }, `Causalité : ${item.causal_attribution}`),
          ),
          h("p", { className: "text-xs font-body text-dim line-through opacity-80" }, item.content),
          h("p", { className: "text-[11px] font-body text-muted italic" }, item.causal_note),
        ))
      ) : (
        displayedItems.map((item) => h("div", {
          key: item.id,
          "data-comparison-claim": item.id,
          "data-category": item.category,
          className: `p-3 rounded border space-y-2 ${item.displayed_authority.id === "human_contested"
            ? "border-amber-400/40 bg-amber-950/20"
            : item.category === "convergence"
              ? "border-signal/30 bg-panel/30"
              : "border-border/40 bg-panel/10"}`,
        },
          h("div", { className: "flex flex-wrap items-center justify-between gap-1 text-xs font-mono" },
            h("div", { className: "flex items-center gap-1.5" },
              h("span", {
                "data-authority-level": item.displayed_authority.id,
                className: `tag text-[10px] ${item.displayed_authority.isHumanAuthority
                  ? "text-signal border-signal/40 bg-signal/10 font-medium"
                  : "text-dim border-border/40"}`,
              }, item.displayed_authority.label),
              item.providers && item.providers.length > 1 ? h("span", {
                "data-providers-tag": "true",
                className: "tag text-[10px] text-bright border-signal/20",
              }, `${item.providers.length} agents`) : null,
            ),
            h("span", { className: "text-[11px] text-muted font-sans" },
              item.providers ? item.providers.join(", ") : item.provider),
          ),
          h("p", { className: "text-xs font-body text-bright leading-relaxed" }, item.content),
          item.human_review ? h("div", {
            "data-human-review-note": "true",
            className: "text-[11px] font-body text-signal bg-signal/5 p-2 rounded border border-signal/20 space-y-0.5",
          },
            h("p", { className: "font-semibold" }, `Arbitrage humain : ${item.human_review.verdict || item.human_review.stance}`),
            item.human_review.note ? h("p", null, item.human_review.note) : null,
          ) : null,
          // Provenance details
          item.sources && item.sources.length > 0 ? h("details", {
            className: "pt-1 text-[11px] font-mono text-muted",
          },
            h("summary", { className: "cursor-pointer hover:text-dim" },
              `Provenance détaillée (${item.sources.length} source(s))`),
            h("ul", { className: "mt-1.5 space-y-1 pl-2 border-l border-border/40" },
              item.sources.map((src, idx) => h("li", {
                key: idx,
                "data-source-provenance": `${src.snapshot_id || src.turn_number}:${src.item_id}`,
              },
                `${src.provider} (${src.snapshot_id || "tour"}) · item: ${src.item_id} · origine: ${src.claimed_origin || "inconnue"}`)),
            ),
          ) : null,
        ))
      ),
    ),
  );
}
