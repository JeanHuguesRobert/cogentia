#!/usr/bin/env python3
"""Inspect or explicitly install a pinned, root-owned COP issuer bundle.

Review/dry-run needs no privilege. `--activate` deliberately requires root,
two independently supplied fingerprints, and installs NO authority by itself.
"""
import argparse, hashlib, io, json, os, pathlib, shutil, subprocess, sys, tarfile, tempfile

# Deliberately self-contained: this audited installer can be streamed into
# `sudo python3 -` directly FROM THE PRINCIPAL'S THINKPAD over SSH. It does not
# execute/import any code from the ubuntu-writable server checkout as root.
EXPECTED={
    'issuer/manifest.json',
    'issuer/repos/cogentia/package.json',
    'issuer/repos/inseme/package.json',
    'issuer/repos/cogentia/scripts/super/broker.mjs',
    'issuer/repos/cogentia/scripts/super/root-principal-effect-issue.mjs',
    'issuer/repos/cogentia/scripts/super/principal-effect-issuer.mjs',
    'issuer/repos/cogentia/scripts/super/root-maintenance-mandate.mjs',
    'issuer/repos/cogentia/scripts/super/root-bounded-mcp-restart.mjs',
    'issuer/repos/cogentia/scripts/super/root-super-prepare.mjs',
    'issuer/repos/cogentia/scripts/super/root-effect-reconcile.mjs',
    'issuer/repos/cogentia/scripts/lib/principal-super-effect-admission.js',
    'issuer/repos/cogentia/scripts/lib/principal-super-effect-claim.js',
    'issuer/repos/inseme/packages/cop-core/src/cop-event-envelope.js',
    'issuer/repos/inseme/packages/cop-core/src/cop-event-spool.js',
    'issuer/repos/inseme/packages/cop-core/src/execution-budget.js',
    'issuer/repos/inseme/packages/cop-core/src/governed-act.js',
    'issuer/repos/inseme/packages/cop-core/src/measured-risk.js',
    'issuer/repos/inseme/packages/cop-core/src/resource-assessment.js',
    'issuer/repos/inseme/packages/cop-core/src/sqlite-budget-projection.js',
    'issuer/repos/inseme/packages/cop-core/src/sqlite-cop-event-store.js',
}
PREVIOUS_EXPECTED=EXPECTED-{'issuer/repos/cogentia/scripts/super/root-bounded-mcp-restart.mjs'}
def verify_bundle(filename, expected_sha, *, previous=False):
    required=PREVIOUS_EXPECTED if previous else EXPECTED
    raw=pathlib.Path(filename).read_bytes()
    digest=hashlib.sha256(raw).hexdigest()
    if len(expected_sha)!=64 or digest!=expected_sha:return {'ok':False,'error':'archive_hash_mismatch'}
    members={}
    try:
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
            for m in archive:
                if not m.isfile() or m.name in members or m.name not in required or m.size>1_000_000 or \
                   m.uid!=0 or m.gid!=0 or m.mode!=0o644:
                    return {'ok':False,'error':'unsafe_archive_member'}
                members[m.name]=archive.extractfile(m).read()
    except (tarfile.TarError,EOFError,ValueError):return {'ok':False,'error':'archive_invalid'}
    if set(members)!=required:return {'ok':False,'error':'manifest_member_mismatch'}
    try:manifest=json.loads(members.pop('issuer/manifest.json'))
    except (ValueError,UnicodeError):return {'ok':False,'error':'manifest_invalid'}
    if manifest.get('kind')!='cogentia.root_principal_issuer_bundle/v1' or \
       manifest.get('files')!={name:hashlib.sha256(data).hexdigest() for name,data in sorted(members.items())}:
        return {'ok':False,'error':'manifest_hash_mismatch'}
    return {'ok':True,'sha256':digest,'members':members,'manifest':manifest}

BASE=pathlib.Path('/usr/local/libexec/cogentia-super')
BUNDLE_DIR=BASE/'issuer'
KEY_DIR=pathlib.Path('/etc/cogentia-super')
KEY=KEY_DIR/'principal-issuer.pub'
STATE=pathlib.Path('/var/lib/cogentia-super')
COP=STATE/'canonical-authority.sqlite'
BROKER=BASE/'broker.mjs'
BACKUP=BASE/'broker.mjs.pre-principal-issuer'
# Independently observed pre-issuer rollback image on Fracta2. An existing
# backup is accepted ONLY if this exact root-owned image is still intact;
# never overwrite or silently trust an arbitrary file under this name.
PRIOR_ROLLBACK_SHA256='a8cee53ef7f3267b47a68349bef472ca347f96b6a022b366c0125ea6c76cb235'
GRANTS=STATE/'authorizations.json'
NODE='/usr/local/node-v26.5.0/bin/node'

def protected_dir(dirname):
    if not dirname.is_dir() or dirname.is_symlink():return False
    st=dirname.stat()
    return st.st_uid==0 and st.st_mode&0o022==0

def install_file(dest,data,mode=0o644):
    fd,name=tempfile.mkstemp(prefix='.issuer-',dir=dest.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(data);f.flush();os.fsync(f.fileno())
        os.chmod(name,mode);os.chown(name,0,0)
        os.replace(name,dest)
    finally:
        if os.path.exists(name):os.unlink(name)

def verified_existing_stage(directory,verified,owner_uid=0):
    """Accept an existing root-owned staged source tree only by exact bytes.

    This validates code; it does not enroll a Principal or grant permission.
    """
    if not directory.is_dir() or directory.is_symlink() or directory.stat().st_uid!=owner_uid or directory.stat().st_mode&0o022:return False
    expected={str(pathlib.PurePosixPath(name).relative_to('issuer')):data
              for name,data in verified['members'].items()}
    actual={}
    for item in directory.rglob('*'):
        if item.is_symlink() or item.stat().st_uid!=owner_uid or item.stat().st_mode&0o022:
            return False
        if item.is_file():actual[str(item.relative_to(directory))]=item
        elif not item.is_dir():return False
    return set(actual)==set(expected) and all(
        hashlib.sha256(actual[name].read_bytes()).digest()==hashlib.sha256(data).digest()
        for name,data in expected.items())

def pinned_existing_rollback(path,expected_sha=PRIOR_ROLLBACK_SHA256,owner_uid=0):
    if not path.is_file() or path.is_symlink():return False
    st=path.stat()
    if st.st_uid!=owner_uid or st.st_mode&0o022 or st.st_mode&0o777!=0o755:return False
    return hashlib.sha256(path.read_bytes()).hexdigest()==expected_sha

def initial_install_recovery_gate(*,stage_matches_prior,broker_matches_prior,rollback_present,rollback_trusted):
    # A previous root-owned rollback is legitimate only with a matched staged
    # historical issuer AND the exact original live broker. No permissions are
    # inferred from the backup alone. This gate cannot issue a mandate.
    if not rollback_present:return True
    return bool(stage_matches_prior and broker_matches_prior and rollback_trusted)

def install(verified,keydata,allow_verified_stage=False,previous_verified=None):
    if os.geteuid()!=0:return {'ok':False,'error':'root_required'}
    if not protected_dir(BASE) or not protected_dir(STATE):return {'ok':False,'error':'root_directories_not_protected'}
    reuse_stage=BUNDLE_DIR.exists() and allow_verified_stage and verified_existing_stage(BUNDLE_DIR,verified)
    replace_reviewed=BUNDLE_DIR.exists() and allow_verified_stage and not reuse_stage and previous_verified is not None and verified_existing_stage(BUNDLE_DIR,previous_verified)
    previous_dir=BUNDLE_DIR.with_name('issuer.pre-initial-completion')
    if not BROKER.is_file() or BROKER.is_symlink() or BROKER.stat().st_uid!=0 or BROKER.stat().st_mode&0o022:
        return {'ok':False,'error':'broker_not_root_owned'}
    old_broker_sha=hashlib.sha256(BROKER.read_bytes()).hexdigest()
    old_archive_broker_sha=hashlib.sha256(previous_verified['members']['issuer/repos/cogentia/scripts/super/broker.mjs']).hexdigest() if previous_verified else None
    stage_matches_prior=bool(replace_reviewed)
    broker_matches_prior=bool(old_archive_broker_sha and old_broker_sha==old_archive_broker_sha)
    rollback_trusted=pinned_existing_rollback(BACKUP) if BACKUP.exists() else False
    if (BUNDLE_DIR.exists() and not reuse_stage and not replace_reviewed) or (replace_reviewed and previous_dir.exists()) or KEY.exists():
        return {'ok':False,'error':'already_initialized_review_manually'}
    if not initial_install_recovery_gate(stage_matches_prior=stage_matches_prior,
            broker_matches_prior=broker_matches_prior,rollback_present=BACKUP.exists(),rollback_trusted=rollback_trusted):
        return {'ok':False,'error':'existing_rollback_not_trusted_or_previous_broker_mismatch'}
    if GRANTS.exists() and (GRANTS.is_symlink() or GRANTS.stat().st_uid!=0 or GRANTS.stat().st_mode&0o077):
        return {'ok':False,'error':'grant_store_not_protected'}
    if COP.exists() and (COP.is_symlink() or COP.stat().st_uid!=0 or COP.stat().st_mode&0o077):
        return {'ok':False,'error':'existing_cop_store_not_protected'}
    KEY_DIR.mkdir(mode=0o700,parents=False,exist_ok=True)
    if not protected_dir(KEY_DIR):return {'ok':False,'error':'trusted_key_dir_invalid'}
    # Install from exact pinned bytes, or reuse a previously staged exact tree.
    # Never execute/import a mutable checkout under root.
    if not reuse_stage:
        stage=pathlib.Path(tempfile.mkdtemp(prefix='.issuer-stage-',dir=BASE))
        try:
            for name,data in verified['members'].items():
                target=stage/pathlib.PurePosixPath(name).relative_to('issuer')
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(data)
                os.chmod(target,0o644)
            for folder in [stage,*stage.rglob('*')]:
                if folder.is_dir():os.chmod(folder,0o755)
            if replace_reviewed:
                os.replace(BUNDLE_DIR,previous_dir)
            try:os.replace(stage,BUNDLE_DIR)
            except:
                if replace_reviewed and previous_dir.exists() and not BUNDLE_DIR.exists():
                    os.replace(previous_dir,BUNDLE_DIR)
                raise
        finally:
            if stage.exists():shutil.rmtree(stage)
    install_file(KEY,keydata,0o644)
    if not GRANTS.exists():install_file(GRANTS,b'{"grants":{}}\n',0o600)
    if not COP.exists():
        src=BUNDLE_DIR/'repos/inseme/packages/cop-core/src/sqlite-cop-event-store.js'
        node_script=(f"import({json.dumps(src.as_uri())}).then(m=>{{const s=m.createSqliteCopEventStore({json.dumps(str(COP))});s.close()}})")
        subprocess.run([NODE,'--input-type=module','-e',node_script],check=True,timeout=15)
        os.chmod(COP,0o600)
    elif COP.is_symlink() or COP.stat().st_uid!=0 or COP.stat().st_mode&0o077:
        return {'ok':False,'error':'existing_cop_store_not_protected'}
    # Never overwrite the pre-existing root-owned rollback record.
    if not BACKUP.exists():install_file(BACKUP,BROKER.read_bytes(),0o755)
    new_broker=verified['members']['issuer/repos/cogentia/scripts/super/broker.mjs']
    install_file(BROKER,new_broker,0o755)
    restarted=subprocess.run(['systemctl','restart','cogentia-super.service'],capture_output=True,text=True,timeout=20)
    active=subprocess.run(['systemctl','is-active','cogentia-super.service'],capture_output=True,text=True,timeout=8)
    return {'ok':restarted.returncode==0 and active.returncode==0,'phase':'ISSUER_INSTALLED_NO_MANDATE_ISSUED',
            'broker_active':active.stdout.strip()=='active','cop_store_created':True,
            'rollback_broker':str(BACKUP),'required_next':'independently_signed_principal_mandate_bootstrap'}

def upgrade(verified):
    """Upgrade root-owned *code only*; never mutate Principal keys or COP."""
    if os.geteuid()!=0:return {'ok':False,'error':'root_required'}
    if not protected_dir(BASE) or not protected_dir(STATE) or not protected_dir(BUNDLE_DIR):
        return {'ok':False,'error':'root_directories_not_protected'}
    if not protected_dir(KEY_DIR) or not KEY.is_file() or KEY.is_symlink() or KEY.stat().st_uid!=0:
        return {'ok':False,'error':'trusted_principal_key_missing'}
    if not BROKER.is_file() or BROKER.is_symlink() or BROKER.stat().st_uid!=0 or not BACKUP.is_file():
        return {'ok':False,'error':'broker_rollback_missing'}
    if not COP.is_file() or COP.is_symlink() or COP.stat().st_uid!=0 or COP.stat().st_mode&0o077:
        return {'ok':False,'error':'canonical_root_cop_missing'}
    if not GRANTS.is_file() or GRANTS.is_symlink() or GRANTS.stat().st_uid!=0 or GRANTS.stat().st_mode&0o077:
        return {'ok':False,'error':'canonical_root_grants_missing'}
    # Keep the pre-upgrade broker and source tree for independent rollback.
    previous=BUNDLE_DIR.with_name('issuer.pre-reconciliation')
    previous_broker=BROKER.with_name('broker.mjs.pre-reconciliation')
    if previous.exists() or previous_broker.exists():return {'ok':False,'error':'upgrade_already_attempted'}
    stage=pathlib.Path(tempfile.mkdtemp(prefix='.issuer-upgrade-',dir=BASE))
    try:
        for name,data in verified['members'].items():
            target=stage/pathlib.PurePosixPath(name).relative_to('issuer')
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data);os.chmod(target,0o644)
        for folder in [stage,*stage.rglob('*')]:
            if folder.is_dir():os.chmod(folder,0o755)
        os.replace(BUNDLE_DIR,previous)
        os.replace(stage,BUNDLE_DIR)
    finally:
        if stage.exists():shutil.rmtree(stage)
    install_file(previous_broker,BROKER.read_bytes(),0o755)
    install_file(BROKER,verified['members']['issuer/repos/cogentia/scripts/super/broker.mjs'],0o755)
    restarted=subprocess.run(['systemctl','restart','cogentia-super.service'],capture_output=True,text=True,timeout=20)
    active=subprocess.run(['systemctl','is-active','cogentia-super.service'],capture_output=True,text=True,timeout=8)
    if restarted.returncode!=0 or active.stdout.strip()!='active':
        # Best-effort rollback; preserve the COP database and keys untouched.
        install_file(BROKER,previous_broker.read_bytes(),0o755)
        failed=BUNDLE_DIR.with_name('issuer.failed-upgrade')
        os.replace(BUNDLE_DIR,failed)
        os.replace(previous,BUNDLE_DIR)
        subprocess.run(['systemctl','restart','cogentia-super.service'],timeout=20)
        return {'ok':False,'error':'broker_upgrade_failed_rolled_back'}
    return {'ok':True,'phase':'ROOT_ISSUER_UPGRADED_NO_NEW_MANDATE',
      'broker_active':True,'cop_preserved':True,'principal_key_preserved':True,
      'previous_broker':str(previous_broker),'previous_source':str(previous)}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--bundle',required=True)
    parser.add_argument('--sha256',required=True)
    parser.add_argument('--pubkey',required=True)
    parser.add_argument('--pubkey-sha256',required=True)
    parser.add_argument('--activate',action='store_true')
    parser.add_argument('--upgrade',action='store_true')
    parser.add_argument('--resume-verified-stage',action='store_true')
    parser.add_argument('--previous-bundle')
    parser.add_argument('--previous-sha256')
    args=parser.parse_args()
    result=verify_bundle(args.bundle,args.sha256)
    if not result['ok']:print(json.dumps(result));return 1
    key=pathlib.Path(args.pubkey).read_bytes()
    key_hash=hashlib.sha256(key).hexdigest()
    lines=key.strip().splitlines()
    parts=lines[0].split() if len(lines)==1 else []
    if key_hash!=args.pubkey_sha256 or len(key)>4096 or len(parts)<2 or \
       parts[0] not in (b'ssh-ed25519',b'ssh-rsa') or not parts[1] or \
       subprocess.run(['ssh-keygen','-lf',args.pubkey],capture_output=True,timeout=5).returncode!=0:
        print(json.dumps({'ok':False,'error':'principal_key_fingerprint_mismatch'}));return 1
    summary={'ok':True,'bundle_sha256':result['sha256'],'key_sha256':key_hash,'files':len(result['members']),
             'phase':'DRY_RUN_NO_INSTALL' if not args.activate else 'EXPLICIT_ROOT_ACTIVATION'}
    if (args.activate and args.upgrade) or (args.resume_verified_stage and not args.activate) or bool(args.previous_bundle)!=bool(args.previous_sha256) or (args.previous_bundle and not args.resume_verified_stage):
        print(json.dumps({'ok':False,'error':'mutually_exclusive_activation_modes'}));return 1
    if not (args.activate or args.upgrade):print(json.dumps(summary,indent=2));return 0
    previous=None
    if args.previous_bundle:
        previous=verify_bundle(args.previous_bundle,args.previous_sha256,previous=True)
        if not previous['ok']:
            print(json.dumps({'ok':False,'error':'previous_archive_unverified'}));return 1
    outcome=upgrade(result) if args.upgrade else install(result,key,allow_verified_stage=args.resume_verified_stage,previous_verified=previous)
    print(json.dumps(outcome,indent=2));return 0 if outcome['ok'] else 1

if __name__=='__main__':sys.exit(main())
