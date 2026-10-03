function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeMatches(value, expected) {
  if (expected === "object") return isObject(value);
  if (expected === "array") return Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "string") return typeof value === "string";
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "null") return value === null;
  return true;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pointerGet(root, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Only local JSON Schema references are supported: ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((value, key) => value?.[key], root);
}

function validateSchemaNode(value, node, rootSchema, at, errors) {
  if (!node || typeof node !== "object") return;

  if (node.$ref) {
    const target = pointerGet(rootSchema, node.$ref);
    if (!target) {
      errors.push(`${at}: unresolved schema reference ${node.$ref}`);
      return;
    }
    validateSchemaNode(value, target, rootSchema, at, errors);
    return;
  }

  if (Array.isArray(node.oneOf)) {
    const branchErrors = node.oneOf.map((branch) => {
      const collected = [];
      validateSchemaNode(value, branch, rootSchema, at, collected);
      return collected;
    });
    const matches = branchErrors.filter((collected) => collected.length === 0);
    if (matches.length === 1) return;
    if (matches.length > 1) {
      errors.push(`${at}: matches multiple schema branches`);
      return;
    }
    const best = branchErrors.reduce((shortest, collected) => (
      collected.length < shortest.length ? collected : shortest
    ));
    errors.push(...best);
    return;
  }

  if ("const" in node && !deepEqual(value, node.const)) {
    errors.push(`${at}: expected constant ${JSON.stringify(node.const)}`);
  }

  if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(value, candidate))) {
    errors.push(`${at}: value ${JSON.stringify(value)} is not in the allowed enum`);
  }

  if (node.type) {
    const types = Array.isArray(node.type) ? node.type : [node.type];
    if (!types.some((expected) => typeMatches(value, expected))) {
      errors.push(`${at}: expected type ${types.join("|")}`);
      return;
    }
  }

  if (typeof value === "string") {
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      errors.push(`${at}: value does not match pattern ${node.pattern}`);
    }
    if (Number.isInteger(node.minLength) && value.length < node.minLength) {
      errors.push(`${at}: expected minimum length ${node.minLength}`);
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(node.minItems) && value.length < node.minItems) {
      errors.push(`${at}: expected at least ${node.minItems} items`);
    }
    if (node.items) {
      value.forEach((item, index) => {
        validateSchemaNode(item, node.items, rootSchema, `${at}[${index}]`, errors);
      });
    }
  }

  if (isObject(value)) {
    for (const required of node.required || []) {
      if (!(required in value)) errors.push(`${at}: missing required property "${required}"`);
    }
    const properties = node.properties || {};
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) validateSchemaNode(value[key], child, rootSchema, `${at}.${key}`, errors);
    }
    if (node.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) errors.push(`${at}: unexpected property "${key}"`);
      }
    }
  }
}

function checkKnownOrUnknown(value, at, errors, valueLabel) {
  if (!isObject(value)) return;
  if (value.status === "unknown" && value.value !== null) {
    errors.push(`${at}: status unknown requires a null ${valueLabel}`);
  }
  if (value.status === "known" && (typeof value.value !== "string" || value.value.length === 0)) {
    errors.push(`${at}: status known requires a non-empty string ${valueLabel}`);
  }
}

function checkUncertainty(value, at, errors) {
  if (!isObject(value)) return;
  if (value.status === "unknown" && value.note !== null) {
    errors.push(`${at}: status unknown requires a null note`);
  }
  if (value.status === "known" && (typeof value.note !== "string" || value.note.length === 0)) {
    errors.push(`${at}: status known requires a non-empty note`);
  }
}

function checkSnapshot(data, errors, warnings, sha256Prefixed) {
  checkKnownOrUnknown(data.captured_at, "$.captured_at", errors, "value");

  const raw = data.raw_response;
  if (isObject(raw)) {
    if (typeof raw.body === "string") {
      if (raw.body_sha256 !== sha256Prefixed(raw.body)) {
        errors.push("$.raw_response.body_sha256 does not match the UTF-8 body");
      }
    } else if (raw.body === null) {
      warnings.push("$.raw_response.body is absent; this document is not the immutable measurement");
    }
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const seen = new Set();
  const idSet = new Set();
  for (const item of items) {
    if (!item?.id) continue;
    if (seen.has(item.id)) errors.push(`duplicate item id: ${item.id}`);
    seen.add(item.id);
    idSet.add(item.id);
  }

  items.forEach((item, index) => {
    const at = `$.items[${index}]`;
    checkKnownOrUnknown(item?.claimed_time, `${at}.claimed_time`, errors, "value");
    checkUncertainty(item?.uncertainty, `${at}.uncertainty`, errors);
    for (const other of item?.contradicts || []) {
      if (other === item.id) {
        errors.push(`${item.id}: an item cannot contradict itself`);
      } else if (!idSet.has(other)) {
        errors.push(`${item.id}: contradiction does not resolve to an item in this snapshot: ${other}`);
      }
    }
  });
}

export function validateAgentAcquiredContextDocument(data, schema, sha256Prefixed) {
  if (typeof sha256Prefixed !== "function") {
    throw new Error("validateAgentAcquiredContextDocument requires a sha256Prefixed function");
  }

  const errors = [];
  const warnings = [];
  if (!isObject(data)) {
    return {
      ok: false,
      errors: ["document root must be an object"],
      warnings,
      kind: null,
      layer: null,
      counts: { items: 0 },
    };
  }

  validateSchemaNode(data, schema, schema, "$", errors);

  if (data.kind === "agent_acquired_context") {
    checkSnapshot(data, errors, warnings, sha256Prefixed);
  } else if (data.kind === "agent_acquired_context_annotation") {
    checkKnownOrUnknown(data.annotated_at, "$.annotated_at", errors, "value");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    kind: typeof data.kind === "string" ? data.kind : null,
    layer: typeof data.layer === "string" ? data.layer : null,
    counts: { items: Array.isArray(data.items) ? data.items.length : 0 },
  };
}
