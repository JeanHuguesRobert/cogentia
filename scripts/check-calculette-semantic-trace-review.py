#!/usr/bin/env python3
import importlib.util,json,tempfile
from pathlib import Path
p=Path(__file__).with_name("calculette-semantic-trace-review.py")
s=importlib.util.spec_from_file_location("semantic",p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp)
 for arm in ("control","assisted"):
  items=[{"type":"item.completed","item":{"type":"command_execution","command":"git status","aggregated_output":"ok","exit_code":0}},
  {"type":"item.completed","item":{"type":"command_execution","command":"node scripts/cogentia.js calculette orient","aggregated_output":"spawnSync git EPERM","exit_code":1}}]
  (root/(arm+".jsonl")).write_text("\n".join(map(json.dumps,items))+"\n")
 result=m.review(root)
 assert result["arms"]["control"]["observed_failures"]==1
 assert result["arms"]["assisted"]["commands"][1]["unnecessary"] is None
 assert result["gain_established"] is False
 print("semantic trace review fixtures: passed")
