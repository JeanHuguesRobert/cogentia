/**
 * Monotonic mandate attenuation comparator (cogentia#79 first slice).
 *
 * Authority(child) ⊆ Authority(parent)
 * Obligations(child) ⊇ Obligations(parent)
 *
 * Dimensions not comparable → WARN (fail closed for consequential acts is a policy
 * choice of the caller; this module reports WARN rather than inventing equality).
 */

const RISK_ORDER = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
const TRACE_ORDER = { none: 0, minimal: 1, material: 2, full: 3, forensic: 4 };

function asArray(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function setOf(arr) {
  return new Set((arr || []).map((x) => String(x).trim()).filter(Boolean));
}

/** Path/scope token: exact match or child under parent `foo/**` prefix. */
function scopeAllows(parentToken, childToken) {
  const p = String(parentToken);
  const c = String(childToken);
  if (p === c) return true;
  if (p.endsWith("/**")) {
    const base = p.slice(0, -3);
    return c === base || c.startsWith(base.endsWith("/") ? base : `${base}/`);
  }
  if (p.endsWith("/*")) {
    const base = p.slice(0, -2);
    if (!c.startsWith(base.endsWith("/") ? base : `${base}/`)) return false;
    const rest = c.slice(base.endsWith("/") ? base.length : base.length + 1);
    return rest.length > 0 && !rest.includes("/");
  }
  return false;
}

/** child ⊆ parent (with /** path attenuation) */
function isSubset(childArr, parentArr) {
  const parents = [...setOf(parentArr)];
  const children = [...setOf(childArr)];
  for (const c of children) {
    if (!parents.some((p) => scopeAllows(p, c) || p === c)) return false;
  }
  return true;
}

/** child ⊇ parent */
function isSuperset(childArr, parentArr) {
  return isSubset(parentArr, childArr);
}

function compareNumberCeiling(child, parent, name) {
  if (child == null && parent == null) return { dimension: name, status: "PASS", note: "both absent" };
  if (child == null || parent == null) {
    return { dimension: name, status: "WARN", note: "one side missing — not mechanically comparable" };
  }
  const c = Number(child);
  const p = Number(parent);
  if (!Number.isFinite(c) || !Number.isFinite(p)) {
    return { dimension: name, status: "WARN", note: "non-numeric" };
  }
  if (c <= p) return { dimension: name, status: "PASS", note: `${c} ≤ ${p}` };
  return { dimension: name, status: "FAIL", note: `child ${c} widens parent ${p}` };
}

function compareOrderedLabel(child, parent, orderMap, name, mode) {
  // mode: 'ceiling' → child must not exceed parent; 'floor' → child must be ≥ parent
  if (child == null && parent == null) return { dimension: name, status: "PASS", note: "both absent" };
  if (child == null || parent == null) {
    return { dimension: name, status: "WARN", note: "one side missing" };
  }
  const c = orderMap[String(child).toLowerCase()];
  const p = orderMap[String(parent).toLowerCase()];
  if (c == null || p == null) return { dimension: name, status: "WARN", note: "unknown label" };
  if (mode === "ceiling") {
    if (c <= p) return { dimension: name, status: "PASS", note: `${child} ≤ ${parent}` };
    return { dimension: name, status: "FAIL", note: `child risk/ceiling ${child} > parent ${parent}` };
  }
  if (c >= p) return { dimension: name, status: "PASS", note: `${child} ≥ ${parent}` };
  return { dimension: name, status: "FAIL", note: `child weakens ${name}: ${child} < ${parent}` };
}

function compareValidity(child, parent) {
  const cFrom = child?.valid_from || child?.from || null;
  const cUntil = child?.valid_until || child?.until || null;
  const pFrom = parent?.valid_from || parent?.from || null;
  const pUntil = parent?.valid_until || parent?.until || null;
  if (!cFrom && !cUntil && !pFrom && !pUntil) {
    return { dimension: "validity", status: "PASS", note: "no interval declared" };
  }
  if ((cFrom || cUntil) && !(pFrom || pUntil)) {
    return { dimension: "validity", status: "WARN", note: "parent interval absent" };
  }
  if (!(cFrom || cUntil) && (pFrom || pUntil)) {
    return { dimension: "validity", status: "WARN", note: "child interval absent" };
  }
  const fails = [];
  if (cFrom && pFrom && new Date(cFrom) < new Date(pFrom)) fails.push("child starts before parent");
  if (cUntil && pUntil && new Date(cUntil) > new Date(pUntil)) fails.push("child ends after parent");
  if (fails.length) return { dimension: "validity", status: "FAIL", note: fails.join("; ") };
  return { dimension: "validity", status: "PASS", note: "child interval ⊆ parent (where comparable)" };
}

/**
 * Compare parent vs child constraint envelopes.
 * @param {object} parent
 * @param {object} child
 * @returns {{ ok: boolean, verdict: 'PASS'|'WARN'|'FAIL', checks: object[], summary: object }}
 */
export function compareMandateAttenuation(parent, child) {
  if (!parent || typeof parent !== "object") {
    return {
      ok: false,
      verdict: "FAIL",
      protocol: "cogentia.mandate_attenuation/v1",
      error: "missing_parent",
      checks: [],
    };
  }
  if (!child || typeof child !== "object") {
    return {
      ok: false,
      verdict: "FAIL",
      protocol: "cogentia.mandate_attenuation/v1",
      error: "missing_child",
      checks: [],
    };
  }

  const checks = [];

  // Permission / effect scopes: child ⊆ parent when both present
  const pEffects = asArray(parent.effects ?? parent.permissions ?? parent.scopes_effects);
  const cEffects = asArray(child.effects ?? child.permissions ?? child.scopes_effects);
  if (pEffects && cEffects) {
    checks.push({
      dimension: "effects",
      status: isSubset(cEffects, pEffects) ? "PASS" : "FAIL",
      note: isSubset(cEffects, pEffects)
        ? "child effects ⊆ parent"
        : `child adds effects: ${[...setOf(cEffects)].filter((x) => !setOf(pEffects).has(x)).join(", ")}`,
    });
  } else if (pEffects || cEffects) {
    checks.push({ dimension: "effects", status: "WARN", note: "only one side declares effects" });
  }

  // Resource scopes (repos, paths, data classes)
  for (const key of ["repos", "paths", "data_classes", "audiences", "scopes"]) {
    const p = asArray(parent[key]);
    const c = asArray(child[key]);
    if (p && c) {
      checks.push({
        dimension: key,
        status: isSubset(c, p) ? "PASS" : "FAIL",
        note: isSubset(c, p)
          ? `child ${key} ⊆ parent`
          : `child widens ${key}: ${[...setOf(c)].filter((x) => !setOf(p).has(x)).join(", ")}`,
      });
    } else if (p || c) {
      checks.push({ dimension: key, status: "WARN", note: `only one side declares ${key}` });
    }
  }

  // Prohibitions: child may add (superset)
  const pProh = asArray(parent.prohibitions ?? parent.forbids);
  const cProh = asArray(child.prohibitions ?? child.forbids);
  if (pProh && cProh) {
    checks.push({
      dimension: "prohibitions",
      status: isSuperset(cProh, pProh) ? "PASS" : "FAIL",
      note: isSuperset(cProh, pProh)
        ? "child keeps all parent prohibitions"
        : "child dropped a parent prohibition",
    });
  } else if (pProh || cProh) {
    checks.push({ dimension: "prohibitions", status: "WARN", note: "only one side declares prohibitions" });
  }

  // Obligations: child may add
  const pObl = asArray(parent.obligations ?? parent.must);
  const cObl = asArray(child.obligations ?? child.must);
  if (pObl && cObl) {
    checks.push({
      dimension: "obligations",
      status: isSuperset(cObl, pObl) ? "PASS" : "FAIL",
      note: isSuperset(cObl, pObl)
        ? "child keeps all parent obligations"
        : "child dropped a parent obligation",
    });
  } else if (pObl || cObl) {
    checks.push({ dimension: "obligations", status: "WARN", note: "only one side declares obligations" });
  }

  // Disclosure scopes: child ⊆ parent
  const pDisc = asArray(parent.disclosure ?? parent.disclosure_scopes);
  const cDisc = asArray(child.disclosure ?? child.disclosure_scopes);
  if (pDisc && cDisc) {
    checks.push({
      dimension: "disclosure",
      status: isSubset(cDisc, pDisc) ? "PASS" : "FAIL",
      note: isSubset(cDisc, pDisc)
        ? "child disclosure ⊆ parent"
        : "child widens disclosure",
    });
  } else if (pDisc || cDisc) {
    checks.push({ dimension: "disclosure", status: "WARN", note: "only one side declares disclosure" });
  }

  // Budgets
  const pBudget = parent.budget && typeof parent.budget === "object" ? parent.budget : {};
  const cBudget = child.budget && typeof child.budget === "object" ? child.budget : {};
  const budgetKeys = new Set([...Object.keys(pBudget), ...Object.keys(cBudget)]);
  for (const k of budgetKeys) {
    checks.push(compareNumberCeiling(cBudget[k], pBudget[k], `budget.${k}`));
  }
  if (typeof parent.budget === "number" || typeof child.budget === "number") {
    checks.push(compareNumberCeiling(child.budget, parent.budget, "budget"));
  }

  // Delegation depth
  checks.push(
    compareNumberCeiling(
      child.delegation_depth ?? child.max_delegation,
      parent.delegation_depth ?? parent.max_delegation,
      "delegation_depth"
    )
  );

  // Risk ceiling
  checks.push(
    compareOrderedLabel(
      child.risk_ceiling ?? child.risk,
      parent.risk_ceiling ?? parent.risk,
      RISK_ORDER,
      "risk_ceiling",
      "ceiling"
    )
  );

  // Trace / evidence floor (child must be same or stronger)
  checks.push(
    compareOrderedLabel(
      child.trace_minimum ?? child.trace ?? child.evidence,
      parent.trace_minimum ?? parent.trace ?? parent.evidence,
      TRACE_ORDER,
      "trace_minimum",
      "floor"
    )
  );

  // Validity interval
  checks.push(
    compareValidity(
      {
        valid_from: child.valid_from,
        valid_until: child.valid_until,
        from: child.from,
        until: child.until,
      },
      {
        valid_from: parent.valid_from,
        valid_until: parent.valid_until,
        from: parent.from,
        until: parent.until,
      }
    )
  );

  // may_resolve / may_disclose booleans — child may only tighten
  for (const flag of ["may_disclose", "may_resolve_without_mandate", "may_widen_authority"]) {
    if (parent[flag] == null && child[flag] == null) continue;
    if (parent[flag] == null || child[flag] == null) {
      checks.push({ dimension: flag, status: "WARN", note: "only one side declares flag" });
      continue;
    }
    const p = Boolean(parent[flag]);
    const c = Boolean(child[flag]);
    // widening would be false→true
    if (!p && c) {
      checks.push({ dimension: flag, status: "FAIL", note: "child enables flag parent forbids" });
    } else {
      checks.push({ dimension: flag, status: "PASS", note: `${flag}: parent=${p} child=${c}` });
    }
  }

  const hasFail = checks.some((c) => c.status === "FAIL");
  const hasWarn = checks.some((c) => c.status === "WARN");
  const verdict = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  return {
    ok: !hasFail,
    protocol: "cogentia.mandate_attenuation/v1",
    verdict,
    checks,
    summary: {
      pass: checks.filter((c) => c.status === "PASS").length,
      warn: checks.filter((c) => c.status === "WARN").length,
      fail: checks.filter((c) => c.status === "FAIL").length,
    },
    skill_hint: "mandate-attenuation-check",
    policy: {
      fail_closed_for_consequential_acts: true,
      note: "WARN dimensions must not authorize consequential Acts until comparable or explicitly accepted.",
    },
  };
}
