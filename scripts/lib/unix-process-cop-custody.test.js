import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_JHN_COP_STORE, inspectUnixProcessCopCustody } from "./unix-process-cop-custody.js";

const parent = "/var/lib/cogentia/cop";
function fakeFilesystem({ storeUid = 1001, parentUid = 1001, writablePaths = [], missing = false } = {}) {
  return {
    statSync(candidate) {
      if (missing) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      if (candidate === DEFAULT_JHN_COP_STORE) return { uid: storeUid, isFile: () => true, isDirectory: () => false };
      if (candidate === parent) return { uid: parentUid, isFile: () => false, isDirectory: () => true };
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
    accessSync(candidate) {
      if (!writablePaths.includes(candidate)) throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    },
  };
}

test("FBF: the existing ubuntu-owned canonical COP store forbids a same-UID agent shell", () => {
  const actual = inspectUnixProcessCopCustody({ env: {}, uid: 1001, filesystem: fakeFilesystem() });
  assert.equal(actual.blocked, true);
  assert.equal(actual.reason, "unix_process_cop_store_writable_by_executor");
});

test("FBF: file owner, parent owner and DAC write access are independently disqualifying", () => {
  const scenarios = [
    { storeUid: 1001, parentUid: 0 },
    { storeUid: 0, parentUid: 1001 },
    { storeUid: 0, parentUid: 0, writablePaths: [DEFAULT_JHN_COP_STORE] },
    { storeUid: 0, parentUid: 0, writablePaths: [parent] },
  ];
  for (const scenario of scenarios) {
    assert.equal(inspectUnixProcessCopCustody({ env: {}, uid: 1001, filesystem: fakeFilesystem(scenario) }).blocked, true);
  }
});

test("FBF: separate UID with unwritable store and directory passes only custody check", () => {
  const r = inspectUnixProcessCopCustody({
    env: {}, uid: 1002, filesystem: fakeFilesystem({ storeUid: 1001, parentUid: 1001 }),
  });
  assert.deepEqual(r, { blocked: false, checked: true, reason: "unix_process_cop_store_not_writable_by_executor" });
});

test("FBF: explicitly configured missing store is not bypassed", () => {
  const r = inspectUnixProcessCopCustody({
    env: { COGENTIA_JHN_CANONICAL_STORE_PATH: DEFAULT_JHN_COP_STORE },
    uid: 1002, filesystem: fakeFilesystem({ missing: true }),
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, "unix_process_cop_store_custody_unverifiable");
});

test("FBF: unconfigured absent local store is inconclusive, not authority", () => {
  const r = inspectUnixProcessCopCustody({ env: {}, uid: 1002, filesystem: fakeFilesystem({ missing: true }) });
  assert.equal(r.blocked, false);
  assert.equal(r.checked, false);
});

test("FBF: root process cannot serve as the ordinary agent shell", () => {
  const r = inspectUnixProcessCopCustody({ env: {}, uid: 0, filesystem: fakeFilesystem() });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, "unix_process_executor_identity_untrusted");
});
