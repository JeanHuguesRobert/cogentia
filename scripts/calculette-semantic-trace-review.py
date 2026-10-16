#!/usr/bin/env python3
"""Read-only evidence-linked review of command outcomes, not automated waste judgments."""
import argparse, hashlib, json, re
from pathlib import Path

def classify(cmd, output):
    tags=[]
    if re.search(r"\bcalculette\s+orient\b",cmd):tags.append("calculette_orientation")
    if re.search(r"\bgit\s+(?:rev-parse|log|status|diff|merge-base)\b",cmd):tags.append("git_evidence")
    if re.search(r"\b(?:rg|grep|cat|sed|find)\b",cmd):tags.append("source_inspection")
    if "EPERM" in output:tags.append("sandbox_permission_failure")
    if "EROFS" in output:tags.append("read_only_filesystem_failure")
    if "Cannot find package" in output or "ERR_MODULE_NOT_FOUND" in output:tags.append("missing_dependency")
    return tags

def review(directory):
    root=Path(directory);arms={}
    for arm in ("control","assisted"):
        commands=[];previous=[]
        with (root/(arm+".jsonl")).open(errors="replace") as fh:
            for line_no,line in enumerate(fh,1):
                try:e=json.loads(line)
                except json.JSONDecodeError:continue
                item=e.get("item") or {}
                if e.get("type")!="item.completed" or item.get("type")!="command_execution":continue
                cmd=str(item.get("command",""));output=str(item.get("aggregated_output",""))
                tags=classify(cmd,output)
                commands.append({"trace_line":line_no,"command_sha256":hashlib.sha256(cmd.encode()).hexdigest(),
                  "output_sha256":hashlib.sha256(output.encode()).hexdigest(),
                  "tags":tags,"exit_code":item.get("exit_code"),
                  "review_needed":"cause_and_necessity","unnecessary":None,
                  "note":"Hash and tags only; inspect original command/output locally before judgment."})
        arms[arm]={"commands":commands,"observed_failures":sum(any(t.endswith("_failure") or t=="missing_dependency" for t in c["tags"]) for c in commands),
            "manual_review_complete":False}
    return {"schema":"cogentia.calculette.semantic-trace-review/v1","arms":arms,
      "gain_established":False,"caution":"Tags are cues, not causal or necessity judgments. Do not publish raw traces."}

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("directory");p.add_argument("--output");a=p.parse_args()
    data=json.dumps(review(a.directory),ensure_ascii=False,indent=2)+"\n"
    if a.output:Path(a.output).open("x").write(data)
    else:print(data,end="")
