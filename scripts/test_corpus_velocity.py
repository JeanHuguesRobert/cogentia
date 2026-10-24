#!/usr/bin/env python3
"""Regression tests for corpus_velocity.py month labels and cutoffs."""
import importlib.util
import pathlib
import unittest
import json
import sys
import tempfile
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

MODULE = pathlib.Path(__file__).with_name("corpus_velocity.py")
spec = importlib.util.spec_from_file_location("corpus_velocity", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MonthEndTests(unittest.TestCase):
    def test_labels_match_measured_month(self):
        actual = list(module.month_ends("2025-10", "2026-01"))
        self.assertEqual(
            actual,
            [
                ("2025-10-31T23:59:59Z", "2025-10"),
                ("2025-11-30T23:59:59Z", "2025-11"),
                ("2025-12-31T23:59:59Z", "2025-12"),
                ("2026-01-31T23:59:59Z", "2026-01"),
            ],
        )



class TreeMetricsTests(unittest.TestCase):
    def test_padded_ls_tree_sizes_are_counted(self):
        # Git's --long format commonly contains two spaces before the size.
        listing = (b"100644 blob aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  123\tapp/main.py\0"
                   b"100644 blob bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb    45\tREADME.md\0"
                   b"100644 blob cccccccccccccccccccccccccccccccccccccccc     8\tnode_modules/x.js\0"
                   b"100644 blob dddddddddddddddddddddddddddddddddddddddd     9\ttests/check.test.js\0"
                   b"100644 blob eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee    10\tgenerated/index.md\0"
                   b"100644 blob ffffffffffffffffffffffffffffffffffffffff     6\tdocs/index.md\0")
        with patch.object(module, "git", return_value=listing):
            metrics = module.tree_metrics("/fake", "deadbeef")
        self.assertEqual(metrics["blobs"], 6)
        self.assertEqual(metrics["bytes"], 201)
        self.assertEqual(metrics["code_files"], 2)
        self.assertEqual(metrics["source_files"], 2)
        self.assertEqual(metrics["code_bytes"], 132)
        self.assertEqual(metrics["markdown_files"], 2)
        self.assertEqual(metrics["derived_markdown_files"], 1)
        self.assertEqual(metrics["test_files"], 1)
        self.assertEqual(metrics["excluded_files"], 2)
        self.assertEqual(metrics["by_language"]["Python"]["bytes"], 123)


    def test_unavailable_blob_size_must_not_be_reported_as_zero(self):
        listing = (b"100644 blob aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa     -\tapp/main.py\0")
        with patch.object(module, "git", return_value=listing):
            with self.assertRaisesRegex(ValueError, "blob size unavailable"):
                module.tree_metrics("/fake", "deadbeef")



class CoverageTests(unittest.TestCase):
    def test_missing_and_excluded_have_one_row_per_month(self):
        with tempfile.TemporaryDirectory() as root:
            registry = pathlib.Path(root) / "registry.json"
            registry.write_text(json.dumps({"repositories": [
                {"name": "example/missing", "path": "absent", "visibility": "public"},
                {"name": "example/excluded", "path": "private", "visibility": "private"},
            ]}))
            out = pathlib.Path(root) / "result"
            args = ["corpus_velocity.py", "--registry", str(registry),
                    "--root", root, "--out", str(out), "--start", "2025-10", "--end", "2025-11"]
            with patch.object(sys, "argv", args), redirect_stdout(StringIO()):
                module.main()
            result = json.loads((out / "corpus-velocity.json").read_text())
            rows = result["metrics"]
            self.assertTrue(result["generated_at"].endswith("+00:00"))
            self.assertEqual(len(result["registry_sha256"]), 64)
            self.assertEqual(result["record_count"], 4)
            self.assertEqual(result["status_counts"], {"missing": 2, "excluded": 2})
            self.assertNotIn(b"\r\n", (out / "corpus-velocity.csv").read_bytes())
            self.assertEqual(len(rows), 4)
            self.assertEqual({r["period"] for r in rows}, {"2025-10", "2025-11"})
            self.assertEqual(sorted(r["status"] for r in rows),
                             ["excluded", "excluded", "missing", "missing"])

    def test_future_month_is_flagged_partial(self):
        with tempfile.TemporaryDirectory() as root:
            checkout = pathlib.Path(root) / "checkout"
            (checkout / ".git").mkdir(parents=True)
            registry = pathlib.Path(root) / "registry.json"
            registry.write_text(json.dumps({"repositories": [
                {"name": "example/public", "path": "checkout", "visibility": "public"}
            ]}))
            out = pathlib.Path(root) / "result"
            args = ["corpus_velocity.py", "--registry", str(registry),
                    "--root", str(pathlib.Path(root)), "--out", str(out),
                    "--start", "2099-01", "--end", "2099-01"]
            with patch.object(sys, "argv", args), patch.object(
                    module, "git", side_effect=[b"deadbeef\\n", b""]), redirect_stdout(StringIO()):
                module.main()
            rows = json.loads((out / "corpus-velocity.json").read_text())["metrics"]
            self.assertEqual(len(rows), 1)
            self.assertTrue(rows[0]["partial"])
            self.assertEqual(rows[0]["period"], "2099-01")

if __name__ == "__main__":
    unittest.main()
