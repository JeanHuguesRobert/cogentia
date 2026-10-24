#!/usr/bin/env python3
"""Offline grouping test; does not call GitHub or the gh CLI."""
import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).with_name("corpus_velocity_github.py")
spec = importlib.util.spec_from_file_location("corpus_velocity_github", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class GithubGroupingTests(unittest.TestCase):
    def test_groups_issue_and_pr_creation_by_utc_month(self):
        output = (
            "2025-10-01T00:00:00Z\tfalse\n"
            "2025-10-31T23:59:59Z\ttrue\n"
            "2025-11-01T00:00:00Z\tfalse\n"
            "2026-01-01T00:00:00Z\ttrue\n"
        )
        rows = module.count_created_records("example/public", output,
                                            ["2025-10", "2025-11", "2025-12"])
        self.assertEqual(rows, [
            {"repo": "example/public", "period": "2025-10", "status": "ok",
             "issues_created": 1, "pull_requests_created": 1},
            {"repo": "example/public", "period": "2025-11", "status": "ok",
             "issues_created": 1, "pull_requests_created": 0},
            {"repo": "example/public", "period": "2025-12", "status": "ok",
             "issues_created": 0, "pull_requests_created": 0},
        ])

    def test_rejects_unexpected_api_projection_rows(self):
        with self.assertRaisesRegex(ValueError, "unexpected GitHub issue metadata row"):
            module.count_created_records("example/public", "bad row", ["2025-10"])


if __name__ == "__main__":
    unittest.main()
