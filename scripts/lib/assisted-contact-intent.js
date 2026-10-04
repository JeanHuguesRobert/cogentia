export const DEFAULT_CONTACT_RECIPIENT = "contact@cogentia.io";

export const CONTACT_INTENTIONS = [
  {
    id: "feedback",
    label: "Partager un retour d'expérience",
    summary: "Simple retour d'impression ou observation sur le miroir, sans suite attendue particulière.",
    category: "feedback",
    subject: "Retour d'expérience sur le miroir KYS",
    intro: "Bonjour,\n\nJe viens de tester le miroir KYS et je souhaitais vous faire part de mes impressions :",
  },
  {
    id: "question",
    label: "Poser une question",
    summary: "Comprendre la démarche, le fonctionnement du miroir ou le projet Cogentia.",
    category: "question",
    subject: "Question à propos de Cogentia et du miroir KYS",
    intro: "Bonjour,\n\nAprès avoir exploré le miroir KYS, j'aurais une question à vous poser :",
  },
  {
    id: "testing",
    label: "Participer aux tests",
    summary: "Expérimenter le protocole sur d'autres agents ou contribuer aux jeux d'essais.",
    category: "contribute",
    subject: "Proposition de participation aux tests KYS",
    intro: "Bonjour,\n\nJe serais intéressé(e) pour tester le miroir KYS sur d'autres contextes ou agents conversationnels :",
  },
  {
    id: "follow",
    label: "Suivre le projet",
    summary: "Être tenu informé(e) des avancées sans engagement spécifique.",
    category: "follow",
    subject: "Suivi des avancées du projet Cogentia",
    intro: "Bonjour,\n\nJ'ai découvert le miroir KYS et j'aimerais suivre l'évolution de vos travaux :",
  },
  {
    id: "twin",
    label: "Explorer la perspective d'un Jumeau",
    summary: "Discuter d'un modèle personnel souverain et de l'architecture de Jumeau Numérique.",
    category: "explore",
    subject: "Échange sur la perspective d'un Jumeau Numérique personnel",
    intro: "Bonjour,\n\nLa perspective d'un Jumeau Numérique personnel souverain m'intéresse particulièrement :",
  },
  {
    id: "data_governance",
    label: "Comprendre l'usage des données",
    summary: "Éclaircissements sur la souveraineté, la rétention locale et la confidentialité.",
    category: "governance",
    subject: "Question sur la gouvernance des données et la confidentialité KYS",
    intro: "Bonjour,\n\nJe souhaiterais mieux comprendre le cadre de gouvernance et de confidentialité de votre protocole :",
  },
  {
    id: "unsure_or_other",
    label: "Autre / Message libre",
    summary: "Rédiger un mot sans entrer dans une catégorie pré-définie.",
    category: "open",
    subject: "Message à propos de Cogentia",
    intro: "Bonjour,\n\nJe vous écris à propos du miroir KYS :",
  },
  {
    id: "no_contact",
    label: "Ne pas contacter pour le moment",
    summary: "Conserver ses observations pour soi sans établir de contact.",
    category: "none",
    subject: "",
    intro: "",
  },
];

export function findIntention(id) {
  return CONTACT_INTENTIONS.find((entry) => entry.id === id) || null;
}

export function buildContactEmailDraft({
  intentionId = "feedback",
  customNotes = "",
  context = {},
  recipient = DEFAULT_CONTACT_RECIPIENT,
} = {}) {
  const intention = findIntention(intentionId) || findIntention("unsure_or_other");

  if (intention.id === "no_contact") {
    return {
      noContact: true,
      intentionId: "no_contact",
      recipient,
      subject: "",
      body: "",
      mailtoUrl: "",
      summary: intention.summary,
    };
  }

  const subject = intention.subject || "Message à propos du miroir KYS";

  // Build context details (strictly high-level operational metrics, NO raw private claims)
  const metaLines = [];
  if (context.provider) {
    metaLines.push(`- Agent examiné : ${context.provider}`);
  }
  if (context.turnNumber && context.turnNumber > 1) {
    metaLines.push(`- Parcours en ${context.turnNumber} tours`);
  }
  if (typeof context.reviewedCount === "number" && context.reviewedCount > 0) {
    metaLines.push(`- Affirmations examinées par mes soins : ${context.reviewedCount}`);
  }
  if (context.hasAlignmentPrompt) {
    metaLines.push("- Consigne d'alignement produite lors de l'échange");
  }

  const sections = [];
  sections.push(intention.intro);

  if (customNotes && String(customNotes).trim()) {
    sections.push(String(customNotes).trim());
  } else {
    sections.push("[Vos commentaires ou précisions ici...]");
  }

  if (metaLines.length > 0) {
    sections.push(
      "---",
      "Éléments de contexte (observables lors de ma session locale) :",
      metaLines.join("\n"),
    );
  }

  sections.push(
    "",
    "---\nMessage préparé volontairement depuis le navigateur via l'outil KYS.",
  );

  const body = sections.join("\n\n");
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

  return {
    noContact: false,
    intentionId: intention.id,
    intentionLabel: intention.label,
    intentionCategory: intention.category,
    recipient,
    subject,
    body,
    mailtoUrl,
  };
}
