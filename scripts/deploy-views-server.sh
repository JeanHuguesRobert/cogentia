#!/bin/bash
# Deploy Views Store API server to fracta VPS
# Usage: ./deploy-views-server.sh [--dry-run]

set -e

DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN="echo "
fi

FRACTA_USER="${VIEWS_USER:-root}"
FRACTA_HOST="${VIEWS_HOST:-fracta}"
VIEWS_DIR="/srv/views"
SERVER_DIR="/srv/views-server"
SCRIPT_NAME="views-server.js"
# Canonical sources live under deploy/views-server/ (ESM package, .js entry)
SCRIPT_SRC="$(cd "$(dirname "$0")/.." && pwd)/deploy/views-server/${SCRIPT_NAME}"
PKG_SRC="$(cd "$(dirname "$0")/.." && pwd)/deploy/views-server/package.json"

echo "Deploying Views Store to ${FRACTA_HOST}..."

# Create directories
echo "Creating directories..."
${DRY_RUN} ssh ${FRACTA_USER}@${FRACTA_HOST} "mkdir -p ${VIEWS_DIR} ${SERVER_DIR}"

# Copy server script (+ package.json for type:module / deps)
echo "Copying server script..."
${DRY_RUN} scp "${SCRIPT_SRC}" "${PKG_SRC}" ${FRACTA_USER}@${FRACTA_HOST}:${SERVER_DIR}/

# Create systemd service
echo "Creating systemd service..."
${DRY_RUN} ssh ${FRACTA_USER}@${FRACTA_HOST} "cat > /etc/systemd/system/views-store.service << 'EOF'
[Unit]
Description=Views Store API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${SERVER_DIR}
ExecStart=/usr/bin/node ${SERVER_DIR}/${SCRIPT_NAME}
Restart=always
RestartSec=10
Environment=PORT=3423
Environment=VIEWS_DIR=${VIEWS_DIR}

[Install]
WantedBy=multi-user.target
EOF"

# Enable and start service
echo "Enabling and starting service..."
${DRY_RUN} ssh ${FRACTA_USER}@${FRACTA_HOST} "systemctl daemon-reload && systemctl enable --now views-store"

# Configure Caddy (append to existing config)
echo "Updating Caddy configuration..."
${DRY_RUN} ssh ${FRACTA_USER}@${FRACTA_HOST} "cat > /etc/caddy/conf.d/views-store.caddyfile << 'EOF'
views.fracta {
    # API server reverse proxy
    handle_path /api/* {
        reverse_proxy localhost:3423
    }

    # Static views directory
    root * ${VIEWS_DIR}
    file_server browse
    encode gzip

    # Default index
    handle / {
        reverse_proxy localhost:3423
    }

    # Individual views (with API proxy for rendering)
    handle /views/* {
        reverse_proxy localhost:3423
    }

    log {
        output file /var/log/caddy/views-access.log
    }
}
EOF"

# Reload Caddy
echo "Reloading Caddy..."
${DRY_RUN} ssh ${FRACTA_USER}@${FRACTA_HOST} "caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile"

echo ""
echo "Views Store deployed!"
echo "HTTP URL: http://views.fracta (or your configured domain)"
echo "API URL: http://views.fracta/api/views"
echo ""
echo "Test with:"
echo "  curl http://views.fracta/api/views"
echo "  curl http://views.fracta/views/current-issues.md"
