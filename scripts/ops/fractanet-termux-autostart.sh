#!/data/data/com.termux/files/usr/bin/bash
# Fallback when Termux:Boot cannot be installed (e.g. Android 16 + F-Droid incompatibility).
# ~/.termux/boot/* runs when the Termux *app* starts — MIUI autostart can launch it at boot.
#
# Usage: bash ~/fractanet-termux-autostart.sh

set -euo pipefail

SDK="$(getprop ro.build.version.sdk 2>/dev/null || echo 0)"
ANDROID="$(getprop ro.build.version.release 2>/dev/null || echo ?)"

cat <<EOF
[fractanet] Termux:Boot fallback — Android ${ANDROID} (sdk ${SDK})

When Termux:Boot is unavailable, sshd at reboot needs the Termux app to start once.
Your boot script is already: ~/.termux/boot/sshd

=== POCO / HyperOS / MIUI (manual, one-time) ===

1. Paramètres → Applications → Gérer les applications → Termux
   - Démarrage automatique (Autostart) : ACTIVER
   - Batterie → Sans restriction / Pas d'optimisation

2. Paramètres → Applications → Termux:Boot (si installé)
   - Même chose : autostart + batterie sans restriction

3. Sécurité → Batterie → Apps sans restriction → ajouter Termux

4. Optionnel : verrouiller Termux dans le menu Récents (évite le kill)

=== Test après reboot ===

Sans ouvrir Termux à la main, depuis le ThinkPad :
  ssh poco-jhr hostname

Si échec : ouvrir Termux une fois (lance ~/.termux/boot/sshd), puis retester.

=== Test local immédiat ===

  pgrep -x sshd && echo sshd-running || (termux-wake-lock; sshd; echo sshd-started)

EOF

if command -v sshd >/dev/null 2>&1; then
  if ! pgrep -x sshd >/dev/null 2>&1; then
    termux-wake-lock 2>/dev/null || true
    sshd
    echo "[fractanet] sshd started"
  else
    echo "[fractanet] sshd already running"
  fi
fi