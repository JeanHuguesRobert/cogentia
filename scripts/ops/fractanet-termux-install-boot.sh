#!/data/data/com.termux/files/usr/bin/bash
# Download Termux:Boot APK and open the Android package installer.
# Used when ADB from a workstation is unavailable (SSH-only provisioning).
#
# Usage: bash ~/fractanet-termux-install-boot.sh

set -euo pipefail

VERSION="${TERMUX_BOOT_VERSION:-v0.8.1}"
APK_NAME="termux-boot-app_${VERSION}+github.debug.apk"
APK_URL="${TERMUX_BOOT_APK_URL:-https://github.com/termux/termux-boot/releases/download/${VERSION}/termux-boot-app_${VERSION}%2Bgithub.debug.apk}"
CACHE="${HOME}/.cache/fractanet"
APK_PATH="${CACHE}/${APK_NAME}"

mkdir -p "${CACHE}"

if pm list packages 2>/dev/null | grep -q 'com.termux.boot'; then
  echo "[termux-boot] already installed (com.termux.boot)"
  exit 0
fi

echo "[termux-boot] downloading ${VERSION}..."
curl -fL --retry 3 -o "${APK_PATH}" "${APK_URL}"

if command -v sha256sum >/dev/null 2>&1 && [ -n "${TERMUX_BOOT_SHA256:-}" ]; then
  echo "${TERMUX_BOOT_SHA256}  ${APK_PATH}" | sha256sum -c -
fi

if ! command -v termux-open >/dev/null 2>&1; then
  echo "[termux-boot] install termux-tools for termux-open: pkg install termux-tools" >&2
  exit 1
fi

echo "[termux-boot] opening installer — tap Install on the phone, then open Termux:Boot once"
termux-open "${APK_PATH}"