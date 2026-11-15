/**
 * FBF: a generic shell must not run with an OS identity that can rewrite the
 * canonical COP authority database. This is a narrow custody check, not a
 * sandbox, mandate verifier, or proof that other secrets are inaccessible.
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

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

/**
 * #299: the MCP authority server remains ubuntu and owns the canonical COP
 * store; only the *child process* is moved to an independently less-privileged
 * OS user. Check the exact identity and effective write access through the
 * same sudoers path used at dispatch, not the permissions of the MCP parent.
 * This cannot be enabled by a tool argument or a model-supplied environment.
 */
export const ISOLATED_UNIX_EXECUTOR_USER = "cogentia-effect";
const FIXED_ISOLATED_CUSTODY_CHECK =
  'printf "UID="; id -u; printf "GIDS="; id -G; ' +
  'if test -w /var/lib/cogentia/cop/john-root-v1.sqlite || ' +
  'test -w /var/lib/cogentia/cop; then echo "WRITABLE=yes"; ' +
  'else echo "WRITABLE=no"; fi';
export function inspectIsolatedUnixProcessCopCustody({
  env=process.env, filesystem=fs, spawn=spawnSync,
}={}) {
  if (env.COGENTIA_HOST_UNIX_ISOLATED_USER !== ISOLATED_UNIX_EXECUTOR_USER)
    return {blocked:true,checked:false,reason:"isolated_unix_executor_not_configured"};
  const storePath=String(env.COGENTIA_JHN_CANONICAL_STORE_PATH||DEFAULT_JHN_COP_STORE);
  if (storePath!==DEFAULT_JHN_COP_STORE)
    return {blocked:true,checked:false,reason:"isolated_unix_cop_path_untrusted"};
  try {
    const store=filesystem.statSync(storePath);
    const parent=filesystem.statSync(path.dirname(storePath));
    if (!store.isFile()||!parent.isDirectory())
      return {blocked:true,checked:false,reason:"isolated_unix_store_invalid"};
    if (filesystem.realpathSync(storePath)!==DEFAULT_JHN_COP_STORE ||
        filesystem.realpathSync(path.dirname(storePath))!==path.dirname(storePath))
      return {blocked:true,checked:false,reason:"isolated_unix_store_symlink"};
    const check=spawn("sudo",["-n","-u",ISOLATED_UNIX_EXECUTOR_USER,
      "--","/bin/sh","-c",FIXED_ISOLATED_CUSTODY_CHECK],{
      encoding:"utf8",timeout:4000,maxBuffer:1024,
      env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin"},
    });
    if (check.error || check.status!==0)
      return {blocked:true,checked:false,reason:"isolated_unix_executor_unreachable"};
    const match=/^UID=(\d+)\nGIDS=([\d ]+)\nWRITABLE=(yes|no)\n?$/.exec(check.stdout);
    if (!match) return {blocked:true,checked:false,reason:"isolated_unix_identity_unverifiable"};
    const uid=Number(match[1]),groups=match[2].trim().split(" ").map(Number);
    if (!Number.isInteger(uid)||uid===0||uid===process.getuid?.() ||
        store.uid===uid||parent.uid===uid||
        groups.some(g=>(store.mode & 0o020 && store.gid===g) ||
          (parent.mode & 0o020 && parent.gid===g))||
        match[3]!=="no")
      return {blocked:true,checked:true,reason:"unix_process_cop_store_writable_by_executor"};
    return {blocked:false,checked:true,
      reason:"isolated_unix_cop_store_not_writable_by_executor",executor_uid:uid};
  } catch {
    return {blocked:true,checked:false,reason:"isolated_unix_custody_unverifiable"};
  }
}
