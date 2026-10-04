export const DEFAULT_CONTACT_RECIPIENT = "jhr@baronsmariani.org";

export const CONTACT_INTENTIONS = [
  {
    id: "feedback",
    label: "Partager un retour d'expérience",
    summary: "Simple retour d'impression ou observation sur le miroir, sans suite attendue particulière.",
    category: "feedback",
    routeTag: "feedback",
    subject: "Retour d'expérience sur le miroir agentique",
    intro: "Bonjour,\n\nJe viens de tester le miroir KYS et je souhaitais vous faire part de mes impressions :",
  },
  {
    id: "question",
    label: "Poser une question",
    summary: "Comprendre la démarche, le fonctionnement du miroir ou le projet Cogentia.",
    category: "question",
    routeTag: "question",
    subject: "Question sur le miroir agentique",
    intro: "Bonjour,\n\nAprès avoir exploré le miroir KYS, j'aurais une question à vous poser :",
  },
  {
    id: "testing",
    label: "Participer aux tests",
    summary: "Expérimenter le protocole sur d'autres agents ou contribuer aux jeux d'essais.",
    category: "contribute",
    routeTag: "testing",
    subject: "Participation aux tests",
    intro: "Bonjour,\n\nJe serais intéressé(e) pour tester le miroir KYS sur d'autres contextes ou agents conversationnels :",
  },
  {
    id: "follow",
    label: "Suivre le projet",
    summary: "Être tenu informé(e) des avancées sans engagement spécifique.",
    category: "follow",
    routeTag: "follow",
    subject: "Suivi du projet",
    intro: "Bonjour,\n\nJ'ai découvert le miroir KYS et j'aimerais suivre l'évolution de vos travaux :",
  },
  {
    id: "twin",
    label: "Explorer la perspective d'un Jumeau",
    summary: "Discuter d'un modèle personnel souverain et de l'architecture de Jumeau Numérique.",
    category: "explore",
    routeTag: "twin",
    subject: "Exploration d'un Jumeau Numérique",
    intro: "Bonjour,\n\nLa perspective d'un Jumeau Numérique personnel souverain m'intéresse particulièrement :",
  },
  {
    id: "data_governance",
    label: "Comprendre l'usage des données",
    summary: "Éclaircissements sur la souveraineté, la rétention locale et la confidentialité.",
    category: "governance",
    routeTag: "data-governance",
    subject: "Question sur l'usage des données",
    intro: "Bonjour,\n\nJe souhaiterais mieux comprendre le cadre de gouvernance et de confidentialité de votre protocole :",
  },
  {
    id: "unsure_or_other",
    label: "Autre / Message libre",
    summary: "Rédiger un mot sans entrer dans une catégorie pré-définie.",
    category: "open",
    routeTag: "other",
    subject: "Message libre",
    intro: "Bonjour,\n\nJe vous écris à propos du miroir KYS :",
  },
  {
    id: "no_contact",
    label: "Ne pas contacter pour le moment",
    summary: "Conserver ses observations pour soi sans établir de contact.",
    category: "none",
    routeTag: "none",
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

  const routeTag = intention.routeTag || intention.id || "other";
  const subjectLabel = intention.subject || "Message libre";
  const subject = `[KYS][Cogentia][${routeTag}] ${subjectLabel}`;

  // Build context details (strictly high-level operational metrics, NO raw private claims)
  const metaLines = [
    "Origine : KYS — miroir agentique Cogentia",
    `Intention déclarée : ${intention.label}`,
    `Code de routage : ${routeTag}`,
  ];
  if (context.provider) {
    metaLines.push(`Agent examiné : ${context.provider}`);
  }
  if (context.turnNumber) {
    metaLines.push(`Parcours : ${context.turnNumber} tour${context.turnNumber > 1 ? "s" : ""}`);
  }
  if (typeof context.reviewedCount === "number") {
    metaLines.push(`Assertions examinées : ${context.reviewedCount}`);
  }
  metaLines.push(`Alignement effectué : ${context.hasAlignmentPrompt ? "oui" : "non"}`);

  const sections = [
    "Contexte du message",
    "-------------------",
    metaLines.join("\n"),
    "",
    "Message",
    "-------",
    intention.intro,
  ];

  if (customNotes && String(customNotes).trim()) {
    sections.push(String(customNotes).trim());
  } else {
    sections.push("[Vos commentaires ou précisions ici...]");
  }

  sections.push(
    "",
    "---",
    "Ce message a été préparé volontairement depuis KYS / Cogentia.",
    "Aucune donnée personnelle issue du miroir n’est jointe automatiquement.",
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
