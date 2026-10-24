"""Protocol regression for the real metadata adapter; no account access."""
import importlib.util
import pathlib
import sys
import unittest

sys.dont_write_bytecode = True

source = pathlib.Path(__file__).parent / "lib/corpus-sleep-cycle/gmail-readonly.py"
spec = importlib.util.spec_from_file_location("gmail_readonly", source)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class FakeImap:
    def __init__(self):
        self.commands = []

    def list(self):
        return "OK", [b'(\\HasNoChildren \\All) "/" "[Gmail]/All Mail"']

    def select(self, mailbox, readonly=False):
        assert readonly is True
        return "OK", [b"2"]

    def uid(self, operation, *args):
        self.commands.append((operation, args))
        if operation == "SEARCH":
            return "OK", [b"1" if "X-GM-MSGID" in args else b"1 2"]
        if args[1] == "(X-GM-THRID)":
            return "OK", [b"1 (X-GM-THRID 100)"]
        assert "BODY.PEEK" in args[1]
        ref = 0x1234567890abcdef if args[0] == b"1" else 0x1234567890abcdee
        return "OK", [(f'1 (X-GM-MSGID {ref} INTERNALDATE "22-Oct-2026 08:00:00 +0000")'.encode(), b"Date: Thu, 22 Oct 2026 08:00:00 +0000\r\n\r\n")]


class ReadOnlyTests(unittest.TestCase):
    def test_exact_anchor_and_reviewed_ack_without_body_or_flags(self):
        client = FakeImap()
        result = adapter.read_cases(client, [{"key": "fiction", "sent_id": "1234567890abcdef", "known_kinds": {"1234567890abcdee": "auto_ack"}}], "2026-10-24T00:00:00Z")
        self.assertEqual([event["kind"] for event in result[0]["events"]], ["sent", "auto_ack"])
        self.assertTrue(all(command[0] in ("SEARCH", "FETCH") for command in client.commands))
        self.assertEqual(result[0]["events"][0]["time_basis"], "gmail_internaldate")

    def test_unclassified_message_is_not_assumed_human_or_substantive(self):
        result = adapter.read_cases(FakeImap(), [{"key": "fiction", "sent_id": "1234567890abcdef"}], "2026-10-24T00:00:00Z")
        self.assertEqual(result[0]["events"][1]["kind"], "inbound_unclassified")

    def test_missing_locator_is_not_a_no_reply_result(self):
        result = adapter.read_cases(FakeImap(), [{"key": "fiction", "sent_id": ""}], "2026-10-24T00:00:00Z")
        self.assertEqual(result[0]["code"], "SOURCE_LOCATOR_MISSING")
        self.assertFalse(result[0]["complete"])

    def test_truncation_preserves_incomplete_scope(self):
        result = adapter.read_cases(FakeImap(), [{"key": "fiction", "sent_id": "1234567890abcdef"}], "2026-10-24T00:00:00Z", max_messages=1)
        self.assertFalse(result[0]["complete"])
        self.assertEqual(len(result[0]["events"]), 1)


if __name__ == "__main__":
    unittest.main()
