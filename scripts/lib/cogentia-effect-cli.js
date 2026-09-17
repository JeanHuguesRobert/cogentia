/**
 * CLI mint UI for #171: show EXPOSE, require confirm=payload_hash, emit grant.
 */
import fs from "node:fs";
import { canonicalPayloadHash, mintSideEffectGrantFromPrepared } from "./side-effect-authorization.js";

function readPrepared(fromPath, inlineJson) {
  if (inlineJson) return JSON.parse(inlineJson);
  if (!fromPath) throw new Error("Usage: effect grant --from <expose.json> --confirm <payload_hash>");
  return JSON.parse(fs.readFileSync(fromPath, "utf8"));
}

export function cmdEffectGrant(argv = process.argv.slice(3), env = process.env) {
  const args = [...argv];
  let fromPath = null;
  let confirm = null;
  let principal = env.COGENTIA_PRINCIPAL || env.COGENTIA_ACTOR || "principal:cli";
  let jsonOut = false;
  let inline = null;
  while (args.length) {
    const a = args.shift();
    if (a === "--from") fromPath = args.shift();
    else if (a === "--confirm") confirm = args.shift();
    else if (a === "--principal") principal = args.shift();
    else if (a === "--json") jsonOut = true;
    else if (a === "--prepared-json") inline = args.shift();
    else if (a === "--help" || a === "-h") {
      const text = `effect grant --from <expose.json> --confirm <payload_hash>
  Mint a side_effect_authorization after reviewing EXPOSE.
  First run without --confirm prints the payload preview and hash (exit 2).
  Chat utterances never mint.`;
      if (jsonOut) return { ok: true, help: text };
      console.log(text);
      return { ok: true };
    }
  }
  const prepared = readPrepared(fromPath, inline);
  const hash = canonicalPayloadHash(prepared.payload);
  const preview = prepared.exposed_message || prepared.exposed_mutation || prepared.target;
  if (!confirm) {
    const expose = {
      ok: false,
      error_class: "confirm_required",
      phase: "EXPOSE",
      action_class: prepared.action_class,
      payload_hash: hash,
      preview,
      next: `re-run with --confirm ${hash}`,
    };
    if (jsonOut) {
      console.log(JSON.stringify(expose, null, 2));
    } else {
      console.error("EXPOSE (not a send/write):");
      console.error(JSON.stringify(preview, null, 2));
      console.error(`payload_hash: ${hash}`);
      console.error(`Mint: --confirm ${hash}`);
    }
    const err = new Error("confirm_required");
    err.error_class = "confirm_required";
    err.exit_code = 2;
    err.expose = expose;
    throw err;
  }
  const grant = mintSideEffectGrantFromPrepared(prepared, { principal, confirm });
  if (jsonOut) console.log(JSON.stringify(grant, null, 2));
  else {
    console.log(`granted ${grant.authorization_id}`);
    console.log(`payload_hash ${grant.payload_hash}`);
  }
  return { ok: true, grant };
}
