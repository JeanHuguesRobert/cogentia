#!/usr/bin/env python3
"""Idempotent Yahoo IMAP -> Gmail IMAP APPEND; no SMTP, no Supabase.

Two independently stored app passwords are needed. This collector never
sends mail, deletes Yahoo messages, logs message content or writes secrets.
It stores only imported Yahoo UID and UIDVALIDITY in a private local SQLite DB.
"""
import argparse
import email
import imaplib
import json
import os
import pathlib
import stat
import sqlite3
import ssl
import sys
from email import policy

HEADER = 'X-Cogentia-Yahoo-Import-Id'
FOLDER = 'INBOX'


def credentials(path):
    if not path:
        raise RuntimeError('CREDENTIAL_FILE_MISSING')
    p = pathlib.Path(path)
    if not p.is_file():
        raise RuntimeError('CREDENTIAL_FILE_UNAVAILABLE')
    meta = p.stat()
    if meta.st_uid != os.getuid() or stat.S_IMODE(meta.st_mode) & 0o077:
        raise RuntimeError('CREDENTIAL_FILE_INSECURE')
    value = p.read_bytes().decode('utf-8').strip()
    if not value:
        raise RuntimeError('CREDENTIAL_FILE_UNAVAILABLE')
    return value


def imap_connect(host, username, password):
    client = imaplib.IMAP4_SSL(host, 993, ssl_context=ssl.create_default_context(), timeout=20)
    try:
        client.login(username, password)
        return client
    except Exception:
        client.logout()
        raise RuntimeError('IMAP_AUTH_FAILED') from None


def uidvalidity(client):
    status, _ = client.select(FOLDER, readonly=True)
    if status != 'OK':
        raise RuntimeError('YAHOO_INBOX_UNAVAILABLE')
    _, response = client.response('UIDVALIDITY')
    if not response or not response[0]:
        raise RuntimeError('YAHOO_UIDVALIDITY_MISSING')
    return response[0].decode('ascii')


def imported_token(account, validity, uid):
    import hashlib
    return hashlib.sha256(f'{account.lower()}|{validity}|{uid}'.encode('utf-8')).hexdigest()


def tagged_message(raw, token):
    # Add a header without reserializing attachments or changing MIME bodies.
    for separator in (b'\r\n\r\n', b'\n\n'):
        if separator in raw:
            head, body = raw.split(separator, 1)
            if email.message_from_bytes(head + separator, policy=policy.default).get(HEADER):
                raise RuntimeError('SOURCE_HAS_RESERVED_HEADER')
            newline = b'\r\n' if separator == b'\r\n\r\n' else b'\n'
            return head + newline + HEADER.encode('ascii') + b': ' + token.encode('ascii') + separator + body
    raise RuntimeError('YAHOO_MALFORMED_MESSAGE')


def gmail_has_token(client, token):
    status, data = client.uid('SEARCH', None, 'HEADER', HEADER, token)
    if status != 'OK':
        raise RuntimeError('GMAIL_DEDUP_LOOKUP_FAILED')
    return bool(data and data[0] and data[0].strip())


def run(args):
    if args.limit < 1 or args.limit > 500:
        raise RuntimeError('INVALID_LIMIT')
    if not args.yahoo_user or not args.gmail_user:
        raise RuntimeError('MAIL_ACCOUNT_NOT_CONFIGURED')
    # Fail before connecting or creating state, if credentials are missing.
    yahoo_secret = credentials(args.yahoo_password_file)
    gmail_secret = credentials(args.gmail_password_file)
    yahoo = imap_connect('imap.mail.yahoo.com', args.yahoo_user, yahoo_secret)
    gmail = None
    inserted = 0
    skipped = 0
    try:
        gmail = imap_connect('imap.gmail.com', args.gmail_user, gmail_secret)
        validity = uidvalidity(yahoo)
        status, _ = gmail.select('INBOX', readonly=True)
        if status != 'OK':
            raise RuntimeError('GMAIL_INBOX_UNAVAILABLE')
        state = pathlib.Path(args.state_file)
        state.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(state.parent, 0o700)
        with sqlite3.connect(state) as db:
            db.execute('CREATE TABLE IF NOT EXISTS transferred (account TEXT NOT NULL, uidvalidity TEXT NOT NULL, uid INTEGER NOT NULL, PRIMARY KEY (account,uidvalidity,uid))')
            db.execute('CREATE TABLE IF NOT EXISTS source_state (account TEXT PRIMARY KEY, uidvalidity TEXT NOT NULL, initial_floor INTEGER NOT NULL)')
            db.commit()
            os.chmod(state, 0o600)
            status, data = yahoo.uid('SEARCH', None, 'ALL')
            if status != 'OK':
                raise RuntimeError('YAHOO_UID_SEARCH_FAILED')
            # Only a finite batch, oldest first. No automatic deletion.
            uids = (data[0] or b'').split()
            row = db.execute('SELECT uidvalidity,initial_floor FROM source_state WHERE account=?',(args.yahoo_user,)).fetchone()
            if row and row[0] != validity:
                raise RuntimeError('YAHOO_UIDVALIDITY_CHANGED')
            if not row:
                # Normal mode collects NEW messages only; importing the entire
                # historical mailbox requires an explicit --include-existing.
                floor = 0 if args.include_existing else max((int(x) for x in uids),default=0)
                db.execute('INSERT INTO source_state (account,uidvalidity,initial_floor) VALUES (?,?,?)',
                           (args.yahoo_user,validity,floor))
                db.commit()
                if not args.include_existing:
                    return {'status':'initialized','imported':0,'existing_messages_skipped':len(uids),'source':'yahoo','destination':'gmail'}
            else:
                floor = row[1]
            # Newest first so fresh incoming mail is never blocked by backlog.
            for raw_uid in reversed(uids):
                uid = int(raw_uid)
                if uid <= floor:
                    continue
                if db.execute('SELECT 1 FROM transferred WHERE account=? AND uidvalidity=? AND uid=?', (args.yahoo_user,validity,uid)).fetchone():
                    skipped += 1
                    continue
                token = imported_token(args.yahoo_user, validity, uid)
                # Network dedup handles crashes between remote APPEND and DB commit.
                if not gmail_has_token(gmail, token):
                    status, result = yahoo.uid('FETCH', raw_uid, '(BODY.PEEK[])')
                    if status != 'OK' or not result:
                        raise RuntimeError('YAHOO_FETCH_FAILED')
                    payload = next((part[1] for part in result if isinstance(part, tuple) and isinstance(part[1], bytes)), None)
                    if not payload:
                        raise RuntimeError('YAHOO_EMPTY_FETCH')
                    status, _ = gmail.append('INBOX', None, None, tagged_message(payload, token))
                    if status != 'OK':
                        raise RuntimeError('GMAIL_APPEND_FAILED')
                    inserted += 1
                db.execute('INSERT INTO transferred (account,uidvalidity,uid) VALUES (?,?,?)', (args.yahoo_user,validity,uid))
                db.commit()
                if inserted >= args.limit:
                    break
        return {'status':'ok', 'imported':inserted, 'already_recorded':skipped, 'source':'yahoo', 'destination':'gmail'}
    finally:
        for client in (gmail,yahoo):
            if client:
                try: client.logout()
                except Exception: pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--yahoo-user', default=os.getenv('YAHOO_IMAP_USER',''))
    parser.add_argument('--gmail-user', default=os.getenv('GMAIL_IMAP_USER',''))
    parser.add_argument('--yahoo-password-file', default=os.getenv('YAHOO_IMAP_PASSWORD_FILE',''))
    parser.add_argument('--gmail-password-file', default=os.getenv('GMAIL_IMAP_PASSWORD_FILE',''))
    parser.add_argument('--state-file', default=os.getenv('MAIL_SYNC_STATE_FILE','/var/lib/cogentia/yahoo-gmail-sync.sqlite'))
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--include-existing', action='store_true', help='Import historical Yahoo inbox on initial setup')
    args = parser.parse_args()
    try:
        print(json.dumps(run(args)))
    except Exception as ex:
        # Print only known error labels; never server text or credential values.
        code = str(ex)
        known = {'CREDENTIAL_FILE_MISSING','CREDENTIAL_FILE_UNAVAILABLE','IMAP_AUTH_FAILED','MAIL_ACCOUNT_NOT_CONFIGURED',
            'INVALID_LIMIT','YAHOO_INBOX_UNAVAILABLE','YAHOO_UIDVALIDITY_MISSING','GMAIL_INBOX_UNAVAILABLE',
            'YAHOO_UID_SEARCH_FAILED','YAHOO_FETCH_FAILED','YAHOO_EMPTY_FETCH','GMAIL_DEDUP_LOOKUP_FAILED',
            'GMAIL_APPEND_FAILED','SOURCE_HAS_RESERVED_HEADER','YAHOO_MALFORMED_MESSAGE','YAHOO_UIDVALIDITY_CHANGED','CREDENTIAL_FILE_INSECURE'}
        print(json.dumps({'status':'blocked','code': code if code in known else 'MAIL_SYNC_ERROR'}))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
