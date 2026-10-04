import React, { useState } from "react";
import {
  RELATIONSHIP_STATES,
  inspectContinuityState,
} from "../../../../scripts/lib/progressive-enrolment.js";

function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}

export function ContinuityPanel({
  turnLog = null,
  preferences = {},
  onUpdatePreferences = null,
  onPurge = null,
  onExport = null,
}) {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const state = inspectContinuityState(turnLog, preferences);

  const stateInfo = RELATIONSHIP_STATES[state.relationshipState] || RELATIONSHIP_STATES.anonymous_ephemeral;

  if (!state.hasRetainedData && !state.lastIntention) {
    return h("section", {
      "data-continuity-panel": "true",
      "data-continuity-empty": "true",
      className: "card border-border/40 bg-panel/10 p-4 space-y-2",
    },
      h("div", { className: "flex items-center justify-between gap-2" },
        h("p", { className: "font-mono text-xs text-muted" }, "Session locale : aucune donnée personnelle conservée"),
        h("span", { className: "tag text-[10px] text-dim" }, stateInfo.label),
      ),
      h("p", { className: "font-body text-xs text-dim", "data-doctrine-note": "true" },
        state.doctrineNote),
    );
  }

  return h("section", {
    "data-continuity-panel": "true",
    "data-relationship-state": state.relationshipState,
    className: "card border-border/60 bg-panel/30 p-5 space-y-4",
  },
    h("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-border/40 pb-3" },
      h("div", { className: "space-y-1" },
        h("div", { className: "flex items-center gap-2" },
          h("h3", { className: "font-display text-base font-semibold text-bright" }, "Continuité et mémoire locale"),
          h("span", {
            "data-relationship-badge": state.relationshipState,
            className: "tag text-xs text-signal border-signal/30",
          }, stateInfo.label),
        ),
        h("p", { className: "font-body text-xs text-dim leading-relaxed" },
          stateInfo.description),
      ),
      onExport ? h("button", {
        type: "button",
        onClick: onExport,
        "data-action": "export-data",
        className: "btn-ghost text-xs shrink-0 self-start sm:self-auto",
      }, "Exporter mes données (JSON)") : null,
    ),

    h("div", {
      "data-remembered-context": "true",
      className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono",
    },
      h("div", { className: "p-2 rounded bg-surface/40 border border-border/40" },
        h("span", { className: "text-muted block text-[10px] uppercase" }, "Agent"),
        h("span", { className: "text-bright font-medium", "data-metric": "provider" }, state.provider || "Non spécifié"),
      ),
      h("div", { className: "p-2 rounded bg-surface/40 border border-border/40" },
        h("span", { className: "text-muted block text-[10px] uppercase" }, "Tours & Instantanés"),
        h("span", { className: "text-bright font-medium", "data-metric": "snapshots" },
          `${state.snapshotsCount} sur ${state.turnsCount} tour${state.turnsCount > 1 ? "s" : ""}`),
      ),
      h("div", { className: "p-2 rounded bg-surface/40 border border-border/40" },
        h("span", { className: "text-muted block text-[10px] uppercase" }, "Examens humains"),
        h("span", { className: "text-bright font-medium", "data-metric": "reviews" },
          `${state.reviewedClaimsCount} affirmation${state.reviewedClaimsCount > 1 ? "s" : ""}`),
      ),
      h("div", { className: "p-2 rounded bg-surface/40 border border-border/40" },
        h("span", { className: "text-muted block text-[10px] uppercase" }, "Intention déclarée"),
        h("span", { className: "text-bright font-medium", "data-metric": "intention" },
          state.lastIntention ? state.lastIntention : "Aucune"),
      ),
    ),

    h("div", {
      "data-active-purposes": "true",
      className: "space-y-1.5 pt-1",
    },
      h("p", { className: "font-mono text-[11px] text-muted uppercase tracking-wider" }, "Finalités de cette conservation locale :"),
      h("ul", { className: "space-y-1" },
        state.activePurposes.map((p) => h("li", {
          key: p.id,
          "data-purpose-id": p.id,
          className: "text-xs font-body text-dim flex items-center gap-2",
        },
          h("span", { className: "text-signal font-mono" }, "✓"),
          h("span", { className: "text-bright font-medium" }, `${p.label} :`),
          h("span", null, p.description),
        )),
      ),
    ),

    h("p", {
      "data-doctrine-note": "true",
      className: "font-body text-xs text-dim border-l-2 border-signal/50 pl-3 py-1 bg-surface/20",
    }, state.doctrineNote),

    h("div", {
      "data-continuity-controls": "true",
      className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40",
    },
      h("div", { className: "flex flex-wrap gap-2 text-xs" },
        onUpdatePreferences && state.lastIntention ? h("button", {
          type: "button",
          onClick: () => onUpdatePreferences({ statedIntention: null }),
          "data-action": "revoke-intention",
          className: "btn-ghost text-xs text-muted hover:text-bright",
        }, "Effacer l'intention déclarée") : null,

        onUpdatePreferences ? h("button", {
          type: "button",
          onClick: () => onUpdatePreferences({ disableLocalPersistence: !state.localPersistenceDisabled }),
          "data-action": "toggle-persistence",
          className: "btn-ghost text-xs",
        }, state.localPersistenceDisabled ? "Réactiver la mémoire locale" : "Désactiver la mémoire locale") : null,
      ),

      onPurge ? h("div", { className: "flex items-center gap-2" },
        confirmPurge
          ? h(React.Fragment, null,
            h("span", { className: "text-xs text-amber-400 font-body" }, "Confirmer l'effacement complet ?"),
            h("button", {
              type: "button",
              onClick: () => {
                onPurge();
                setConfirmPurge(false);
              },
              "data-action": "confirm-purge",
              className: "px-2.5 py-1 rounded text-xs bg-red-950/60 border border-red-500 text-red-200 hover:bg-red-900",
            }, "Oui, tout effacer"),
            h("button", {
              type: "button",
              onClick: () => setConfirmPurge(false),
              className: "btn-ghost text-xs",
            }, "Annuler"),
          )
          : h("button", {
            type: "button",
            onClick: () => setConfirmPurge(true),
            "data-action": "purge-local-data",
            className: "text-xs font-body text-red-400/80 hover:text-red-300 underline",
          }, "Purger toutes les données locales"),
      ) : null,
    ),
  );
}
