#!/usr/bin/env python3
"""Synthetic multi-repository recovery audit test (entirely temporary)."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

SCRIPT=Path(__file__).resolve().parent/"ops/audit-recovered-corpus.py"
def git(repo,*args):
    return subprocess.check_output(["git","-C",str(repo),*args],text=True,stderr=subprocess.DEVNULL).strip()

with tempfile.TemporaryDirectory(prefix="corpus-recovery-audit-test-") as t:
    root=Path(t)
    arch=root/"archive"
    canon=root/"main"
    arch.mkdir()
    canon.mkdir()
    main=canon/"alfa"
    main.mkdir()
    git(main,"init","-b","main")
    git(main,"config","user.name","Fixture")
    git(main,"config","user.email","fixture@example.invalid")
    (main/"retained.md").write_text("old\n")
    (main/"historical.md").write_text("historical only\n")
    git(main,"add",".")
    git(main,"commit","-m","initial")
    subprocess.run(["git","clone",str(main),str(arch/"alfa")],check=True,capture_output=True)
    (main/"historical.md").unlink()
    (main/"retained.md").write_text("newer\n")
    git(main,"add","-A")
    git(main,"commit","-m","replace")
    old=arch/"alfa"
    (old/"working.md").write_text("unique local WIP\n")
    receipt=root/"private.json"
    call=[sys.executable,str(SCRIPT),"--archive",str(arch),"--canonical",str(canon),"--out",str(receipt)]
    before=git(old,"rev-parse","HEAD")
    raw=subprocess.check_output(call,text=True)
    public=json.loads(raw)
    private=json.loads(receipt.read_text())
    assert public["totals"]["archives"]==1
    assert public["totals"]["old_only_candidate"]==1
    assert public["totals"]["dirty_paths"]==1
    assert private["repositories"][0]["old_only_candidate"]==["historical.md"]
    assert private["repositories"][0]["different_paths"]==["retained.md"]
    assert os.stat(receipt).st_mode & 0o077 == 0
    assert git(old,"rev-parse","HEAD")==before
    # No canonical on this host, but externally attested full tree can close the gap.
    beta=arch/"beta"
    subprocess.run(["git","clone",str(main),str(beta)],check=True,capture_output=True)
    paths=git(beta,"ls-tree","-r","HEAD").splitlines()
    entries={}
    for line in paths:
        h,p=line.split("\t",1)
        entries[p]=h.split()[2]
    external=root/"external.json"
    external.write_text(json.dumps({"beta":{"head":git(beta,"rev-parse","HEAD"),"files":entries}}))
    call.extend(["--external-tree-map",str(external)])
    again=json.loads(subprocess.check_output(call,text=True))
    assert again["totals"]["archives"]==2
    assert again["totals"]["missing_canonical"]==0
    assert again["totals"]["old_only_candidate"]==1
    assert not (canon/"beta").exists()
    print("CORPUS_RECOVERY_AUDIT_PASS: missing/modified/dirty, external tree and no mutations")
