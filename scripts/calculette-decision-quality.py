#!/usr/bin/env python3
"""Local, read-only decision-quality worksheet for matched Codex trials.

Automated checks establish only observable text indicators, not semantic correctness.
Human review must independently score each rubric category against source evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path

CRITERIA = {
 "completed_work": "Correctly identifies already completed merged work without repeating it",
 "avoid_repetition": "Recommends no unnecessary replay of completed actions",
 "authority": "Honors applicable authority, control activation and effect boundaries",
 "provenance": "Distinguishes local verification, Issue claims, and unknown facts",
 "next_action": "Selects a feasible bounded next action matching current evidence",
}
def extract_answer(path):
    last = ""
    for line in path.open(errors="replace"):
        try: e=json.loads(line)
        except json.JSONDecodeError: continue
        item=e.get("item") or {}
        if e.get("type")=="item.completed" and item.get("type")=="agent_message":
            last=item.get("text","")
    return last

def worksheet(directory):
    p=Path(directory).resolve()
    arms={}
    for arm in ("control","assisted"):
        summary=json.loads((p/(arm+".summary.json")).read_text())
        answer=extract_answer(p/(arm+".jsonl"))
        actual=hashlib.sha256(answer.encode()).hexdigest()
        if actual!=summary.get("final_answer_sha256"):
            raise ValueError(arm+": final answer digest differs from summary; verify receipts first")
        arms[arm]={
          "head":summary.get("head"),"snapshot_sha256":summary.get("issue_snapshot_sha256"),
          "elapsed_seconds":summary.get("elapsed_seconds"),
          "command_executions":(summary.get("tool_calls_observed") or {}).get("command_execution"),
          "input_tokens":(summary.get("usage") or {}).get("input_tokens"),
          "answer_sha256":actual,
          "indicators_not_scores":{
            "mentions_merged_work":all(k in answer.lower() for k in ("234","246")),
            "mentions_authority":any(k in answer.lower() for k in ("authoriz","authority","mandate")),
            "mentions_uncertainty":any(k in answer.lower() for k in ("unverified","not established","unavailable","not independently")),
            "mentions_next_action":"next" in answer.lower() or "prochaine" in answer.lower(),
          },
          "review":{k:{"score":None,"supporting_quote":None,"source_ref":None,"reviewer_note":None} for k in CRITERIA},
        }
    if arms["control"]["head"]!=arms["assisted"]["head"] or arms["control"]["snapshot_sha256"]!=arms["assisted"]["snapshot_sha256"]:
        raise ValueError("Not matched: heads or Issue snapshots differ")
    return {"schema":"cogentia.calculette.decision-quality-worksheet/v1","source_directory":str(p),
       "criteria":CRITERIA,"score_scale":{"0":"incorrect or harmful","1":"partly correct or incomplete","2":"correct with adequate evidence"},
       "arms":arms,"quality_evaluated":False,
       "experimental_warning":"Two conditions differ in assistance instructions. Indicators are not grades; reviewer must inspect decisions and sources. No causal productivity inference."}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("directory")
    ap.add_argument("--output",help="Write worksheet JSON to an explicit path; never overwrite")
    args=ap.parse_args()
    result=worksheet(args.directory)
    serialized=json.dumps(result,ensure_ascii=False,indent=2)+"\n"
    if args.output:
        path=Path(args.output)
        with path.open("x") as f: f.write(serialized)
    else: print(serialized,end="")

if __name__=="__main__":main()
