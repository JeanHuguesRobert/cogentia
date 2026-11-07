"""Isolated fake-root store test. NEVER touches production grant or COP DB."""
import importlib.util
import json
import pathlib
import stat
import tempfile
import types
import unittest
from unittest.mock import patch

SRC = pathlib.Path(__file__).with_name('issue-one-shot-probe-root.py')
spec = importlib.util.spec_from_file_location('isolated_probe_root_issuer', SRC)
issuer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(issuer)


class RootIssuerTest(unittest.TestCase):
    def test_one_grant_only_with_pinned_effect(self):
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d) / 'root-owned-fixture'
            root.mkdir(mode=0o700)
            store = root / 'authorizations.json'
            store.write_text(json.dumps({'grants': {}}))
            store.chmod(0o600)
            receipt = pathlib.Path(d) / 'fixture-receipt.json'
            true_lstat = pathlib.Path.lstat

            def trusted_lstat(path):
                s = true_lstat(path)
                if pathlib.Path(path) in (root, store):
                    return types.SimpleNamespace(st_uid=0, st_gid=0, st_mode=s.st_mode)
                return s

            with patch.object(issuer, 'ROOT_DIR', root), patch.object(issuer, 'ROOT_STORE', store), \
                 patch.object(issuer, 'RECEIPT', receipt), patch.object(issuer.os, 'geteuid', return_value=0), \
                 patch.object(issuer.os, 'chown'), patch.object(pathlib.Path, 'lstat', trusted_lstat), \
                 patch.object(issuer, 'verify_proposal', return_value=({}, 'test-signed-proof')), \
                 patch.object(issuer, 'verify_reserved_budget'):
                issuer.issue()
                row = json.loads(receipt.read_text())
                grant = json.loads(store.read_text())['grants'][row['authorization_id']]
                self.assertEqual(grant['authority_origin'], 'principal')
                self.assertEqual(grant['payload_hash'], issuer.EFFECT_HASH)
                self.assertEqual(grant['mandate_ref'], issuer.MANDATE)
                self.assertTrue(grant['single_use'])
                self.assertEqual(grant['budget_reservation_id'], issuer.RESERVATION)
                with self.assertRaisesRegex(RuntimeError, 'probe_already_granted'):
                    issuer.issue()
                self.assertEqual(len(json.loads(store.read_text())['grants']), 1)


if __name__ == '__main__':
    unittest.main()
