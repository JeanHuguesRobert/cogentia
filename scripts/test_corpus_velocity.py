#!/usr/bin/env python3
"""Regression tests for corpus_velocity.py month labels and cutoffs."""
import importlib.util
import pathlib
import unittest

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


if __name__ == "__main__":
    unittest.main()
