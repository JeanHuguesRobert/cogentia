#!/usr/bin/env python3
"""Regression tests for corpus_velocity.py month labels and cutoffs."""
import importlib.util
import pathlib
import unittest
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
                   b"100644 blob cccccccccccccccccccccccccccccccccccccccc     8\tnode_modules/x.js\0")
        with patch.object(module, "git", return_value=listing):
            metrics = module.tree_metrics("/fake", "deadbeef")
        self.assertEqual(metrics["blobs"], 3)
        self.assertEqual(metrics["bytes"], 176)
        self.assertEqual(metrics["code_files"], 1)
        self.assertEqual(metrics["code_bytes"], 123)
        self.assertEqual(metrics["markdown_files"], 1)
        self.assertEqual(metrics["by_language"]["Python"]["bytes"], 123)

if __name__ == "__main__":
    unittest.main()
