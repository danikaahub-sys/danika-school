#!/usr/bin/env bash
# One-time VPS prep on the Marymore/Pinara Iran box.
# Ensures /opt/danika and host port 8081 (Marymore keeps :8080, Pinara :80).
if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi
set -euo pipefail

REMOTE_DIR="/opt/danika"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root:  sudo bash $0"
  exit 1
fi

say(){ printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }

say "Checking Docker"
command -v docker >/dev/null || { echo "Docker missing"; exit 1; }

say "Creating ${REMOTE_DIR}"
mkdir -p "$REMOTE_DIR"
chmod 755 "$REMOTE_DIR"

say "Allowing TCP 8081 (Danika edge; Pinara keeps :80, Marymore :8080)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 8081/tcp comment 'Danika nginx edge (Pinara :80 → origin HTTP)' || true
  ufw status | grep -E '8081|Status' || true
else
  echo "ufw not installed — open 8081/tcp manually if a firewall is active"
fi

cat <<EOF

Danika VPS path ready.

Next on your Mac:
  bash deploy.command

Arvan CDN for danikahub.ir / school.danikahub.ir / api.danikahub.ir:
  Origin IP  = this VPS
  Protocol   = HTTP
  Port       = 80   (Pinara edge; Host-forwards to Danika :8081)
EOF
