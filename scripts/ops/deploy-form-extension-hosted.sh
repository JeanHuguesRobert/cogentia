#!/usr/bin/env bash
# Only replace the unpacked Cogentia extension worker and manifest.
# Leaves Chromium/profile, tabs, credentials and endpoint.json untouched.
set -euo pipefail
repo=/srv/cogentia/repos/cogentia
ext=/home/hosted-jeanhuguesrobert/src/cogentia/browser-extension
cd "$repo"
test "$(node -p "JSON.parse(require('fs').readFileSync('browser-extension/manifest.json')).version")" = 1.0.18
node scripts/ops/reload-hosted-navigation-extension.js
if [[ ${1:-} == --check ]];then echo 'SOURCE_AND_RUNNING_EXTENSION_CHECKED';exit 0;fi
if (( EUID != 0 ));then echo 'root required to update hosted browser user extension' >&2;exit 3;fi
for file in manifest.json background.js;do test -f "$ext/$file";done
old=$(node -p "JSON.parse(require('fs').readFileSync('$ext/manifest.json')).version")
if [[ $old != 1.0.17 && $old != 1.0.18 ]];then echo "Refusing unknown version $old" >&2;exit 4;fi
tmp=$(mktemp -d /tmp/cogentia-extension-transition.XXXXXXXX)
chmod 700 "$tmp"
cp -p "$ext/manifest.json" "$ext/background.js" "$tmp/"
if [[ -e $ext/form-field-focus.js ]];then cp -p "$ext/form-field-focus.js" "$tmp/";fi
changed=0
rollback(){
 if (( changed ));then
   cp -p "$tmp/manifest.json" "$tmp/background.js" "$ext/"
   if [[ -e $tmp/form-field-focus.js ]];then cp -p "$tmp/form-field-focus.js" "$ext/";else rm -f "$ext/form-field-focus.js";fi
   COGENTIA_EXPECTED_EXTENSION_VERSION="$old" node scripts/ops/reload-hosted-navigation-extension.js --reload || true
 fi
 rm -rf "$tmp"
}
trap rollback ERR
for file in manifest.json background.js form-field-focus.js;do
 install -o "$(stat -c %u "$ext/background.js")" -g "$(stat -c %g "$ext/background.js")" -m 644 "browser-extension/$file" "$ext/$file"
 changed=1
done
node scripts/ops/reload-hosted-navigation-extension.js --reload
trap - ERR
rm -rf "$tmp"
echo 'HOSTED_FORM_EXTENSION_VERSION=1.0.18'
