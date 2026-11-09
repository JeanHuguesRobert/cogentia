#!/usr/bin/env python3
"""Owner-run, validated single-purpose Caddy + systemd staging install.

Read-only default. `sudo python3 ... --apply` must be executed by the host
owner. This does not enable decisions or issue any COP mandate.
"""
import argparse
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path('/srv/cogentia/repos/cogentia')
UNIT_SRC = ROOT / 'scripts/ops/consent-deploy/cogentia-jhn-consent.service'
UNIT_DST = pathlib.Path('/etc/systemd/system/cogentia-jhn-consent.service')
CADDY = pathlib.Path('/etc/caddy/Caddyfile')
MARK = '# BEGIN COGENTIA JHN AUTHENTICATED CONSENT (staging)'
SNIPPET = '''    # BEGIN COGENTIA JHN AUTHENTICATED CONSENT (staging)
    @jhn_consent path /api/cop/principal-consent/*
    handle @jhn_consent {
        reverse_proxy 127.0.0.1:8796 {
            header_up Host jhn.baronsmariani.org
        }
    }
    # END COGENTIA JHN AUTHENTICATED CONSENT (staging)
'''

def cmd(*argv):
    print('run:', ' '.join(argv), flush=True)
    subprocess.run(argv, check=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    opts=parser.parse_args()
    original=CADDY.read_text()
    if ':80 {\n' not in original:
        raise RuntimeError('unexpected Caddy host layout')
    if MARK in original:
        updated=original
        print('Caddy route already present: no duplicate insertion')
    else:
        updated=original.replace(':80 {\n', ':80 {\n'+SNIPPET, 1)
    unit=UNIT_SRC.read_text()
    if 'Environment=COGENTIA_JHN_CONSENT_ENABLE_DECISION=0' not in unit:
        raise RuntimeError('staging unit not fail-closed')
    print('staging decisions enabled: false')
    print('Caddy route: /api/cop/principal-consent/* -> localhost:8796')
    print('origin: jhn.baronsmariani.org (behind Netlify proxy)')
    if not opts.apply:
        print('PREVIEW ONLY — execute with --apply for owner-authorized installation')
        return
    if __import__('os').geteuid()!=0:
        raise RuntimeError('root privileges required for installation')
    # Validate the proposed configuration *before* touching the live file.
    preview=pathlib.Path('/etc/caddy/Caddyfile.jhn-consent-preview')
    try:
        preview.write_text(updated)
        cmd('caddy','validate','--config',str(preview),'--adapter','caddyfile')
    finally:
        preview.unlink(missing_ok=True)
    backup=CADDY.with_name('Caddyfile.bak.jhn-consent-'+datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S'))
    shutil.copy2(CADDY,backup)
    print('backup:',backup)
    if updated!=original:CADDY.write_text(updated)
    shutil.copy2(UNIT_SRC,UNIT_DST)
    UNIT_DST.chmod(0o644)
    try:
        cmd('systemctl','daemon-reload')
        cmd('systemctl','enable','--now','cogentia-jhn-consent.service')
        cmd('systemctl','reload','caddy')
        cmd('systemctl','is-active','cogentia-jhn-consent.service')
        print('SUCCESS: loopback listener installed; decision writes remain disabled')
    except Exception:
        shutil.copy2(backup,CADDY)
        try:cmd('systemctl','reload','caddy')
        except Exception:pass
        raise

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('INSTALL FAILED:',exc,file=sys.stderr)
        sys.exit(1)
