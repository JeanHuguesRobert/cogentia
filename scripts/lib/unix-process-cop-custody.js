/**
 * FBF: a generic shell must not run with an OS identity that can rewrite the
 * canonical COP authority database. This is a narrow custody check, not a
 * sandbox, mandate verifier, or proof that other secrets are inaccessible.
 */
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_JHN_COP_STORE = "/var/lib/cogentia/cop/john-root-v1.sqlite";

function writable(filesystem, candidate) {
  try {
    filesystem.accessSync(candidate, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Inspect only public file metadata / access rights. No DB connection.
 * Absence of the default store is inconclusive: it is not an authorization.
 * An explicitly configured but unavailable store fails closed.
 */
export function inspectUnixProcessCopCustody({
  env = process.env,
  uid = typeof process.getuid === "function" ? process.getuid() : null,
  filesystem = fs,
} = {}) {
  const explicitPath = String(env.COGENTIA_JHN_CANONICAL_STORE_PATH || "").trim();
  const storePath = explicitPath || DEFAULT_JHN_COP_STORE;
  if (!Number.isInteger(uid) || uid === 0) {
    return { blocked: true, checked: false, reason: "unix_process_executor_identity_untrusted" };
  }
  if (!path.isAbsolute(storePath)) {
    return { blocked: true, checked: false, reason: "unix_process_cop_store_path_invalid" };
  }

  let store, parent;
  try {
    store = filesystem.statSync(storePath);
    parent = filesystem.statSync(path.dirname(storePath));
  } catch (error) {
    if (!explicitPath && error?.code === "ENOENT") {
      return { blocked: false, checked: false, reason: "unix_process_cop_store_not_found" };
    }
    return { blocked: true, checked: false, reason: "unix_process_cop_store_custody_unverifiable" };
  }
  if (!store.isFile() || !parent.isDirectory()) {
    return { blocked: true, checked: false, reason: "unix_process_cop_store_type_invalid" };
  }
  // An owner can chmod even a currently read-only file/directory. The parent
  // owner may rename the DB despite the DB file mode.
  if (store.uid === uid || parent.uid === uid
      || writable(filesystem, storePath)
      || writable(filesystem, path.dirname(storePath))) {
    return { blocked: true, checked: true, reason: "unix_process_cop_store_writable_by_executor" };
  }
  return { blocked: false, checked: true, reason: "unix_process_cop_store_not_writable_by_executor" };
}
