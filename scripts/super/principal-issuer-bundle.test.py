#!/usr/bin/env python3
"""Nonprivileged unit checks of exact verified root-issuer install inputs."""
import hashlib, importlib.util, pathlib, tempfile, unittest

def module(filename,name):
    p=pathlib.Path(__file__).with_name(filename)
    spec=importlib.util.spec_from_file_location(name,p)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    return mod

build=module('build-principal-issuer-bundle.py','bundle_build')
verify=module('verify-principal-issuer-bundle.py','bundle_verify')
install=module('install-principal-issuer-bundle.py','bundle_install')

class BundleChecks(unittest.TestCase):
    def test_reproducible_archive_closure_and_tamper_rejection(self):
        with tempfile.TemporaryDirectory() as td:
            a=pathlib.Path(td)/'a.tar.gz';b=pathlib.Path(td)/'b.tar.gz'
            build.build(a);build.build(b)
            self.assertEqual(a.read_bytes(),b.read_bytes())
            digest=hashlib.sha256(a.read_bytes()).hexdigest()
            trusted=verify.verify_bundle(a,digest)
            self.assertTrue(trusted['ok'],trusted)
            self.assertIn('issuer/repos/cogentia/scripts/super/root-maintenance-mandate.mjs',trusted['members'])
            self.assertIn('issuer/repos/cogentia/scripts/super/root-super-prepare.mjs',trusted['members'])
            self.assertIn('issuer/repos/cogentia/scripts/super/root-bounded-mcp-restart.mjs',trusted['members'])
            self.assertIn('issuer/repos/cogentia/scripts/super/root-effect-reconcile.mjs',trusted['members'])
            corrupt=bytearray(a.read_bytes());corrupt[len(corrupt)//2]^=1
            a.write_bytes(corrupt)
            self.assertFalse(verify.verify_bundle(a,digest)['ok'])
            self.assertFalse(verify.verify_bundle(b,'0'*64)['ok'])
            # Construct an independently manifest-hashed v0 closure, not just
            # a renamed modern archive; the legacy verifier must accept it.
            import tarfile,io,json,gzip
            legacy=pathlib.Path(td)/'previous.tar.gz'
            with tarfile.open(b,'r:gz') as tar:
                members={m.name:tar.extractfile(m).read() for m in tar if m.isfile()}
            removed='issuer/repos/cogentia/scripts/super/root-bounded-mcp-restart.mjs'
            members.pop(removed)
            manifest=json.loads(members['issuer/manifest.json'])
            manifest['files'].pop(removed)
            members['issuer/manifest.json']=(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()
            with legacy.open('wb') as out, gzip.GzipFile(fileobj=out,mode='wb',mtime=0,filename='') as gz:
                with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as target:
                    for name,data in sorted(members.items()):
                        item=tarfile.TarInfo(name);item.uid=0;item.gid=0
                        item.mode=0o644;item.size=len(data);item.mtime=0
                        target.addfile(item,io.BytesIO(data))
            old_hash=hashlib.sha256(legacy.read_bytes()).hexdigest()
            self.assertFalse(install.verify_bundle(legacy,old_hash)['ok'])
            self.assertTrue(install.verify_bundle(legacy,old_hash,previous=True)['ok'])
            self.assertFalse(install.verify_bundle(b,digest,previous=True)['ok'])
    def test_partial_verified_root_source_can_be_completed_only_if_exact(self):
        import os
        with tempfile.TemporaryDirectory() as td:
            root=pathlib.Path(td)/'issuer';root.mkdir()
            members={'issuer/repos/cogentia/code.mjs':b'known',
                     'issuer/repos/inseme/module.js':b'module'}
            for name,data in members.items():
                path=root/pathlib.PurePosixPath(name).relative_to('issuer')
                path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
            verified={'members':members}
            self.assertTrue(install.verified_existing_stage(root,verified,owner_uid=os.getuid()))
            changed=root/'repos/cogentia/code.mjs';changed.write_bytes(b'altered')
            self.assertFalse(install.verified_existing_stage(root,verified,owner_uid=os.getuid()))
            changed.write_bytes(b'known')
            extra=root/'repos/cogentia/unexpected';extra.write_bytes(b'bad')
            self.assertFalse(install.verified_existing_stage(root,verified,owner_uid=os.getuid()))
            extra.unlink()
            changed.unlink();changed.symlink_to('/etc/hostname')
            self.assertFalse(install.verified_existing_stage(root,verified,owner_uid=os.getuid()))

    def test_existing_root_rollback_requires_pinned_bytes_and_previous_code(self):
        import os
        with tempfile.TemporaryDirectory() as td:
            backup=pathlib.Path(td)/'broker.mjs.pre-principal-issuer'
            backup.write_bytes(b'known-original-root-broker')
            backup.chmod(0o755)
            expected=hashlib.sha256(backup.read_bytes()).hexdigest()
            self.assertTrue(install.pinned_existing_rollback(backup,expected_sha=expected,owner_uid=os.getuid()))
            self.assertTrue(install.initial_install_recovery_gate(stage_matches_prior=True,
                broker_matches_prior=True,rollback_present=True,rollback_trusted=True))
            for key in ('stage_matches_prior','broker_matches_prior','rollback_trusted'):
                params=dict(stage_matches_prior=True,broker_matches_prior=True,rollback_present=True,rollback_trusted=True)
                params[key]=False
                self.assertFalse(install.initial_install_recovery_gate(**params),key)
            self.assertTrue(install.initial_install_recovery_gate(stage_matches_prior=False,
                broker_matches_prior=False,rollback_present=False,rollback_trusted=False))
            backup.write_bytes(b'tampered')
            self.assertFalse(install.pinned_existing_rollback(backup,expected_sha=expected,owner_uid=os.getuid()))
            backup.unlink();backup.symlink_to('/etc/hostname')
            self.assertFalse(install.pinned_existing_rollback(backup,expected_sha=expected,owner_uid=os.getuid()))

    def test_existing_principal_key_must_be_identical_and_protected(self):
        import os
        with tempfile.TemporaryDirectory() as td:
            p=pathlib.Path(td)/'principal-issuer.pub'
            rsa=b'ssh-rsa AAAAfictional-example principal-key\n'
            p.write_bytes(rsa);p.chmod(0o644)
            self.assertTrue(install.protected_existing_principal_key(p,rsa,owner_uid=os.getuid()))
            self.assertFalse(install.protected_existing_principal_key(p,rsa+b'x',owner_uid=os.getuid()))
            self.assertFalse(install.protected_existing_principal_key(p,rsa,owner_uid=os.getuid()+1))
            p.chmod(0o666)
            self.assertFalse(install.protected_existing_principal_key(p,rsa,owner_uid=os.getuid()))
            p.unlink();p.symlink_to('/etc/hostname')
            self.assertFalse(install.protected_existing_principal_key(p,rsa,owner_uid=os.getuid()))

    def test_without_root_activation_is_denied(self):
        import os
        if os.geteuid()==0:self.skipTest('root installer intentionally never exercised by automated tests')
        self.assertEqual(install.install({'members':{}},b'test')['error'],'root_required')

if __name__=='__main__':unittest.main()
