/**
 * Sovereign Contact Management Subsystem for Agent JHN.
 *
 * Handles:
 * - Local contact persistence (contacts.json)
 * - Phone number / JID normalization & identity matching
 * - Trust tiers (principal, vip, colleague, family, standard, unknown)
 * - Emergency contact role mapping
 * - Google Contacts (People API / vCard) synchronization stubs
 */

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_EMERGENCY_EMAIL, DEFAULT_EMERGENCY_PHONE } from "./constants.js";
import { phoneDigitsFromJid } from "./inbound-normalizer.js";

export const TRUST_TIERS = Object.freeze({
  PRINCIPAL: "principal",
  VIP: "vip",
  COLLEAGUE: "colleague",
  FAMILY: "family",
  STANDARD: "standard",
  UNKNOWN: "unknown",
});

function getContactsPath(config) {
  const base = config.state_dir || path.join(process.cwd(), ".cogentia", "runtime", "agent-jhn-whatsapp");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return path.join(base, "contacts.json");
}

export function loadContactsStore(config) {
  const p = getContactsPath(config);
  if (!fs.existsSync(p)) {
    // Seed default Principal contact
    const defaultStore = {
      version: 1,
      last_synced_at: new Date().toISOString(),
      contacts: [
        {
          contact_id: "contact_jhn_principal",
          name: "Jean-Hugues Robert",
          phones: [DEFAULT_EMERGENCY_PHONE],
          emails: [DEFAULT_EMERGENCY_EMAIL],
          whatsapp_jid: `${DEFAULT_EMERGENCY_PHONE.replace(/\+/g, "")}@s.whatsapp.net`,
          trust_tier: TRUST_TIERS.PRINCIPAL,
          relationship: "owner",
          is_emergency_contact: true,
          notes: "Principal owner of Agent JHN instance",
        },
      ],
    };
    try {
      fs.writeFileSync(p, JSON.stringify(defaultStore, null, 2), "utf8");
    } catch {
      /* ignore */
    }
    return defaultStore;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { version: 1, last_synced_at: new Date().toISOString(), contacts: [] };
  }
}

export function saveContactsStore(config, store) {
  store.last_synced_at = new Date().toISOString();
  const p = getContactsPath(config);
  fs.writeFileSync(p, JSON.stringify(store, null, 2), "utf8");
  return store;
}

export function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("33")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+33${digits.slice(1)}`;
  return `+${digits}`;
}

export function findContactByPhoneOrJid(config, phoneOrJid) {
  const store = loadContactsStore(config);
  const targetDigits = String(phoneOrJid || "").includes("@")
    ? phoneDigitsFromJid(phoneOrJid)
    : String(phoneOrJid || "").replace(/\D/g, "");

  if (!targetDigits) return null;

  for (const c of store.contacts) {
    for (const p of c.phones || []) {
      const pDigits = String(p || "").replace(/\D/g, "");
      if (pDigits === targetDigits || (pDigits && targetDigits.endsWith(pDigits))) {
        return c;
      }
    }
    if (c.whatsapp_jid && phoneDigitsFromJid(c.whatsapp_jid) === targetDigits) {
      return c;
    }
  }
  return null;
}

export function upsertContact(config, contactInput) {
  const store = loadContactsStore(config);
  const normPhone = normalizePhone(contactInput.phone || contactInput.phones?.[0] || "");
  const existing = findContactByPhoneOrJid(config, normPhone || contactInput.name);

  if (existing) {
    existing.name = contactInput.name || existing.name;
    if (normPhone && !existing.phones.includes(normPhone)) existing.phones.push(normPhone);
    existing.trust_tier = contactInput.trust_tier || existing.trust_tier;
    existing.relationship = contactInput.relationship || existing.relationship;
    existing.notes = contactInput.notes || existing.notes;
  } else {
    store.contacts.push({
      contact_id: `contact_${Date.now()}`,
      name: contactInput.name || "Unknown Contact",
      phones: normPhone ? [normPhone] : [],
      emails: contactInput.email ? [contactInput.email] : [],
      whatsapp_jid: normPhone ? `${normPhone.replace(/\+/g, "")}@s.whatsapp.net` : "",
      trust_tier: contactInput.trust_tier || TRUST_TIERS.STANDARD,
      relationship: contactInput.relationship || "contact",
      is_emergency_contact: Boolean(contactInput.is_emergency_contact),
      notes: contactInput.notes || "",
    });
  }

  saveContactsStore(config, store);
  return findContactByPhoneOrJid(config, normPhone || contactInput.name);
}

/**
 * Import contacts from a Google Contacts vCard (.vcf) or JSON export.
 */
export function importGoogleContactsJson(config, contactsArray) {
  let importedCount = 0;
  if (!Array.isArray(contactsArray)) return { ok: false, imported: 0 };
  for (const item of contactsArray) {
    if (item.name || item.phone) {
      upsertContact(config, {
        name: item.name,
        phone: item.phone,
        email: item.email,
        trust_tier: item.trust_tier || TRUST_TIERS.STANDARD,
        notes: item.notes || "Imported from Google Contacts",
      });
      importedCount++;
    }
  }
  return { ok: true, imported: importedCount };
}

/**
 * Sync Google People API MCP tool result into local sovereign contacts store.
 */
export function syncGoogleContactsMcpResult(config, mcpData) {
  const connections = Array.isArray(mcpData) ? mcpData : (mcpData?.connections || mcpData?.people || []);
  let synced = 0;
  for (const person of connections) {
    const name = person.names?.[0]?.displayName || person.displayName || person.name || "";
    const phone = person.phoneNumbers?.[0]?.value || person.phoneNumber || person.phone || "";
    const email = person.emailAddresses?.[0]?.value || person.emailAddress || person.email || "";
    if (name || phone) {
      upsertContact(config, {
        name,
        phone,
        email,
        trust_tier: TRUST_TIERS.STANDARD,
        notes: "Synced via Google Workspace MCP Server",
      });
      synced++;
    }
  }
  return { ok: true, synced };
}
