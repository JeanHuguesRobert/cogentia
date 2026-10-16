#!/usr/bin/env python3
"""Read-only verification of a matched pair of local Codex benchmark receipts."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

def digest(data):
    return hashlib.sha256(data).hexdigest()

def inspect_arm(directory, arm, snapshot_hash):
    path = directory / (arm + ".summary.json")
    trace = directory / (arm + ".jsonl")
    if not path.is_file() or not trace.is_file():
        return {"status": "blocked", "reason": "missing_summary_or_trace", "arm": arm}
    summary = json.loads(path.read_text())
    counts = Counter()
    last_message = None
    usage = {}
    parse_errors = 0
    for line in trace.open(errors="replace"):
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            parse_errors += 1
            continue
        kind = event.get("type", "unknown")
        counts[kind] += 1
        item = event.get("item") or {}
        if kind == "item.completed" and item.get("type") == "agent_message":
            last_message = item.get("text", "")
        if kind == "turn.completed":
            usage = event.get("usage") or {}
    failures = []
    expected = summary.get("events") or {}
    if dict(counts) != expected: failures.append("event_counts_mismatch")
    if summary.get("usage") != usage: failures.append("usage_mismatch")
    if summary.get("final_answer_sha256") != (digest(last_message.encode()) if last_message else None):
        failures.append("answer_hash_mismatch")
    if summary.get("issue_snapshot_sha256") != snapshot_hash:
        failures.append("snapshot_mismatch")
    if summary.get("arm") != arm: failures.append("arm_mismatch")
    if parse_errors: failures.append("invalid_jsonl")
    if summary.get("codex_exit_code") != 0 or summary.get("failure") is not None:
        failures.append("execution_failed")
    if counts["turn.completed"] != 1 or counts["turn.failed"] or counts["error"]:
        failures.append("terminal_event_invalid")
    return {"arm":arm,"status":"verified_local_consistency" if not failures else "failed",
            "issues":failures,"head":summary.get("head"),"prompt_sha256":summary.get("prompt_sha256"),
            "elapsed_seconds":summary.get("elapsed_seconds"),
            "commands":(summary.get("tool_calls_observed") or {}).get("command_execution"),
            "usage":usage,"trace_sha256":digest(trace.read_bytes()),
            "summary_sha256":digest(path.read_bytes())}

def verify(directory):
    directory = Path(directory).resolve()
    snapshot = directory / "issue-241.snapshot.json"
    if not snapshot.is_file():
        return {"status":"blocked", "reason":"missing_issue_snapshot"}
    snapshot_hash=digest(snapshot.read_bytes())
    arms=[inspect_arm(directory,a,snapshot_hash) for a in ("control","assisted")]
    valid=all(a["status"]=="verified_local_consistency" for a in arms)
    same_head=valid and arms[0]["head"] == arms[1]["head"] and bool(arms[0]["head"])
    distinct_prompts=valid and arms[0]["prompt_sha256"] != arms[1]["prompt_sha256"]
    status="verified_local_pair" if valid and same_head and distinct_prompts else "blocked_or_failed"
    return {"schema":"cogentia.calculette.janus-receipt-audit/v1",
            "status":status, "snapshot_sha256":snapshot_hash,"arms":arms,
            "matched_head":same_head, "distinct_arm_prompts":distinct_prompts,
            "provenance":"local_file_consistency_only",
            "execution":"local_trace_completion_verified" if status=="verified_local_pair" else "not_established",
            "effectiveness":"unscored", "causal_gain":"not_established",
            "note":"Local files can be jointly forged; this is not independent attestation or a judgment of answer quality."}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("directory")
    args=parser.parse_args()
    result=verify(args.directory)
    print(json.dumps(result,indent=2,ensure_ascii=False))
    return 0 if result["status"]=="verified_local_pair" else 2

if __name__=="__main__":
    sys.exit(main())
