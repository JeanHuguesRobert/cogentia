#!/usr/bin/env python3
"""Offline checks for the matched-trial trace summarizer; never launches Codex."""
import importlib.util
import json
from pathlib import Path
import tempfile

MODULE = Path(__file__).with_name("calculette-matched-cold-trial.py")
spec = importlib.util.spec_from_file_location("matched_cold_trial", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as tmp:
    trace = Path(tmp) / "arm.jsonl"
    events = [
        {"type": "item.completed", "item": {"type": "command_execution", "command": "git status"}},
        {"type": "item.completed", "item": {"type": "agent_message", "text": "One bounded next step."}},
        {"type": "turn.completed", "usage": {"input_tokens": 10, "output_tokens": 5}},
        {"type": "turn.failed", "error": "fixture failure"},
    ]
    trace.write_text("not-json\n" + "\n".join(json.dumps(event) for event in events) + "\n", encoding="utf-8")
    result = module.analyze(trace)
    assert result["completed"] is True
    assert result["tool_calls_observed"] == {"command_execution": 1}
    assert result["usage"] == {"input_tokens": 10, "output_tokens": 5}
    assert result["final_answer"] == "One bounded next step."
    assert result["final_answer_sha256"] == module.sha(result["final_answer"])
    assert result["errors"] == ["invalid_jsonl_record", "fixture failure"]
print("matched cold-trial trace fixtures: passed")
