#!/usr/bin/env python3
"""Owner-approved activation of *decision recording only*, never COP issuance.

Default is preview. Apply creates a fail-closed systemd override, restarts the
existing protected listener, and probes that anonymous GET/POST are denied.
Does not call request(), apply(), amendMandate() or the COP writer itself.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

UNIT=Path('/etc/systemd/system/cogentia-jhn-consent.service')
OVERRIDE_DIR=Path('/etc/systemd/system/cogentia-jhn-consent.service.d')
OVERRIDE=OVERRIDE_DIR/'50-owner-consent-decisions.conf'
CONTENT='[Service]\nEnvironment=COGENTIA_JHN_CONSENT_ENABLE_DECISION=1\n'
URL='http://127.0.0.1:8796/api/cop/principal-consent/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

def run(*cmd):
    subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)

def check(code, *, after_restart=False):
    req=urllib.request.Request(URL,headers={'Host':'jhn.baronsmariani.org'},method='GET')
    # systemctl restart waits for the process, not its HTTP listen(). The
    # existing listener initializes Supabase + SQLite before binding 8796.
    # Probe bounded readiness, not a fixed blind sleep or a one-shot request.
    attempts = 30 if after_restart else 1
    for index in range(attempts):
        try:
            with urllib.request.urlopen(req,timeout=2) as r:
                if r.status==code:return True
                return False
        except urllib.error.HTTPError as e:
            return e.code==code
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if index+1==attempts:return False
            time.sleep(0.2)
    return False

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    a=parser.parse_args()
    if not UNIT.exists():raise RuntimeError('consent_service_not_installed')
    unit=UNIT.read_text()
    if ('Environment=COGENTIA_JHN_CONSENT_ENABLE_DECISION=0' not in unit or
        'ExecStart=/usr/local/node-v26.5.0/bin/node /srv/cogentia/repos/cogentia/scripts/ops/jhn-consent-local-server.js' not in unit):
        raise RuntimeError('unexpected_consent_service_unit')
    if not check(401):raise RuntimeError('baseline_anonymous_denial_not_verified')
    print('Service verified: anonymous GET 401. No mandate/grant writer will be exposed.')
    if not a.apply:
        print('PREVIEW: owner can enable only Supabase-authenticated decisions using --apply')
        return
    if os.geteuid()!=0:raise RuntimeError('root_required')
    if OVERRIDE.exists() and OVERRIDE.read_text()!=CONTENT:
        raise RuntimeError('existing_decision_override_unexpected')
    previously=OVERRIDE.exists()
    OVERRIDE_DIR.mkdir(parents=True,exist_ok=True)
    if not previously:OVERRIDE.write_text(CONTENT)
    try:
        run('systemctl','daemon-reload')
        run('systemctl','restart','cogentia-jhn-consent.service')
        run('systemctl','is-active','--quiet','cogentia-jhn-consent.service')
        if not check(401,after_restart=True):raise RuntimeError('post_restart_anonymous_denial_failed')
        output=subprocess.run(['systemctl','show','cogentia-jhn-consent.service','-p','Environment','--value'],capture_output=True,text=True,check=True).stdout
        if 'COGENTIA_JHN_CONSENT_ENABLE_DECISION=1' not in output:
            raise RuntimeError('decision_enable_not_applied')
        print('SUCCESS: decisions enabled; requires live JHN Supabase Auth and exact challenge SHA-256.')
        print('No issuance endpoint and no mandate created or modified.')
    except Exception:
        if not previously:OVERRIDE.unlink(missing_ok=True)
        try:
            run('systemctl','daemon-reload')
            run('systemctl','restart','cogentia-jhn-consent.service')
        except Exception:pass
        raise

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('ACTIVATION FAILED:',str(e),file=sys.stderr)
        sys.exit(1)
