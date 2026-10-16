#!/usr/bin/env python3
"""Evidence-first orientation cost review: telemetry is not a quality verdict."""
import argparse,json,hashlib,re
from collections import Counter
from pathlib import Path
PATTERNS={
 "git_checks":re.compile(r"\bgit\s+(?:status|log|rev-parse|show|diff|merge-base|fetch)\b"),
 "issue_reads":re.compile(r"\b(?:gh issue view|gh api repos/.*/issues|calculette orient)\b"),
 "test_commands":re.compile(r"\b(?:node scripts/check-|pnpm test|npm test)\b"),
}
def inspect(path):
    counts=Counter(); commands=[]; seen={}; repeat=[]
    for idx,line in enumerate(path.open(errors="replace"),1):
        try:e=json.loads(line)
        except json.JSONDecodeError:continue
        item=e.get("item") or {}
        if e.get("type")=="item.completed" and item.get("type")=="command_execution":
            cmd=str(item.get("command","")).strip()
            digest=hashlib.sha256(cmd.encode()).hexdigest()
            if digest in seen:repeat.append({"first_line":seen[digest],"repeated_line":idx,"command_sha256":digest})
            else:seen[digest]=idx
            kinds=[name for name,regex in PATTERNS.items() if regex.search(cmd)]
            for kind in kinds:counts[kind]+=1
            commands.append({"line":idx,"sha256":digest,"categories":kinds})
    return {"command_count":len(commands),"repeat_exact_command_count":len(repeat),
            "repeat_exact_commands":repeat,"category_counts":dict(counts),
            "command_evidence":commands}
def assess(directory):
    p=Path(directory)
    results={}
    for arm in ("control","assisted"):
        summary=json.loads((p/f"{arm}.summary.json").read_text())
        result=inspect(p/f"{arm}.jsonl")
        expected=(summary.get("tool_calls_observed") or {}).get("command_execution")
        if expected!=result["command_count"]:raise ValueError(f"{arm}: command count mismatch")
        result["elapsed_seconds"]=summary.get("elapsed_seconds")
        result["input_tokens"]=summary.get("usage",{}).get("input_tokens")
        result["head"]=summary.get("head")
        result["snapshot_sha256"]=summary.get("issue_snapshot_sha256")
        result["human_review"]={k:None for k in ("unnecessary_actions","stale_sources","avoidable_rework","corrections","decision_accuracy")}
        results[arm]=result
    if results["control"]["head"]!=results["assisted"]["head"] or results["control"]["snapshot_sha256"]!=results["assisted"]["snapshot_sha256"]:
        raise ValueError("heads or issue snapshots differ")
    return {"schema":"cogentia.calculette.orientation-cost/v1","arms":results,
            "interpretation":"exact command duplication is a proxy, not proof of unnecessary work",
            "quality_scored":False,"gain_established":False,
            "notes":"Classification uses command text only. Human must inspect actual results, references, corrections and necessity. Never upload raw traces automatically."}
def main():
    ap=argparse.ArgumentParser();ap.add_argument("directory");ap.add_argument("--output")
    a=ap.parse_args();output=json.dumps(assess(a.directory),indent=2,ensure_ascii=False)+"\n"
    if a.output:Path(a.output).open("x").write(output)
    else:print(output,end="")
if __name__=="__main__":main()
