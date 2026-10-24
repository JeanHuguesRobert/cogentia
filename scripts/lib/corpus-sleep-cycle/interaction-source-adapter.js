// Source-owned local repository + Gmail metadata adapter for #271.
// All working state is private. No raw source reference crosses into stdout.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");
const keyOf = (id) => String(id || "");
const dateOf = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
const idPattern = /^\d{4}-\d{2}-\d{2}-\d{3,}$/;
const helper = fileURLToPath(new URL("./gmail-readonly.py", import.meta.url));

export function privateWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function parseInteractionRows(text) {
  const rows = [], problems = [];
  let width = null, statusIndex = -1, dateIndex = 1;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
    if (cells[0] === "ID") {
      width = cells.length; statusIndex = cells.findIndex((c) => /^(status|statut)$/i.test(c));
      dateIndex = cells.findIndex((c) => /^date$/i.test(c)); continue;
    }
    if (!width || /^[-: ]+$/.test(cells[0] || "")) continue;
    const id = cells[0]?.replace(/`/g, "").replace(/^\[([^\]]+)\]\([^)]+\)$/, "$1");
    if (!idPattern.test(id || "") || cells.length !== width || statusIndex < 0) {
      problems.push({ line: index + 1, kind: "invalid_markdown_row", id: idPattern.test(id || "") ? id : null }); continue;
    }
    rows.push({ id, date: cells[dateIndex], raw_status: cells[statusIndex], line: index + 1,
      linked: /\]\([^)]*\.(yaml|yml)(?:#[^)]*)?\)/.test(line) });
  }
  return { rows, problems };
}

export function statusView(raw) {
  const text = String(raw || "");
  const awaiting_kind = /substant|avis attendu|decision pending|décision attendue/i.test(text) ? "substantive" : /delivery|livraison/i.test(text) ? "delivery" : "any_reply";
  if (/await|attent|no (response|reply)|sans réponse|not yet confirmed|pas.*réponse/i.test(text)) return { status: "awaiting", awaiting_kind };
  if (/reply.received|réponse reçue|accusé|acknowledg|replied|received.*negative|reply.*negative/i.test(text)) return { status: "reply_received", awaiting_kind };
  if (/^(fulfilled|resolved|completed|livré|résolu)$/i.test(text)) return { status: "fulfilled", awaiting_kind };
  return { status: "unknown", awaiting_kind };
}

export function readGmailMetadata(request, { env = process.env, timeoutMs = 30000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(env.INTERACTION_PYTHON || "python3", [helper], { env, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    let output = "", done = false;
    const finish = (error, value) => {
      if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve(value);
    };
    const fail = (code) => { child.kill(); finish(Object.assign(new Error(code), { code })); };
    const abort = () => fail("READ_TIMEOUT");
    const timer = setTimeout(abort, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.on("error", () => fail("GMAIL_HELPER_UNAVAILABLE"));
    child.stdout.on("data", (chunk) => { output += chunk; if (output.length > 4 * 1024 * 1024) fail("GMAIL_RESPONSE_LIMIT"); });
    child.on("close", () => {
      if (done) return;
      try {
        const result = JSON.parse(output);
        if (result.status !== "COMPLETED") return finish(Object.assign(new Error(), { code: ["GMAIL_CREDENTIALS_UNAVAILABLE", "GMAIL_IMAP_AUTH_DENIED", "GMAIL_IMAP_READ_FAILED"].includes(result.code) ? result.code : result.status === "BLOCKED_SECURITY" ? "BLOCKED_SECURITY" : "GMAIL_METADATA_READ_FAILED" }));
        finish(null, result.cases);
      } catch { finish(Object.assign(new Error(), { code: "GMAIL_INVALID_RESPONSE" })); }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(request));
  });
}

export function createInteractionSourceAdapter(config, { stateRoot, gmailReader = readGmailMetadata, env = process.env } = {}) {
  if (!config.authorized || !stateRoot || !Array.isArray(config.repositories)) throw new Error("AUTHORIZED_INTERACTION_CONFIG_REQUIRED");
  const aliasesFile = path.join(stateRoot, "source-aliases.json");
  const aliases = readJson(aliasesFile, {});
  const reference = (source) => aliases[source] ||= `priv:${crypto.randomUUID()}`;
  const snapshots = path.join(stateRoot, "active-snapshot.json");
  const progressFile = path.join(stateRoot, "source-progress.json");
  let snapshot = readJson(snapshots, null);
  return {
    authorized: true,
    savedWindow: snapshot ? { from: snapshot.from, through: snapshot.through } : null,
    async readSnapshot({ from, through, signal }) {
      if (snapshot) {
        if (snapshot.from !== from || snapshot.through !== through) throw Object.assign(new Error(), { code: "SNAPSHOT_WINDOW_MISMATCH" });
        return snapshot;
      }
      const groups = new Map();
      const group = (id) => {
        if (!groups.has(id)) groups.set(id, { key: id, packets: [], rows: [], diagnostics: [] });
        return groups.get(id);
      };
      const sources = [];
      let unavailable = false;
      for (const repository of config.repositories) {
        await new Promise((resolve) => setImmediate(resolve));
        if (signal?.aborted) throw Object.assign(new Error(), { code: "READ_TIMEOUT" });
        let root = path.resolve(repository.root);
        let revision = "unknown";
        try {
          const gitOptions = { cwd: root, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"], timeout: 10000 };
          if (config.refreshRepositories === true) {
            // Native reconstructible Git cache; never pull/reset a source checkout.
            // FETCH_HEAD has no task branch and carries the exact observed revision.
            const cache = path.join(stateRoot, "repository-cache", digest(repository.name));
            fs.mkdirSync(cache, { recursive: true, mode: 0o700 });
            const remote = execFileSync("git", ["remote", "get-url", "origin"], gitOptions).trim();
            const bare = path.join(cache, "objects.git");
            const commandOptions = { ...gitOptions, cwd: cache, env: { ...env, GIT_TERMINAL_PROMPT: "0", GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o ConnectTimeout=8" } };
            if (!fs.existsSync(bare)) execFileSync("git", ["init", "--bare", bare], commandOptions);
            execFileSync("git", ["--git-dir", bare, "fetch", "--depth=1", "--no-tags", remote, "main"], commandOptions);
            revision = execFileSync("git", ["--git-dir", bare, "rev-parse", "FETCH_HEAD"], commandOptions).trim();
            root = path.join(cache, revision);
            if (!fs.existsSync(path.join(root, ".snapshot-ready"))) {
              fs.mkdirSync(root, { recursive: true, mode: 0o700 });
              const archive = execFileSync("git", ["--git-dir", bare, "archive", revision, "interaction_packets"], { ...commandOptions, encoding: null, maxBuffer: 32 * 1024 * 1024 });
              execFileSync("tar", ["-xf", "-", "-C", root], { ...commandOptions, stdio: ["pipe", "pipe", "ignore"], input: archive });
              fs.writeFileSync(path.join(root, ".snapshot-ready"), revision, { mode: 0o600 });
            }
          } else revision = execFileSync("git", ["rev-parse", "HEAD"], gitOptions).trim();
        } catch (error) {
          unavailable = true;
          (aliases.__failures ||= []).push({ repository_ref: reference(`repository:${repository.name}`), phase: "repository_refresh", code: ["ENOENT", "EACCES", "EPERM", "ETIMEDOUT"].includes(error.code) ? error.code : "GIT_COMMAND_FAILED", exit_status: Number.isInteger(error.status) ? error.status : null });
        }
        const tree = path.join(root, "interaction_packets");
        if (!fs.existsSync(tree)) { unavailable = true; continue; }
        const inspect = (file) => {
          const stat = fs.statSync(file);
          if (stat.size > 262144) { unavailable = true; return; }
          const text = fs.readFileSync(file, "utf8");
          const source = `${repository.name}/${path.relative(root, file).replaceAll("\\", "/")}@sha256:${digest(text)}`;
          (aliases.__provenance ||= {})[source] = { observed_head: revision, sha256: digest(text) };
          sources.push({ file, digest: digest(text) });
          const ref = reference(source);
          if (/\.ya?ml$/i.test(file)) {
            try {
              const packet = load(text);
              if (idPattern.test(keyOf(packet?.id))) group(keyOf(packet.id)).packets.push({ packet, ref });
            } catch { group(`invalid:${source}`).diagnostics.push({ ref, kind: "partial_inputs" }); }
          } else if (/\.md$/i.test(file)) {
            const parsed = parseInteractionRows(text);
            const seen = new Set();
            for (const row of parsed.rows) {
              const item = group(row.id); item.rows.push({ ...row, ref });
              if (seen.has(row.id)) item.diagnostics.push({ ref, kind: "duplicate_case" });
              seen.add(row.id);
            }
            for (const problem of parsed.problems) group(problem.id || `row:${source}:${problem.line}`).diagnostics.push({ ref, kind: problem.kind });
          }
        };
        const walk = (dir, depth = 0) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory() && depth < 3 && (entry.name === "packets" || /^\d{4}$/.test(entry.name))) walk(path.join(dir, entry.name), depth + 1);
            else if (entry.isFile() && /\.(md|ya?ml)$/i.test(entry.name)) inspect(path.join(dir, entry.name));
          }
        };
        walk(tree);
      }
      // Optional existing SQL projection exports use the same comparison seam;
      // this adapter does not invent a database or acquire extra credentials.
      for (const projection of config.projectionFiles || []) {
        try {
          const text = fs.readFileSync(projection.path, "utf8");
          if (text.length > 4 * 1024 * 1024) throw new Error();
          const parsed = JSON.parse(text), rows = Array.isArray(parsed) ? parsed : parsed.rows;
          if (!Array.isArray(rows) || rows.length > 1000) throw new Error();
          const ref = reference(`projection:${projection.name}@sha256:${digest(text)}`);
          sources.push({ file: projection.path, digest: digest(text) });
          for (const row of rows) if (idPattern.test(keyOf(row.id))) group(keyOf(row.id)).rows.push({ date: dateOf(row.date), raw_status: row.status, ref, linked: true });
        } catch { unavailable = true; }
      }
      const anchored = (c) => c.packets.some((p) => /^[a-f\d]{8,16}$/i.test(String(p.packet.source_messages?.sent_gmail_id || "")));
      const sorted = [...groups.values()].sort((a, b) => Number(anchored(b)) - Number(anchored(a)) || Number(idPattern.test(b.key)) - Number(idPattern.test(a.key)) || b.key.localeCompare(a.key));
      const progress = readJson(progressFile, { after: "" });
      const pending = sorted.slice(sorted.findIndex((c) => c.key === progress.after) + 1);
      const chosen = (pending.length ? pending : sorted).slice(0, Math.min(config.maxCases || 10, 50));
      const mailCacheFile = path.join(stateRoot, "mail-metadata-cache.json");
      const mailCache = readJson(mailCacheFile, {});
      const requests = chosen.map((item) => {
        const known = {}, locators = [];
        for (const { packet } of item.packets) {
          const refs = packet.source_messages || {};
          if (refs.sent_gmail_id) locators.push(String(refs.sent_gmail_id));
          for (const [key, value] of Object.entries(refs)) {
            if (/acknowledgment_gmail_id/.test(key)) known[value] = "auto_ack";
            if (/partial_failure_gmail_id/.test(key)) known[value] = "partial_delivery_failure";
          }
        }
        const previous = mailCache[item.key];
        const since = previous?.checked_at ? new Date(Math.max(Date.parse(from), Date.parse(previous.checked_at) - 3 * 86400000)).toISOString() : from;
        return { key: item.key, sent_id: new Set(locators).size === 1 ? locators[0] : "", known_kinds: known, since };
      });
      privateWrite(aliasesFile, aliases);
      const observed = await gmailReader({ cases: requests, from, through, max_messages: Math.min(config.maxMessages || 20, 80) }, { env, signal, timeoutMs: config.readTimeoutMs || 45000 });
      const byKey = new Map(observed.map((c) => [c.key, c]));
      const cases = chosen.map((item) => {
        const observation = byKey.get(item.key);
        const merged = new Map((mailCache[item.key]?.events || []).map((e) => [e.ref, e]));
        for (const event of observation?.events || []) merged.set(event.ref, event);
        if (merged.size > 1000) throw Object.assign(new Error(), { code: "GMAIL_CACHE_LIMIT" });
        const rawEvents = [...merged.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        const events = rawEvents.map((e) => ({ ...e, ref: reference(`gmail:${e.ref}`) }));
        if (observation?.complete) mailCache[item.key] = { events: rawEvents, checked_at: through };
        const sent = events.find((e) => e.kind === "sent");
        const diagnostics = [...item.diagnostics];
        if (unavailable) diagnostics.push({ ref: reference("dependency:repository_unavailable"), kind: "partial_inputs" });
        if (!sent) diagnostics.push({ ref: reference(`case:${item.key}`), kind: "source_locator_missing" });
        const dates = new Set([...item.packets.map((p) => dateOf(p.packet.date)), ...item.rows.map((r) => r.date)].filter(Boolean));
        if (dates.size > 1) diagnostics.push({ ref: reference(`case:${item.key}`), kind: "date_mismatch" });
        const representations = [...item.packets.map((p) => ({ ref: p.ref, ...statusView(p.packet.status) })), ...item.rows.map((r) => ({ ref: r.ref, ...statusView(r.raw_status) }))];
        const states = new Set(representations.map((r) => r.status).filter((s) => s !== "unknown"));
        if (states.size > 1) diagnostics.push({ ref: reference(`case:${item.key}`), kind: "representation_disagreement" });
        if (item.rows.some((r) => !r.linked)) diagnostics.push({ ref: reference(`case:${item.key}`), kind: "missing_packet_link" });
        return { id: reference(`case:${item.key}`), revision: reference(`revision:${digest(JSON.stringify({ events, representations, diagnostics }))}`), visibility: "private",
          observation_scope: { from: sent?.at || from, through, channel_inspected: Boolean(observation?.events?.length),
            // All Mail excludes Spam/Trash. Never use this bounded observation as
            // proof of exhaustive silence or a legal follow-up trigger.
            complete: false, search_verified: Boolean(sent) },
          events, representations, diagnostics, expectations: { substantive: true } };
      });
      if (sources.some((s) => digest(fs.readFileSync(s.file, "utf8")) !== s.digest)) throw Object.assign(new Error(), { code: "SOURCE_CHANGED_DURING_READ" });
      privateWrite(aliasesFile, aliases);
      privateWrite(mailCacheFile, mailCache);
      snapshot = { cases, from, through, after: chosen.at(-1)?.key || "", repository_inputs_complete: !unavailable, coverage_limited: true };
      privateWrite(snapshots, snapshot);
      return snapshot;
    },
    counts() {
      return { observed_events: (snapshot?.cases || []).reduce((n, c) => n + c.events.length, 0),
        cases_with_mail: (snapshot?.cases || []).filter((c) => c.events.some((e) => e.kind === "sent")).length };
    },
    complete() {
      privateWrite(progressFile, { after: snapshot?.after || "", last_checked_at: snapshot?.through });
      // Snapshot is a reconstructible runtime cache, not original evidence.
      if (fs.existsSync(snapshots)) fs.unlinkSync(snapshots);
      snapshot = null;
    }
  };
}
