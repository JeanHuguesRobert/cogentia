#!/usr/bin/env python3
"""Strict, non-installing archive verification for Principal COP root issuer."""
import hashlib, io, json, pathlib, sys, tarfile
# Run from an audited script copy. No extraction and no execution of archive contents.
FILES = [
    'cogentia/scripts/super/broker.mjs',
    'cogentia/scripts/super/root-principal-effect-issue.mjs',
    'cogentia/scripts/super/principal-effect-issuer.mjs',
    'cogentia/scripts/super/root-maintenance-mandate.mjs',
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
PREFIX='issuer/repos/'

EXPECTED=set([PREFIX+name for name in FILES]+[
    PREFIX+'cogentia/package.json',PREFIX+'inseme/package.json','issuer/manifest.json'])


def verify_bundle(filename, expected_sha):
    raw=pathlib.Path(filename).read_bytes()
    digest=hashlib.sha256(raw).hexdigest()
    if len(expected_sha)!=64 or digest!=expected_sha:return {'ok':False,'error':'archive_hash_mismatch'}
    members={}
    try:
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
            for m in archive:
                if not m.isfile() or m.name in members or m.name not in EXPECTED or m.size>1_000_000 or \
                   m.uid!=0 or m.gid!=0 or m.mode!=0o644:
                    return {'ok':False,'error':'unsafe_archive_member'}
                members[m.name]=archive.extractfile(m).read()
    except (tarfile.TarError,EOFError,ValueError):return {'ok':False,'error':'archive_invalid'}
    if set(members)!=EXPECTED:return {'ok':False,'error':'manifest_member_mismatch'}
    try:manifest=json.loads(members.pop('issuer/manifest.json'))
    except (ValueError,UnicodeError):return {'ok':False,'error':'manifest_invalid'}
    if manifest.get('kind')!='cogentia.root_principal_issuer_bundle/v1' or \
       manifest.get('files')!={name:hashlib.sha256(data).hexdigest() for name,data in sorted(members.items())}:
        return {'ok':False,'error':'manifest_hash_mismatch'}
    return {'ok':True,'sha256':digest,'members':members,'manifest':manifest}

if __name__=='__main__':
    if len(sys.argv)!=3:sys.exit('usage: verify-principal-issuer-bundle.py ARCHIVE SHA256')
    answer=verify_bundle(sys.argv[1],sys.argv[2]);answer.pop('members',None)
    print(json.dumps(answer,indent=2));sys.exit(0 if answer['ok'] else 1)
