#!/usr/bin/env python3
"""Offline test for decision-quality worksheet and receipt digest gates."""
import hashlib, importlib.util, json, tempfile
from pathlib import Path
p=Path(__file__).with_name("calculette-decision-quality.py")
spec=importlib.util.spec_from_file_location("quality",p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as d:
    root=Path(d)
    for arm in ("control","assisted"):
        text="PR 234 and PR 246 merged. Authority not granted. Evidence unavailable. Next action: review."
        records=[{"type":"item.completed","item":{"type":"agent_message","text":text}}]
        (root/(arm+".jsonl")).write_text("\n".join(map(json.dumps,records))+"\n")
        (root/(arm+".summary.json")).write_text(json.dumps({"head":"a"*40,"issue_snapshot_sha256":"b"*64,
        "final_answer_sha256":hashlib.sha256(text.encode()).hexdigest(),"usage":{"input_tokens":100},
        "elapsed_seconds":2,"tool_calls_observed":{"command_execution":1}}))
    report=m.worksheet(root)
    assert report["quality_evaluated"] is False
    assert report["arms"]["control"]["review"]["next_action"]["score"] is None
    assert report["arms"]["assisted"]["indicators_not_scores"]["mentions_authority"]
    modified=json.loads((root/"assisted.summary.json").read_text())
    modified["final_answer_sha256"]="0"*64
    (root/"assisted.summary.json").write_text(json.dumps(modified))
    try: m.worksheet(root)
    except ValueError: pass
    else: raise AssertionError("expected digest mismatch")
print("decision-quality worksheet fixtures: passed")
