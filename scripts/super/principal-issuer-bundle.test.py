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
            corrupt=bytearray(a.read_bytes());corrupt[len(corrupt)//2]^=1
            a.write_bytes(corrupt)
            self.assertFalse(verify.verify_bundle(a,digest)['ok'])
            self.assertFalse(verify.verify_bundle(b,'0'*64)['ok'])
    def test_without_root_activation_is_denied(self):
        import os
        if os.geteuid()==0:self.skipTest('root installer intentionally never exercised by automated tests')
        self.assertEqual(install.install({'members':{}},b'test')['error'],'root_required')

if __name__=='__main__':unittest.main()
