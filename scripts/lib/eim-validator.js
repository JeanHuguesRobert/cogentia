/**
 * Effectivity Interaction Matrix (EIM) Validator
 * Validates EIM matrices and rows against JSON Schema and semantic invariants.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';

export const VALID_RESPONSE_STATES = [
  'YES', 'NO', 'PARTIAL', 'REFUSED', 'ROUTED', 'PENDING',
  'OPEN', 'SUSPENDED', 'SILENCE', 'NOT_FOUND', 'NOT_RECORDED', 'CHECKING',
  'NON_COMMUNICABLE', 'UNKNOWN'
];

export const VALID_EVIDENCE_STATES = [
  'ESTABLISHED', 'CONTESTED', 'UNKNOWN', 'PENDING',
  'NOT_TREATED', 'REFUTED', 'SUPERSEDED'
];

export const VALID_PRIORITY_MODES = [
  'none', 'procedural', 'operational', 'risk', 'information_gain', 'custom'
];

export const VALID_CAPACITY_DIRECTIONS = [
  'opens', 'improves', 'preserves', 'delays', 'reduces', 'blocks', 'unknown'
];

export function validateEimRow(row, rowIndex = 0) {
  const errors = [];
  const warnings = [];

  if (!row || typeof row !== 'object') {
    return { valid: false, errors: [`Row #${rowIndex} is not an object`], warnings };
  }

  // Required fields
  const required = ['id', 'subject_entity', 'counterparty_entity', 'request', 'response_state', 'evidence_status', 'effect_on_capacity'];
  for (const field of required) {
    if (row[field] === undefined || row[field] === null || String(row[field]).trim() === '') {
      errors.push(`Row #${rowIndex} (${row.id || 'unknown'}): missing required field "${field}"`);
    }
  }

  // Enum validations
  if (row.response_state && !VALID_RESPONSE_STATES.includes(String(row.response_state).toUpperCase())) {
    errors.push(`Row #${rowIndex} (${row.id}): invalid response_state "${row.response_state}". Expected one of: ${VALID_RESPONSE_STATES.join(', ')}`);
  }

  if (row.evidence_status && !VALID_EVIDENCE_STATES.includes(String(row.evidence_status).toUpperCase())) {
    errors.push(`Row #${rowIndex} (${row.id}): invalid evidence_status "${row.evidence_status}". Expected one of: ${VALID_EVIDENCE_STATES.join(', ')}`);
  }

  if (row.priority_mode && !VALID_PRIORITY_MODES.includes(String(row.priority_mode).toLowerCase())) {
    errors.push(`Row #${rowIndex} (${row.id}): invalid priority_mode "${row.priority_mode}". Expected one of: ${VALID_PRIORITY_MODES.join(', ')}`);
  }

  if (row.capacity_direction && !VALID_CAPACITY_DIRECTIONS.includes(String(row.capacity_direction).toLowerCase())) {
    errors.push(`Row #${rowIndex} (${row.id}): invalid capacity_direction "${row.capacity_direction}". Expected one of: ${VALID_CAPACITY_DIRECTIONS.join(', ')}`);
  }

  // Semantic Invariants
  // 1. Role separation invariant: information_holder != decision_authority != transmitter != controller_or_reviewer
  const roles = [
    row.information_holder,
    row.decision_authority,
    row.transmitter,
    row.controller_or_reviewer
  ].filter(Boolean).map(String);

  if (roles.length >= 2) {
    const allIdentical = roles.every(r => r === roles[0]);
    if (allIdentical && roles[0] !== 'variable selon la demande' && !roles[0].includes('selon')) {
      warnings.push(`Row #${rowIndex} (${row.id}): all four procedural roles collapsed into identical entity "${roles[0]}". Ensure role separation is intentional.`);
    }
  }

  // 2. Silence invariant: silence is an observation, not an inferred refusal
  if (String(row.response_state).toUpperCase() === 'SILENCE' && String(row.response_summary || '').toLowerCase().includes('refus')) {
    warnings.push(`Row #${rowIndex} (${row.id}): response_state is SILENCE but response_summary infers refusal. Silence must remain an observable event without imputed refusal unless an explicit rule applies.`);
  }

  // 3. Historical availability invariant: evidence_available_now vs evidence_available_at_relevant_time
  if (row.evidence_available_now === true && row.evidence_available_at_relevant_time === false && !row.historical_availability_status) {
    warnings.push(`Row #${rowIndex} (${row.id}): evidence is available now but was NOT available at the relevant time; declare historical_availability_status to prevent retro-projection.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    id: row.id
  };
}

export function validateEimDocument(docOrContent) {
  let doc = docOrContent;
  if (typeof docOrContent === 'string') {
    doc = jsYaml.load(docOrContent);
  }

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['EIM document must be a non-empty object'], warnings: [], rowCount: 0 };
  }

  const allErrors = [];
  const allWarnings = [];

  let rows = [];
  if (Array.isArray(doc.rows)) {
    rows = doc.rows;
  } else if (Array.isArray(doc)) {
    rows = doc;
  } else if (doc.id && doc.request) {
    rows = [doc];
  } else {
    allErrors.push('EIM document does not contain a "rows" array or valid row object');
    return { valid: false, errors: allErrors, warnings: allWarnings, rowCount: 0 };
  }

  let validRowsCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const res = validateEimRow(rows[i], i + 1);
    if (!res.valid) {
      allErrors.push(...res.errors);
    } else {
      validRowsCount++;
    }
    if (res.warnings.length > 0) {
      allWarnings.push(...res.warnings);
    }
  }

  return {
    valid: allErrors.length === 0,
    matrix_id: doc.matrix_id || 'unspecified',
    profile: doc.profile || 'generic',
    rowCount: rows.length,
    validRowsCount,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function validateEimFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`EIM file not found: ${filePath}`);
  }
  const content = fs.readFileSync(resolved, 'utf8');
  const res = validateEimDocument(content);
  return { ...res, filePath: resolved };
}
