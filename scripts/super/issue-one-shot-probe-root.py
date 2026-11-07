#!/usr/bin/env python3
"""Root-owned one-shot COP issuer. Never executes the effect itself.

ONLY authorize the pinned, SSHSIG signed, pre-reserved read-only uid probe.
Install from an independently pinned copy, not an ubuntu-writable module.
"""
import base64
import datetime
import hashlib
import json
import os
import pathlib
import sqlite3
import subprocess
import tempfile
import uuid

PROPOSAL = pathlib.Path('/srv/cogentia/repos/cogentia/research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json')
SIGNATURE = pathlib.Path('/home/ubuntu/jhn-super-probe-2026-11-07.proposal.json.sig')
AUTH_KEYS = pathlib.Path('/home/ubuntu/.ssh/authorized_keys')
COP_DB = '/var/lib/cogentia/cop/john-root-v1.sqlite'
ROOT_DIR = pathlib.Path('/var/lib/cogentia-super')
ROOT_STORE = ROOT_DIR / 'authorizations.json'
RECEIPT = pathlib.Path('/home/ubuntu/jhn-super-probe-root-receipt.json')
PROPOSAL_HASH = '77404ea29444623148489128ec57642301480e18a1ac48398409400d2413f848'
EFFECT_HASH = 'sha256:eab4081a5a62a1c34fcb8a3abc67e283c58ed7df5f632665bf7307374b4af11a'
KEY_FINGERPRINT = 'SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c'
MANDATE = 'mandate:jhn:super-read-probe-v1'
BUDGET = 'budget:' + MANDATE
RESERVATION = 'reservation:' + BUDGET + ':signed-super-probe:sha256:' + PROPOSAL_HASH
NAMESPACE = 'cogentia-super-probe-v1'


def require(ok, code):
    if not ok:
        raise RuntimeError(code)


def verify_proposal():
    data = PROPOSAL.read_bytes()
    require(hashlib.sha256(data).hexdigest() == PROPOSAL_HASH, 'proposal_hash_mismatch')
    p = json.loads(data)
    require(p['kind'] == 'cogentia.super-one-shot-proposal/v1' and
            p['mandate_ref'] == MANDATE and p['principal_ref'] == 'principal:jhn' and
            p['actor_ref'] == 'agent:jhn' and p['single_use'] is True and
            p['max_delegation_depth'] == 0 and p['budget_limits'] == {'max_steps': 1}, 'scope_invalid')
    require(p['effect'] == {'action_class': 'host.process.run', 'command': 'id -u; sudo -n id -u',
            'execution_mode': 'super', 'payload_hash': EFFECT_HASH, 'provider': 'unix-process',
            'target': 'node:fracta2', 'timeout_ms': 10000}, 'effect_invalid')
    now = datetime.datetime.now(datetime.timezone.utc)
    require(datetime.datetime.fromisoformat(p['valid_from'].replace('Z', '+00:00')) <= now <
            datetime.datetime.fromisoformat(p['valid_until'].replace('Z', '+00:00')), 'proposal_expired')
    signature = SIGNATURE.read_bytes()
    require(signature.startswith(b'-----BEGIN SSH SIGNATURE-----'), 'signature_format_invalid')
    trusted = None
    for line in AUTH_KEYS.read_text().splitlines():
        parts = line.split()
        if len(parts) < 2 or parts[0] != 'ssh-rsa':
            continue
        try:
            digest = base64.b64encode(hashlib.sha256(base64.b64decode(parts[1], validate=True)).digest()).decode().rstrip('=')
        except ValueError:
            continue
        if 'SHA256:' + digest == KEY_FINGERPRINT:
            trusted = parts[0] + ' ' + parts[1]
            break
    require(bool(trusted), 'trusted_key_missing')
    with tempfile.TemporaryDirectory(prefix='super-probe-root-') as td:
        allowed = pathlib.Path(td) / 'allowed_signers'
        allowed.write_text('principal:jhn ' + trusted + '\n')
        r = subprocess.run(['ssh-keygen', '-Y', 'verify', '-f', str(allowed), '-I', 'principal:jhn',
                            '-n', NAMESPACE, '-s', str(SIGNATURE)], input=data,
                           capture_output=True, timeout=8)
        require(r.returncode == 0, 'signature_verification_failed')
    return p, signature.decode()


def verify_reserved_budget(signature):
    db = sqlite3.connect('file:' + COP_DB + '?mode=ro', uri=True, timeout=3)
    try:
        def events(topic):
            return [json.loads(row[0]) for row in db.execute(
                'SELECT envelope FROM cop_events WHERE topic=? ORDER BY seq', (topic,))]
        m = events('mandate:' + MANDATE)
        require(len(m) == 1 and m[0]['payload']['kind'] == 'MandateDeclaration', 'mandate_missing_or_ambiguous')
        d = m[0]['payload']
        require(d['mandate_id'] == MANDATE and d['status'] == 'active' and
                d['principal_ref'] == 'principal:jhn' and d['logical_agent_ref'] == 'agent:jhn', 'mandate_identity_invalid')
        require(d['scope']['allowed_actions'] == ['host.process.run'] and
                d['scope']['effect_hash'] == EFFECT_HASH and d['scope']['execution_mode'] == 'super' and
                d['scope']['target'] == 'node:fracta2' and d['scope']['budget_ceiling'] == {'max_steps': 1}, 'mandate_scope_invalid')
        meta = d['metadata']
        require(meta['proposal_hash'] == 'sha256:' + PROPOSAL_HASH and
                meta['issuer_fingerprint'] == KEY_FINGERPRINT and meta['signature'] == signature and
                meta['signature_namespace'] == NAMESPACE and meta['one_use'] is True, 'mandate_provenance_invalid')
        e = events('execution-budget:' + BUDGET)
        require(len(e) == 2 and e[0]['event_type'] == 'ExecutionBudgetGrant' and
                e[0]['payload']['limits'] == {'max_steps': 1} and
                e[0]['payload']['mandate_ref'] == MANDATE and
                e[1]['event_type'] == 'ExecutionBudgetReservation', 'budget_state_invalid')
        reservation = e[1]['payload']['reservation']
        require(reservation['reservation_id'] == RESERVATION and
                reservation['status'] == 'reserved' and reservation['demand'] == {'max_steps': 1},
                'budget_reservation_invalid')
    finally:
        db.close()


def issue():
    require(os.geteuid() == 0, 'root_required')
    _, signature = verify_proposal()
    verify_reserved_budget(signature)
    state_dir = ROOT_DIR.lstat()
    require(state_dir.st_uid == 0 and state_dir.st_mode & 0o022 == 0 and ROOT_DIR.is_dir(), 'unsafe_root_store_directory')
    st = ROOT_STORE.lstat()
    require(st.st_uid == 0 and st.st_mode & 0o077 == 0 and ROOT_STORE.is_file() and not ROOT_STORE.is_symlink(), 'unsafe_root_store')
    original = ROOT_STORE.read_bytes()
    grant_store = json.loads(original)
    require(isinstance(grant_store.get('grants'), dict), 'root_grants_invalid')
    require(not any(g.get('mandate_ref') == MANDATE for g in grant_store['grants'].values()), 'probe_already_granted')
    now = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(minutes=10)
    auth_id = 'sea_' + str(uuid.uuid4())
    grant_store['grants'][auth_id] = {
        'kind': 'cogentia.side_effect_authorization/v1', 'authorization_id': auth_id,
        'principal': 'principal:jhn', 'actor': 'agent:jhn',
        'mandate_ref': MANDATE, 'budget_reservation_id': RESERVATION,
        'authority_origin': 'principal', 'status': 'granted', 'action_class': 'host.process.run',
        'target': {'node': 'node:fracta2', 'path': None}, 'payload_hash': EFFECT_HASH,
        'granted_at': now.isoformat().replace('+00:00', 'Z'),
        'expires_at': expires.isoformat().replace('+00:00', 'Z'),
        'single_use': True, 'consumed_at': None,
    }
    require(ROOT_STORE.read_bytes() == original, 'concurrent_root_store_modification')
    tmp = ROOT_DIR / ('.probe-issuer-' + str(uuid.uuid4()))
    try:
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write((json.dumps(grant_store, indent=2) + '\n').encode())
            f.flush()
            os.fsync(f.fileno())
        os.chown(tmp, 0, st.st_gid)
        os.replace(tmp, ROOT_STORE)
        parent_fd = os.open(ROOT_DIR, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(parent_fd)
        finally:
            os.close(parent_fd)
    finally:
        if tmp.exists():
            tmp.unlink()
    receipt = {'ok': True, 'phase': 'ROOT_GRANT_ISSUED_NOT_EXECUTED',
               'authorization_id': auth_id, 'actor': 'agent:jhn', 'principal': 'principal:jhn',
               'mandate': MANDATE, 'payload_hash': EFFECT_HASH,
               'reservation_id': RESERVATION, 'expires_at': expires.isoformat().replace('+00:00', 'Z')}
    fd = os.open(RECEIPT, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o640)
    with os.fdopen(fd, 'w') as f:
        json.dump(receipt, f)
        f.write('\n')
    os.chown(RECEIPT, 0, 1001)
    print(json.dumps(receipt))


if __name__ == '__main__':
    try:
        issue()
    except Exception as exc:
        print(json.dumps({'ok': False, 'phase': 'ROOT_GRANT_NOT_ISSUED', 'error': str(exc)}))
        raise SystemExit(1)
