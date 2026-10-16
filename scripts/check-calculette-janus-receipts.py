#!/usr/bin/env python3
"""Offline fixtures for Janus receipt consistency audit."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile

spec=importlib.util.spec_from_file_location("janus",Path(__file__).with_name("calculette-janus-receipts.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def digest(b): return hashlib.sha256(b).hexdigest()

with tempfile.TemporaryDirectory() as tmp:
    p=Path(tmp)
    snapshot=b'{"number":241,"body":"fixture"}'
    (p/"issue-241.snapshot.json").write_bytes(snapshot)
    for arm in ("control","assisted"):
        answer="Result for "+arm
        usage={"input_tokens":10,"output_tokens":5}
        events=[
            {"type":"thread.started"},
            {"type":"turn.started"},
            {"type":"item.completed","item":{"type":"agent_message","text":answer}},
            {"type":"turn.completed","usage":usage},
        ]
        (p/(arm+".jsonl")).write_text("".join(json.dumps(x)+"\n" for x in events))
        summary={"arm":arm,"head":"a"*40,"issue_snapshot_sha256":digest(snapshot),
                 "prompt_sha256":digest(arm.encode()),"codex_exit_code":0,"failure":None,
                 "events":{"thread.started":1,"turn.started":1,"item.completed":1,"turn.completed":1},
                 "usage":usage,"final_answer_sha256":digest(answer.encode()),
                 "elapsed_seconds":1,"tool_calls_observed":{"command_execution":0}}
        (p/(arm+".summary.json")).write_text(json.dumps(summary))
    assert module.verify(p)["status"]=="verified_local_pair"
    (p/"assisted.summary.json").write_text((p/"assisted.summary.json").read_text().replace('"output_tokens": 5','"output_tokens": 6'))
    assert module.verify(p)["status"]=="blocked_or_failed"
    print("Janus paired receipt audit fixtures: passed")
