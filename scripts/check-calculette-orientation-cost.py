#!/usr/bin/env python3
import importlib.util,json,tempfile
from pathlib import Path
p=Path(__file__).with_name("calculette-orientation-cost.py")
spec=importlib.util.spec_from_file_location("cost",p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
 d=Path(tmp)
 for arm in ("control","assisted"):
  records=[{"type":"item.completed","item":{"type":"command_execution","command":"git status"}},
           {"type":"item.completed","item":{"type":"command_execution","command":"git status"}}]
  (d/(arm+".jsonl")).write_text("\n".join(map(json.dumps,records))+"\n")
  (d/(arm+".summary.json")).write_text(json.dumps({"tool_calls_observed":{"command_execution":2},"head":"a"*40,"issue_snapshot_sha256":"b"*64,"usage":{"input_tokens":20},"elapsed_seconds":2}))
 r=m.assess(d)
 assert r["arms"]["control"]["repeat_exact_command_count"]==1
 assert r["arms"]["assisted"]["category_counts"]["git_checks"]==2
 assert r["gain_established"] is False and r["quality_scored"] is False
print("orientation-cost fixtures: passed")
