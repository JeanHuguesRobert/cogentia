import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const policyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "retrieval-admissibility-classes.yml");

export function parseRetrievalAdmissibilityPolicy(text) {
  const data = yaml.load(text);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("admissibility policy must be a mapping");
  }
  const excludedPrefixes = (data.excluded_path_prefixes || []).map(String);
  const excludedSubstrings = (data.excluded_path_substrings || []).map(String);
  const derivedClasses = Array.isArray(data.derived_classes) ? data.derived_classes : [];
  for (const item of derivedClasses) {
    if (!item || typeof item !== "object" || !String(item.path_contains || "")) {
      throw new Error(`derived class ${item?.id || "unknown"} needs path_contains`);
    }
  }
  return { excludedPrefixes, excludedSubstrings, derivedClasses };
}

export function loadRetrievalAdmissibilityPolicy(filePath = policyPath) {
  return parseRetrievalAdmissibilityPolicy(fs.readFileSync(filePath, "utf8"));
}

const policy = loadRetrievalAdmissibilityPolicy();

function pathExcluded(filePath, active) {
  return active.excludedPrefixes.some(prefix => filePath.startsWith(prefix))
    || active.excludedSubstrings.some(part => filePath.includes(part));
}

function matchingDerivedClass(row, active) {
  const role = String(row?.role || "");
  const filePath = String(row?.path || "");
  return active.derivedClasses.find(item => (
    String(item.role || "derived") === role && filePath.includes(String(item.path_contains))
  )) || null;
}

export function retrievalChunkAdmissible(row, active = policy) {
  const role = String(row?.role || "");
  const filePath = String(row?.path || "");
  if (pathExcluded(filePath, active)) return false;
  if (role === "source") return true;
  return Boolean(matchingDerivedClass(row, active));
}

export function retrievalDocumentKind(row, active = policy) {
  const role = String(row?.role || "");
  if (role === "source") return "source";
  const match = matchingDerivedClass(row, active);
  if (role === "derived" && match && retrievalChunkAdmissible(row, active)) {
    return String(match.document_kind || "derived");
  }
  return "";
}
