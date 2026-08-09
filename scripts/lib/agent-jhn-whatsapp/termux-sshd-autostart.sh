#!/data/data/com.termux/files/usr/bin/bash
/**
 * Termux Automated SSHD & Tailscale Startup Script for Agent John Mobile Cockpit.
 * Place this in ~/.termux/boot/start-sshd.sh on Android (using Termux:Boot app).
 */

echo "🚀 Starting Agent John Termux Mobile Services..."

# 1. Start OpenSSH daemon on port 8022
if ! pgrep -x "sshd" > /dev/null; then
    sshd -p 8022
    echo "✅ OpenSSH daemon started on port 8022."
else
    echo "ℹ️ OpenSSH daemon is already running."
fi

# 2. Check Tailscale mesh network status
if command -v tailscale > /dev/null; then
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)
    if [ -n "$TAILSCALE_IP" ]; then
        echo "🌐 Tailscale connected. Node IP: $TAILSCALE_IP"
    else
        echo "⚠️ Tailscale is installed but not connected. Running tailscale up..."
        tailscale up --accept-routes
    fi
else
    echo "ℹ️ Tailscale binary not found in Termux PATH. Ensure Tailscale Android App is active."
fi

echo "📱 Mobile node ready for SSH access: ssh -p 8022 u0_a...@$TAILSCALE_IP"
