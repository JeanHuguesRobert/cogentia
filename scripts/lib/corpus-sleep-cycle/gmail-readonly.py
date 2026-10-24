#!/usr/bin/env python3
"""Bounded Gmail IMAP metadata reader. No message bodies or mailbox mutations.

Protocol: private JSON request on stdin, private JSON response on stdout.
Credentials stay in the systemd credential file, never argv/stdout/errors.
References: developers.google.com/workspace/gmail/imap/imap-extensions;
RFC 9051 EXAMINE and BODY.PEEK. No third-party Python packages.
"""
import datetime
import email
import imaplib
import json
import os
import pathlib
import re
import sys


def read_cases(client, requests, through, max_messages=80):
    result = []
    mailbox_list = client.list()[1]
    all_mail = next((re.search(rb'"([^"\r\n]+)"\s*$', line).group(1).decode()
                     for line in mailbox_list if line and b"\\All" in line
                     and re.search(rb'"([^"\r\n]+)"\s*$', line)), None)
    if not all_mail:
        raise PermissionError()
    if client.select('"' + all_mail.replace('"', '\\"') + '"', readonly=True)[0] != "OK":
        raise PermissionError()
    for request in requests:
        anchor = request.get("sent_id", "")
        if not re.fullmatch(r"[a-fA-F0-9]{8,32}", anchor):
            result.append({"key": request["key"], "events": [], "complete": False, "code": "SOURCE_LOCATOR_MISSING"})
            continue
        status, data = client.uid("SEARCH", None, "X-GM-MSGID", str(int(anchor, 16)))
        uids = data[0].split() if status == "OK" and data and data[0] else []
        if len(uids) != 1:
            result.append({"key": request["key"], "events": [], "complete": False, "code": "ANCHOR_NOT_FOUND"})
            continue
        status, data = client.uid("FETCH", uids[0], "(X-GM-THRID)")
        thread = re.search(rb"X-GM-THRID (\d+)", b" ".join(x for x in data if isinstance(x, bytes))) if status == "OK" else None
        if not thread:
            raise RuntimeError()
        since = datetime.datetime.fromisoformat(request.get("since", "1970-01-01T00:00:00Z").replace("Z", "+00:00"))
        upper = datetime.datetime.fromisoformat(through.replace("Z", "+00:00")) + datetime.timedelta(days=1)
        status, data = client.uid("SEARCH", None, "X-GM-THRID", thread.group(1).decode(), "SINCE", since.strftime("%d-%b-%Y"), "BEFORE", upper.strftime("%d-%b-%Y"))
        if status != "OK":
            raise RuntimeError()
        found = list(dict.fromkeys(uids + (data[0].split() if data and data[0] else [])))
        complete = len(found) <= max_messages
        events = []
        for uid in found[:max_messages]:
            status, chunks = client.uid("FETCH", uid, "(X-GM-MSGID X-GM-LABELS INTERNALDATE BODY.PEEK[HEADER.FIELDS (DATE AUTO-SUBMITTED CONTENT-TYPE)])")
            if status != "OK":
                complete = False
                continue
            for chunk in chunks:
                if not isinstance(chunk, tuple):
                    continue
                descriptor, headers = chunk
                if len(headers) > 32768:
                    complete = False
                    continue
                msgid = re.search(rb"X-GM-MSGID (\d+)", descriptor)
                internal = re.search(rb'INTERNALDATE "([^"]+)"', descriptor)
                if not msgid or not internal:
                    complete = False
                    continue
                ref = format(int(msgid.group(1)), "x")
                # INTERNALDATE is provider receipt time, separate from sender Date.
                at = datetime.datetime.strptime(internal.group(1).decode(), "%d-%b-%Y %H:%M:%S %z").isoformat()
                if datetime.datetime.fromisoformat(at) > datetime.datetime.fromisoformat(through.replace("Z", "+00:00")):
                    continue
                parsed = email.message_from_bytes(headers)
                known = request.get("known_kinds", {}).get(ref)
                allowed = {"auto_ack", "human_reply", "substantive_reply", "refusal", "partial_delivery_failure", "delivery_failure", "document_receipt", "delivery", "followup_sent"}
                kind = "sent" if ref == anchor.lower() else known if known in allowed else "followup_sent" if b"\\Sent" in descriptor else "inbound_unclassified"
                # Classification is source-reviewed or left unknown; headers alone
                # cannot prove human authorship, acknowledgement or resolution.
                events.append({"ref": ref, "kind": kind, "at": at, "match": "confirmed", "time_basis": "gmail_internaldate"})
        result.append({"key": request["key"], "events": events, "complete": complete,
                       "code": "THREAD_METADATA_OBSERVED" if complete else "THREAD_TRUNCATED",
                       "coverage": "gmail_all_mail_excludes_spam_trash"})
    return result


def main():
    client = None
    phase = "credentials"
    try:
        request = json.loads(sys.stdin.read(1048576))
        cases = request.get("cases", [])
        if len(cases) > 50 or not isinstance(cases, list):
            raise ValueError()
        user = os.environ["INTERACTION_GMAIL_USER"]
        credential = os.environ.get("INTERACTION_GMAIL_PASSWORD_FILE") or str(pathlib.Path(os.environ["CREDENTIALS_DIRECTORY"]) / "gmail-password")
        password = pathlib.Path(credential).read_text().strip()
        phase = "authentication"
        client = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=10)
        client.login(user, password)
        password = None
        phase = "metadata"
        result = read_cases(client, cases, request["through"])
        print(json.dumps({"status": "COMPLETED", "cases": result}))
    except (KeyError, FileNotFoundError, PermissionError):
        print(json.dumps({"status": "BLOCKED_SECURITY", "code": "GMAIL_CREDENTIALS_UNAVAILABLE", "phase": phase}))
    except imaplib.IMAP4.error:
        print(json.dumps({"status": "BLOCKED_SECURITY" if phase == "authentication" else "PARTIAL", "code": "GMAIL_IMAP_AUTH_DENIED" if phase == "authentication" else "GMAIL_IMAP_READ_FAILED", "phase": phase}))
    except Exception:
        print(json.dumps({"status": "PARTIAL", "code": "GMAIL_METADATA_READ_FAILED"}))
    finally:
        if client:
            try:
                client.logout()
            except Exception:
                pass


if __name__ == "__main__":
    main()
