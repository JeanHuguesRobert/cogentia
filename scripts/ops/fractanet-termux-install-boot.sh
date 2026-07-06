#!/data/data/com.termux/files/usr/bin/bash
# Download Termux:Boot APK and open the Android package installer.
# Picks the APK channel matching the installed Termux app (F-Droid vs GitHub).
#
# Usage: bash ~/fractanet-termux-install-boot.sh

set -euo pipefail

CACHE="${HOME}/.cache/fractanet"
mkdir -p "${CACHE}"

if pm list packages 2>/dev/null | grep -q 'com.termux.boot'; then
  echo "[termux-boot] already installed (com.termux.boot)"
  exit 0
fi

RELEASE="F_DROID"
if command -v termux-info >/dev/null 2>&1; then
  RELEASE="$(termux-info 2>/dev/null | sed -n 's/^TERMUX_APK_RELEASE=//p' | head -1)"
fi

SDK="$(getprop ro.build.version.sdk 2>/dev/null || echo 0)"
ANDROID="$(getprop ro.build.version.release 2>/dev/null || echo ?)"
MODEL="$(getprop ro.product.model 2>/dev/null || echo ?)"

echo "[termux-boot] device Android ${ANDROID} (sdk ${SDK}) ${MODEL}"
echo "[termux-boot] Termux channel: ${RELEASE}"

case "${RELEASE}" in
  F_DROID|f-droid)
    APK_URL="${TERMUX_BOOT_APK_URL:-https://f-droid.org/repo/com.termux.boot_1000.apk}"
    APK_PATH="${CACHE}/com.termux.boot_1000.apk"
    echo "[termux-boot] using F-Droid APK (must match F-Droid Termux signature)"
    ;;
  GITHUB|github|*)
    VERSION="${TERMUX_BOOT_VERSION:-v0.8.1}"
    APK_URL="${TERMUX_BOOT_APK_URL:-https://github.com/termux/termux-boot/releases/download/${VERSION}/termux-boot-app_${VERSION}%2Bgithub.debug.apk}"
    APK_PATH="${CACHE}/termux-boot-app_${VERSION}+github.debug.apk"
    echo "[termux-boot] using GitHub debug APK (must match GitHub Termux signature)"
    ;;
esac

if [ "${SDK}" -ge 35 ] 2>/dev/null; then
  echo "[termux-boot] note: F-Droid client may label Termux:Boot incompatible on Android ${ANDROID}."
  echo "[termux-boot]       sideload this APK via the installer (termux-open), not the F-Droid app."
  echo "[termux-boot]       if install still fails, use MIUI autostart fallback — see fractanet-termux-autostart.sh"
fi

echo "[termux-boot] downloading..."
curl -fL --retry 3 -o "${APK_PATH}" "${APK_URL}"

if ! command -v termux-open >/dev/null 2>&1; then
  echo "[termux-boot] install termux-tools: pkg install termux-tools" >&2
  exit 1
fi

echo "[termux-boot] opening installer — tap Install, then open Termux:Boot once"
termux-open "${APK_PATH}"