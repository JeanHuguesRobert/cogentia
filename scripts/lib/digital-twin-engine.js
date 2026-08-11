// File: scripts/lib/digital-twin-engine.js
// Description: Generic Cogentia Digital Twin Engine & Instance Binding Loader (JS ESM).
// Decouples generic twin execution from instance-specific configs (Agent JHN vs Pertitellu).

import fs from "node:fs";
import path from "node:path";

/**
 * Universal External Surface Contract for all Digital Twin Chatbots (The Guide).
 * Ophélia (Pertitellu) is the legacy ancestor of "The Guide" in the Cogentia architecture.
 */
export const EXTERNAL_SURFACE_CONTRACT = {
  mode: "readonly_exploratory_guide",
  readonly: true,
  guarantees: false,
  legal_engagement: false,
  disclaimer: "Readonly, zero-guarantees, zero-engagement exploratory cognitive guide.",
  contract_rule: "The external surface of any Digital Twin is governed by an explicit versioned Mandate and Persona. Currently mostly readonly; capability expansion requires a formal mandate revision."
};

/**
 * Default Instance Manifest Templates with Mandate & Persona Governance
 */
export const DEFAULT_INSTANCE_MANIFESTS = {
  "jhn-personal": {
    instance_id: "jhn-personal",
    class: "individual-sovereign",
    bot_name: "Agent JHN",
    guide_name: "The Cogentia Guide (JHN)",
    principal_repo: "JeanHuguesRobert/JeanHuguesRobert",
    identity_kernel_path: "identity/INTENT_KERNEL.md",
    identity_kernel_url: "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/identity/INTENT_KERNEL.md",
    disclosure_tag: "— agent-jhn-experimental (readonly, zero guarantees)",
    contact_email: "jeanhuguesrobert@gmail.com",
    default_locale: "fr",
    policy_mode: "self_chat_only",
    external_surface_contract: EXTERNAL_SURFACE_CONTRACT,
    active_mandate: {
      mandate_id: "MND-JHN-GUIDE-v1",
      mandate_kind: "read_only_corpus_exploration",
      lifecycle_state: "active",
      permitted_actions: ["corpus_search", "concept_resolve", "sprint_digest_read"],
      evolution_policy: "Read-only by default. Future capability expansion (write/actions) requires an explicit signed Mandate update from principal."
    },
    persona: {
      persona_id: "persona-agent-jhn",
      persona_name: "Agent JHN",
      role: "Personal Cognitive Twin & Corpus Guide",
      contact_email: "jeanhuguesrobert@gmail.com",
      voice_guidelines: "Concise, evidence-based, humble, epistemic, DHITL-aligned. Reliable direct contact for Jean-Hugues Robert is jeanhuguesrobert@gmail.com. Do not repeat disclosure disclaimers or contact email unnecessarily when already present in recent thread history."
    },
    corpus_scope: [
      "cogentia",
      "barons-Mariani",
      "FractaVolta",
      "operium",
      "marenostrum",
      "inseme",
      "Inox",
      "Ubikia"
    ],
  },
  "pertitellu-corte": {
    instance_id: "pertitellu-corte",
    class: "collective-civic",
    bot_name: "Ophélia",
    guide_name: "The Pertitellu Civic Guide (Ophélia)",
    principal_repo: "JeanHuguesRobert/pertitellu",
    identity_kernel_path: "apps/platform/docs/blueprint_ophelia.md",
    identity_kernel_url: "https://github.com/JeanHuguesRobert/pertitellu/blob/main/docs/blueprint_ophelia.md",
    disclosure_tag: "— ophélia (assistant civique pertitellu — readonly, zéro engagement)",
    default_locale: "fr",
    policy_mode: "civic_public_chat",
    external_surface_contract: EXTERNAL_SURFACE_CONTRACT,
    active_mandate: {
      mandate_id: "MND-PERTITELLU-OPHELIA-v1",
      mandate_kind: "civic_public_information_guide",
      lifecycle_state: "active",
      permitted_actions: ["municipal_program_search", "civic_proposal_browse", "local_issues_qna"],
      evolution_policy: "Read-only civic guide by default. Future interactive/voting actions require democratic collective mandate approval."
    },
    persona: {
      persona_id: "persona-ophelia",
      persona_name: "Ophélia",
      role: "Collective Civic Assistant (Pertitellu)",
      voice_guidelines: "Welcoming, transparent, civic-focused, non-partisan, neutral."
    },
    corpus_scope: [
      "pertitellu",
      "inseme",
      "municipal-program",
      "civic-proposals"
    ],
  }
};

/**
 * Load and resolve a Digital Twin Instance Manifest.
 * Tries Supabase instance_config if credentials are present, otherwise falls back to local manifest templates.
 */
export async function loadDigitalTwinInstance(options = {}) {
  const instanceId = options.instanceId || process.env.COGENTIA_INSTANCE_ID || "jhn-personal";
  const baseManifest = DEFAULT_INSTANCE_MANIFESTS[instanceId] || DEFAULT_INSTANCE_MANIFESTS["jhn-personal"];

  const manifest = {
    ...baseManifest,
    loaded_at: new Date().toISOString(),
    sovereignty_provenance: {
      principal_repo: baseManifest.principal_repo,
      sovereignty_rule: "Source of Truth lives in principal GitHub repo; instance_config table is fast operational mirror."
    }
  };

  // If Supabase credentials provided, attempt fast operational mirror lookup
  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/instance_config?select=key,value,category,is_public`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        const kv = {};
        for (const r of rows) {
          kv[r.key] = r.value;
        }
        manifest.supabase_vault = {
          connected: true,
          row_count: rows.length,
          overrides: kv
        };
        if (kv.bot_name) manifest.bot_name = kv.bot_name;
        if (kv.principal_repo) manifest.principal_repo = kv.principal_repo;
        if (kv.disclosure_tag) manifest.disclosure_tag = kv.disclosure_tag;
        if (kv.policy_mode) manifest.policy_mode = kv.policy_mode;
      }
    } catch (err) {
      manifest.supabase_vault = {
        connected: false,
        error: err.message
      };
    }
  } else {
    manifest.supabase_vault = {
      connected: false,
      reason: "No Supabase credentials present; running on pure local/repo SoT manifest."
    };
  }

  return manifest;
}

/**
 * Format outbound disclosure for an instance response.
 */
export function formatInstanceOutboundDisclosure(instance, text = "", options = {}) {
  const disclosureTag = options.disclosureTag || instance.disclosure_tag || "— digital-twin";
  if (!text) return "";
  if (text.includes(disclosureTag)) return text;
  return `${text.trim()}\n\n${disclosureTag}`;
}

/**
 * Evaluate channel grant policy for an instance.
 */
export function evaluateInstancePolicy(instance, request = {}) {
  const mode = request.mode || instance.policy_mode || "self_chat_only";
  const channel = request.channel || "whatsapp";
  const isSelf = Boolean(request.isSelf);

  if (mode === "self_chat_only" && !isSelf) {
    return {
      allowed: false,
      reason: `Instance ${instance.instance_id} is in self_chat_only mode; third-party interaction rejected.`,
      code: "POLICY_SELF_CHAT_REJECTED"
    };
  }

  return {
    allowed: true,
    instance_id: instance.instance_id,
    bot_name: instance.bot_name,
    channel,
    mode
  };
}
