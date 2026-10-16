#!/usr/bin/env python3
"""Matched read-only Codex cold-reorientation trial. Never modifies the repository."""
import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ISSUE = "Resume issue 241 of repository JeanHuguesRobert/cogentia."
BASE = """Work independently from the repository and durable Issue evidence. Do not use conversation history.
Read applicable controls and inspect evidence only. Do not change files, rerun tests, or take external actions.
Return the goal, exact acceptance criteria (or explicit retrieval gap), already completed work,
source-vs-claim distinctions, mandate boundary, and exactly one next bounded action.
Provide evidence references; never claim an unavailable check succeeded."""
ARMS = {
    "control": "Do not run the Calculette orientation command; orient using repository and Issue evidence directly.",
    "assisted": "Use the existing read-only calculette orient command if locally available; independently check what it does not verify.",
}

def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()

def analyze(path):
    counts = collections.Counter()
    tools = collections.Counter()
    last = None
    usage = {}
    errors = []
    for line in path.open(encoding="utf-8", errors="replace"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            errors.append("invalid_jsonl_record")
            continue
        typ = e.get("type", "unknown")
        counts[typ] += 1
        item = e.get("item") or {}
        if item.get("type") == "command_execution" and typ == "item.completed":
            tools["command_execution"] += 1
        if item.get("type") == "agent_message" and typ == "item.completed":
            last = item.get("text", "")
        if typ == "turn.completed":
            usage = e.get("usage") or {}
        if typ in ("turn.failed", "error"):
            errors.append(str(e.get("error", "unknown"))[:300])
    return {"events": dict(counts), "tool_calls_observed": dict(tools), "usage": usage,
            "completed": counts["turn.completed"] > 0, "errors": errors,
            "final_answer_sha256": sha(last) if last else None,
            "final_answer": last}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arm", choices=ARMS, required=True)
    ap.add_argument("--root", default=".")
    ap.add_argument("--output-dir", default="/tmp/cogentia-cold-trials-241")
    ap.add_argument("--timeout", type=int, default=900)
    args = ap.parse_args()
    root = Path(args.root).resolve()
    head = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    if subprocess.call(["git", "-C", str(root), "diff", "--quiet"]) != 0:
        raise SystemExit("Refusing a dirty tracked worktree. Use a clean isolated worktree.")
    out = Path(args.output_dir)
    out.mkdir(mode=0o700, parents=True, exist_ok=True)
    if out.is_symlink():
        raise SystemExit("Refusing symlink output directory")
    # Do not overwrite previous experimental evidence.
    results = out / (args.arm + ".summary.json")
    trace = out / (args.arm + ".jsonl")
    stderr = out / (args.arm + ".stderr")
    if any(p.exists() for p in (results, trace, stderr)):
        raise SystemExit("Trial artifacts already exist; choose a new output directory.")
    prompt = ISSUE + "\n\n" + BASE + "\n" + ARMS[args.arm]
    start = dt.datetime.now(dt.timezone.utc).isoformat()
    began = time.monotonic()
    status = None
    failure = None
    with trace.open("x", encoding="utf-8") as tr, stderr.open("x", encoding="utf-8") as err:
        try:
            cmd = ["codex", "exec", "--sandbox", "read-only", "--json", prompt]
            proc = subprocess.run(cmd, cwd=root, stdin=subprocess.DEVNULL, stdout=tr,
                                  stderr=err, timeout=args.timeout, check=False)
            status = proc.returncode
        except subprocess.TimeoutExpired:
            failure = "timeout"
        except OSError as exc:
            failure = type(exc).__name__
    evidence = analyze(trace)
    # Keep raw traces local; only a hash of the final answer enters the compact summary.
    final = evidence.pop("final_answer")
    result = {"schema":"cogentia.calculette.matched-cold-trial/v1",
              "arm":args.arm, "issue":ISSUE, "head":head,
              "prompt_sha256":sha(prompt), "started_utc":start,
              "elapsed_seconds":round(time.monotonic()-began, 2),
              "codex_exit_code":status, "failure":failure, **evidence,
              "trace":str(trace), "stderr":str(stderr),
              "evaluation":"unscored_requires_human_evidence_review"}
    results.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k not in ("trace","stderr")}, ensure_ascii=False, indent=2))
    print("\n=== Handler decision ===\n"+(final or "(no final agent answer)"))
    print("\nRaw trace retained locally:", trace)
    if status not in (0, None) or failure:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
