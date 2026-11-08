#!/usr/bin/env python3
"""Create a reviewable, reproducible root-issuer source bundle, WITHOUT install.

It includes only the audited code closure and package metadata. Its SHA256
is a human-controlled installation input, never a Principal authorization.
"""
import hashlib
import gzip
import io
import json
import pathlib
import tarfile
import sys

REPOS = pathlib.Path(__file__).resolve().parents[3]
FILES = [
    'cogentia/scripts/super/broker.mjs',
    'cogentia/scripts/super/root-principal-effect-issue.mjs',
    'cogentia/scripts/super/principal-effect-issuer.mjs',
    'cogentia/scripts/super/root-maintenance-mandate.mjs',
    'cogentia/scripts/super/root-bounded-mcp-restart.mjs',
    'cogentia/scripts/super/root-super-prepare.mjs',
    'cogentia/scripts/super/root-effect-reconcile.mjs',
    'cogentia/scripts/lib/principal-super-effect-admission.js',
    'cogentia/scripts/lib/principal-super-effect-claim.js',
    'inseme/packages/cop-core/src/cop-event-envelope.js',
    'inseme/packages/cop-core/src/cop-event-spool.js',
    'inseme/packages/cop-core/src/execution-budget.js',
    'inseme/packages/cop-core/src/governed-act.js',
    'inseme/packages/cop-core/src/measured-risk.js',
    'inseme/packages/cop-core/src/resource-assessment.js',
    'inseme/packages/cop-core/src/sqlite-budget-projection.js',
    'inseme/packages/cop-core/src/sqlite-cop-event-store.js',
]
PREFIX = 'issuer/repos/'

def build(output):
    members={}
    for rel in FILES:
        file=(REPOS / rel)
        if file.is_symlink() or not file.is_file():
            raise ValueError('issuer_source_missing_or_symlink:' + rel)
        members[PREFIX + rel] = file.read_bytes()
    members[PREFIX+'cogentia/package.json']=b'{"type":"module","private":true}\n'
    members[PREFIX+'inseme/package.json']=b'{"type":"module","private":true}\n'
    manifest={"kind":"cogentia.root_principal_issuer_bundle/v1",
              "purpose":"source-only, non-authorizing install candidate",
              "files":{name:hashlib.sha256(contents).hexdigest() for name,contents in sorted(members.items())}}
    members['issuer/manifest.json']=(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()
    output=pathlib.Path(output)
    with output.open('wb') as out, gzip.GzipFile(fileobj=out,mode='wb',mtime=0,filename='') as gz:
        with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as archive:
            for name,data in sorted(members.items()):
                info=tarfile.TarInfo(name)
                info.uid=0;info.gid=0;info.uname='root';info.gname='root'
                info.mode=0o644;info.size=len(data);info.mtime=0
                archive.addfile(info,io.BytesIO(data))
    print(json.dumps({'bundle':str(output),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
                      'members':len(members),'install_performed':False},indent=2))

if __name__=='__main__':
    if len(sys.argv)!=2:sys.exit('usage: build-principal-issuer-bundle.py OUTPUT.tar.gz')
    build(sys.argv[1])
