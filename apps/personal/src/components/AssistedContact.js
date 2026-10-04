import React, { useMemo, useState } from "react";
import {
  CONTACT_INTENTIONS,
  DEFAULT_CONTACT_RECIPIENT,
  buildContactEmailDraft,
} from "../../../../scripts/lib/assisted-contact-intent.js";

function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}

export function AssistedContactCard({ context = {}, onDismiss = null }) {
  const [selectedIntention, setSelectedIntention] = useState("feedback");
  const [customNotes, setCustomNotes] = useState("");
  const [editedBody, setEditedBody] = useState(null);
  const [copied, setCopied] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const draft = useMemo(() => {
    return buildContactEmailDraft({
      intentionId: selectedIntention,
      customNotes,
      context,
      recipient: DEFAULT_CONTACT_RECIPIENT,
    });
  }, [selectedIntention, customNotes, context]);

  const activeBody = editedBody !== null ? editedBody : draft.body;

  const handleCopy = (text, kind) => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(kind);
    if (typeof window !== "undefined" && window.setTimeout) {
      window.setTimeout(() => setCopied(""), 2000);
    }
  };

  if (dismissed || selectedIntention === "no_contact") {
    return h("section", {
      "data-assisted-contact": "true",
      "data-contact-state": "no_contact",
      className: "card border-border/60 bg-panel/20 p-4 space-y-3",
    },
      h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" },
        h("p", { className: "font-body text-xs text-dim" },
          "Vos observations restent strictement locales dans ce navigateur. Aucun message n'est envoyé."),
        h("button", {
          type: "button",
          onClick: () => {
            setDismissed(false);
            setSelectedIntention("feedback");
          },
          className: "btn-ghost text-xs self-start sm:self-auto",
          "data-action": "reopen",
        }, "Écrire un message"),
      ),
    );
  }

  const mailtoUrl = `mailto:${draft.recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(activeBody)}`;

  return h("section", {
    "data-assisted-contact": "true",
    "data-contact-state": "active",
    className: "card border-signal/40 bg-panel/30 p-5 space-y-5",
  },
    h("div", { className: "space-y-1" },
      h("div", { className: "flex items-center justify-between gap-2" },
        h("p", { className: "font-mono text-signal text-xs tracking-widest uppercase" }, "Échange direct (facultatif)"),
        h("button", {
          type: "button",
          onClick: () => {
            setDismissed(true);
            if (onDismiss) onDismiss();
          },
          className: "text-muted hover:text-bright text-xs font-mono",
          "data-action": "dismiss",
        }, "Ignorer / Fermer ✕"),
      ),
      h("h3", { className: "font-display text-lg font-semibold text-bright" },
        "Envie d'échanger avec l'équipe Cogentia ?"),
      h("p", { className: "font-body text-xs text-dim leading-relaxed" },
        "Sans compte ni intermédiaire : préparez votre message selon votre intention réelle et envoyez-le directement depuis votre propre messagerie."),
    ),

    h("div", { className: "space-y-2" },
      h("label", { className: "label" }, "Votre intention :"),
      h("div", {
        className: "flex flex-wrap gap-2",
        "data-intention-buttons": "true",
      },
        CONTACT_INTENTIONS.map((intention) => {
          const active = selectedIntention === intention.id;
          return h("button", {
            key: intention.id,
            type: "button",
            "data-intention": intention.id,
            onClick: () => {
              setSelectedIntention(intention.id);
              setEditedBody(null);
            },
            className: `px-3 py-1.5 rounded text-xs transition-colors border ${
              active
                ? "border-signal bg-signal/15 text-bright font-medium"
                : "border-border/70 text-dim hover:border-dim hover:text-bright"
            }`,
          }, intention.label);
        }),
      ),
    ),

    h("div", { className: "space-y-3 pt-2 border-t border-border/40" },
      h("div", null,
        h("span", { className: "label block mb-1" }, `Destinataire : `),
        h("span", { className: "font-mono text-xs text-bright" }, draft.recipient),
      ),
      h("div", null,
        h("label", { className: "label block mb-1" }, "Objet du courriel :"),
        h("input", {
          type: "text",
          readOnly: true,
          value: draft.subject,
          "data-contact-subject": "true",
          className: "input text-xs w-full font-mono",
        }),
      ),
      h("div", null,
        h("label", { className: "label block mb-1" }, "Corps du message (modifiable) :"),
        h("textarea", {
          rows: 10,
          value: activeBody,
          onChange: (event) => setEditedBody(event.target.value),
          "data-contact-body": "true",
          className: "input text-xs w-full font-mono resize-y leading-relaxed",
        }),
      ),
    ),

    h("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40" },
      h("div", { className: "flex flex-wrap items-center gap-2" },
        h("a", {
          href: mailtoUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "btn-primary text-xs",
          "data-action": "open-mail-client",
        }, "Ouvrir dans ma messagerie"),
        h("button", {
          type: "button",
          onClick: () => handleCopy(activeBody, "body"),
          className: "btn-ghost text-xs",
          "data-action": "copy-body",
        }, copied === "body" ? "Message copié ✓" : "Copier le texte"),
        h("button", {
          type: "button",
          onClick: () => handleCopy(draft.recipient, "recipient"),
          className: "btn-ghost text-xs font-mono",
          "data-action": "copy-recipient",
        }, copied === "recipient" ? "Adresse copiée ✓" : "Copier l'adresse"),
      ),
      h("button", {
        type: "button",
        onClick: () => setSelectedIntention("no_contact"),
        className: "text-muted hover:text-bright text-xs underline font-body",
        "data-action": "decline-contact",
      }, "Pas de contact"),
    ),
  );
}
