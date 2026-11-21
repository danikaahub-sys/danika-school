#!/usr/bin/env bash
# =============================================================================
#  danika-school  ·  one-click deploy  (run on your Mac)
#
#  Ships SOURCE (server + website + school + docker + deploy) and builds images
#  ON the server. Re-run any time to UPDATE — Redis data stays on a volume;
#  Postgres is Arvan managed (no local db container).
#
#  Environment: DEPLOY_ENV_FILE, then deploy/prod.local.env, then deploy/prod.env.
#  .deploy.conf only says how to reach the box.
#
#  Server only needs: Docker Engine. CDN terminates TLS and hits Pinara :80.
#  Pinara Host-forwards danikahub.ir / school.danikahub.ir to EDGE_PORT
#  (default 8081). Marymore
#  stays :8080. Never bind :80.
#
#  HOW TO USE:  bash deploy.command   or   npm run deploy
# =============================================================================
if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONF=".deploy.conf"
say(){ printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
pause(){ if [ -t 0 ] && [ -z "${DEPLOY_NONINTERACTIVE:-}" ]; then read -r -p "$1" _; fi; }
die(){ printf "\n\033[1;31m!! %s\033[0m\n" "$1"; pause "Press Enter to close..."; exit 1; }

# Production artifacts must be built from the pushed, clean main revision.
# This script rewrites docker/nginx.conf after the first check; later calls
# must ignore that generated host block.
verify_main() {
  # GitHub SSH from this path drops connections; retry like VPS upload.
  fetch_ok=0
  for _ in 1 2 3 4 5 6 7 8; do
    if git fetch -q origin main; then fetch_ok=1; break; fi
    sleep 4
  done
  [ "$fetch_ok" = 1 ] || die "Cannot refresh origin/main."
  [ "$(git branch --show-current)" = main ] || die "Deploy from main only."
  dirty="$(git status --porcelain --untracked-files=normal | awk '$NF != "docker/nginx.conf"')"
  [ -z "$dirty" ] || die "Source checkout is dirty."
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "Main moved; integrate and rebuild."
}
verify_main
DEPLOY_SHA="$(git rev-parse HEAD)"
export DEPLOY_SHA

# ---------- 1. load or ask config ------------------------------------------
if [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  source "$CONF"
  echo "Loaded settings from $CONF (delete it to reconfigure)."
else
  echo "First-time setup — answer a few questions:"
  read -r -p "  Server IP/host        [95.38.161.61]: " SSH_HOST;  SSH_HOST=${SSH_HOST:-95.38.161.61}
  read -r -p "  SSH user              [root]: "            SSH_USER;  SSH_USER=${SSH_USER:-root}
  read -r -p "  SSH port              [22]: "              SSH_PORT;  SSH_PORT=${SSH_PORT:-22}
  read -r -s -p "  SSH password         : "                SSH_PASS;  echo
  read -r -p "  Remote dir            [/opt/danika]: "     REMOTE_DIR; REMOTE_DIR=${REMOTE_DIR:-/opt/danika}
  read -r -p "  Edge host port        [8081]: "            EDGE_PORT;  EDGE_PORT=${EDGE_PORT:-8081}
  umask 077
  cat > "$CONF" <<EOF
SSH_HOST="$SSH_HOST"
SSH_USER="$SSH_USER"
SSH_PORT="$SSH_PORT"
SSH_PASS="$SSH_PASS"
REMOTE_DIR="$REMOTE_DIR"
EDGE_PORT="$EDGE_PORT"
EOF
  echo "Saved to $CONF (this file holds your password — keep it private)."
fi

SSH_HOST="${SSH_HOST:?set SSH_HOST in $CONF}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/danika}"
EDGE_PORT="${EDGE_PORT:-8081}"
SSH_PASS="${SSH_PASS:-}"
[ "$EDGE_PORT" != "80" ] || die "EDGE_PORT=80 would steal Pinara's host port. Use 8081."

# ---------- the API + website deployment environment -----------------------
ENV_FILE="${DEPLOY_ENV_FILE:-}"
if [ -z "$ENV_FILE" ]; then
  if [ -f deploy/prod.local.env ]; then ENV_FILE="deploy/prod.local.env"
  elif [ -f deploy/prod.env ]; then ENV_FILE="deploy/prod.env"
  fi
fi
[ -n "${ENV_FILE:-}" ] && [ -f "$ENV_FILE" ] || die "Environment file is missing: deploy/prod.env
Copy deploy/prod.env.example to deploy/prod.env and fill secrets (no quotes)."
grep -q $'\r' "$ENV_FILE" && die "$ENV_FILE has Windows line endings — every value would end in a stray carriage return."
bad="$(grep -nE "^[A-Za-z_][A-Za-z0-9_]*=[\"']" "$ENV_FILE" | cut -d: -f1 | tr '\n' ' ' || true)"
[ -z "$bad" ] || die "$ENV_FILE line(s) ${bad}quote their value — docker would pass the quotes along. Write KEY=value."
envval(){ sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }
for k in DATABASE_URL AUTH_ACCESS_TOKEN_SECRET AUTH_REFRESH_TOKEN_SECRET REDIS_URL PUBLIC_URL WEB_URL NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY NEXT_PUBLIC_SCHOOL_URL; do
  [ -n "$(envval "$k")" ] || die "$ENV_FILE has no $k — refusing to start without it."
done
API_DOMAIN="$(envval PUBLIC_URL | sed -E 's#^https?://##; s#/.*$##')"
WEB_DOMAIN="$(envval WEB_URL | sed -E 's#^https?://##; s#/.*$##')"
NEXT_PUBLIC_APP_URL="$(envval NEXT_PUBLIC_APP_URL)"
[ -n "$NEXT_PUBLIC_APP_URL" ] || NEXT_PUBLIC_APP_URL="$(envval WEB_URL)"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$(envval NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
NEXT_PUBLIC_LOGGING_LEVEL="$(envval NEXT_PUBLIC_LOGGING_LEVEL)"
[ -n "$NEXT_PUBLIC_LOGGING_LEVEL" ] || NEXT_PUBLIC_LOGGING_LEVEL=info
NEXT_PUBLIC_SCHOOL_URL="$(envval NEXT_PUBLIC_SCHOOL_URL)"
SCHOOL_DOMAIN="$(printf '%s' "$NEXT_PUBLIC_SCHOOL_URL" | sed -E 's#^https?://##; s#/.*$##')"
VITE_API_URL="$(envval VITE_API_URL)"
[ -n "$VITE_API_URL" ] || VITE_API_URL="https://${API_DOMAIN}/v1"
export TELEGRAM_BOT_TOKEN="$(envval TELEGRAM_BOT_TOKEN)"
export TELEGRAM_OPS_CHAT_ID="$(envval TELEGRAM_OPS_CHAT_ID)"
if [ "${DEPLOY_SKIP_NOTIFICATIONS:-0}" = 1 ]; then unset TELEGRAM_BOT_TOKEN TELEGRAM_OPS_CHAT_ID; fi
NOTIFY_TG="$(pwd)/deploy/notify-telegram.sh"
CHANGELOG_SH="$(pwd)/deploy/changelog.sh"

# Prefer classical KEX — post-quantum sntrup packets often drop on the Iran path.
SSHOPTS="-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o RequestTTY=no -o LogLevel=ERROR -o KexAlgorithms=curve25519-sha256,ecdh-sha2-nistp256 -o HostKeyAlgorithms=ssh-ed25519,ecdsa-sha2-nistp256,rsa-sha2-512"
rssh(){ ssh $SSHOPTS -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "$1"; }

reachable(){
  for _ in 1 2 3 4 5; do
    rssh "true" 2>/dev/null && return 0
    sleep 4
  done
  return 1
}

# ---------- 2. sanity checks -----------------------------------------------
if ! reachable; then
  say "First run: installing SSH key — type the server password ONCE when asked"
  [ -f "$HOME/.ssh/id_ed25519" ] || ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519" >/dev/null
  ssh-copy-id -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" || true
  reachable || die "Key setup didn't complete. Run this once manually, then re-run:
       ssh-copy-id -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST}"
  say "Key installed — continuing."
fi
rssh "sudo docker info >/dev/null" || die "Docker is not available on the deployment server."
DNS_SERVERS="${DEPLOY_DNS_SERVERS:-$(rssh "awk '/^nameserver / {print \$2}' /run/systemd/resolve/resolv.conf /etc/resolv.conf 2>/dev/null" || true)}"
DNS_FLAGS=""
DNS_SEEN=" "
for dns in $DNS_SERVERS 8.8.8.8 1.1.1.1; do
  [[ "$dns" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
  [[ "$dns" = 127.* || "$dns" = 0.0.0.0 ]] && continue
  case "$DNS_SEEN" in *" $dns "*) continue ;; esac
  DNS_FLAGS="$DNS_FLAGS --dns $dns"
  DNS_SEEN="$DNS_SEEN$dns "
done
[ -f server/package.json ] && [ -f website/package.json ] && [ -f school/package.json ] || die "Run this from the project root (server/, website/, and school/ must be here)."

# ---------- 3. generate nginx from template --------------------------------
say "Writing docker/nginx.conf"
mkdir -p docker
sed \
  -e "s/__WEB_DOMAIN__/${WEB_DOMAIN}/g" \
  -e "s/__API_DOMAIN__/${API_DOMAIN}/g" \
  -e "s/__SCHOOL_DOMAIN__/${SCHOOL_DOMAIN}/g" \
  docker/nginx.conf.template > docker/nginx.conf

# ---------- 4. pack + upload source ----------------------------------------
say "Deploy changelog"
PREV_SHA="$(rssh "cat '$REMOTE_DIR/last-deploy.sha' 2>/dev/null" 2>/dev/null | tr -d '\r\n' || true)"
CHANGELOG="$("$CHANGELOG_SH" "$PREV_SHA" 2>/dev/null || echo '(changelog unavailable)')"
printf '%s\n' "$CHANGELOG"
bash "$NOTIFY_TG" INFO "deploy starting" "$CHANGELOG" || true
pause "Review the changelog above, then press Enter to pack and deploy (or Ctrl-C to abort)..."

verify_main
say "Packing source"
BUNDLE=".deploy-src.tar.gz"
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -czf "$BUNDLE" \
  --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='build' \
  --exclude='.next' --exclude='coverage' --exclude='.pnpm-store' \
  --exclude='*.apk' --exclude='.deploy-*' \
  --exclude='.env' --exclude='.env.*' \
  --exclude='deploy/prod.env' --exclude='deploy/prod.local.env' \
  --exclude='website/local.db' --exclude='.DS_Store' --exclude='._*' \
  --exclude='*.tsbuildinfo' \
  --exclude='.storybook' --exclude='storybook' \
  --exclude='website/tests' --exclude='server/test' \
  --exclude='.github' \
  server website school docker deploy
echo "Source size: $(du -h "$BUNDLE" | cut -f1)"

say "Preparing remote dir"
rssh "sudo mkdir -p '$REMOTE_DIR' && sudo chown \$(id -u):\$(id -g) '$REMOTE_DIR'"

say "Uploading source"
upload_bundle() {
  local id want got
  id="$(shasum -a 256 "$BUNDLE" | cut -d' ' -f1)"
  rssh "test \"\$(cat '$REMOTE_DIR/src.id' 2>/dev/null)\" = '$id' || rm -f '$REMOTE_DIR/src.tar.gz'"
  rssh "echo '$id' > '$REMOTE_DIR/src.id'"
  for attempt in $(seq 1 10); do
    if rsync -e "ssh $SSHOPTS -p $SSH_PORT" \
         --partial --append --inplace --timeout=120 \
         "$BUNDLE" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/src.tar.gz"; then
      want="$(wc -c < "$BUNDLE" | tr -d ' ')"
      got="$(rssh "stat -c %s '$REMOTE_DIR/src.tar.gz' 2>/dev/null || echo 0" | tr -d '\r')"
      [ "$want" = "$got" ] && return 0
      echo "   size mismatch after upload ($got/$want) — continuing"
    fi
    echo "   upload interrupted — resuming (attempt $attempt/10)"
    sleep 5
  done
  return 1
}
upload_bundle || die "Upload kept dropping. Check the link to $SSH_HOST and re-run."

say "Uploading the private deployment environment"
rssh "umask 077; touch '$REMOTE_DIR/prod.env.next' '$REMOTE_DIR/prod.env'; chmod 600 '$REMOTE_DIR/prod.env.next' '$REMOTE_DIR/prod.env'"
rsync -e "ssh $SSHOPTS -p $SSH_PORT" --timeout=120 \
  "$ENV_FILE" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/prod.env.next" \
  || die "Environment upload failed; the running stack was not changed."
# Keep runtime overrides already on the server. Canonical auth secrets always
# come from this upload. Merge runs ON the VPS so two Macs cannot clobber a
# live edit that happened after we packed.
rssh "tar -xOf '$REMOTE_DIR/src.tar.gz' deploy/preserve-runtime-env.py > '$REMOTE_DIR/preserve-runtime-env.py' && python3 '$REMOTE_DIR/preserve-runtime-env.py' '$REMOTE_DIR/prod.env.next' '$REMOTE_DIR/prod.env'" \
  || die "Could not merge runtime env with the copy on the server."

verify_main
say "Building images ON the server"
# Sequential on purpose: this VPS also runs Pinara and Marymore. Parallel
# Nest + Next builds have starved the other sites. nice + BuildKit
# max-parallelism=1 keeps Next from taking every core during npm/next build.
#
# BUILD_ID + flock: two Macs (or a killed waiter + a retry) must not overlap.
# Tokenized build.done ignores foreign markers; flock refuses a second packer.
BUILD_ID="${DEPLOY_SHA}-$$-$(date +%s)"
LAUNCH_OUT="$(rssh "cat > '$REMOTE_DIR/build.sh' <<'BUILDEOF'
#!/usr/bin/env bash
set -e
ROOT=\"\$(cd \"\$(dirname \"\$0\")\" && pwd)\"
cd \"\$ROOT\"
echo \"\$(date -Is) extract\"
rm -rf src && mkdir -p src && tar xzf src.tar.gz -C src
cd src
export DOCKER_BUILDKIT=1
export BUILDKIT_MAX_PARALLELISM=1
DK=\"sudo nice -n 10 docker build --label org.opencontainers.image.revision=$DEPLOY_SHA --provenance=false --sbom=false\"

echo \"\$(date -Is) api build\"
\$DK --target production -t danika-api:latest -f server/Dockerfile server

echo \"\$(date -Is) website build\"
\$DK \\
  --build-arg NEXT_PUBLIC_APP_URL=__NEXT_PUBLIC_APP_URL__ \\
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=__NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__ \\
  --build-arg NEXT_PUBLIC_LOGGING_LEVEL=__NEXT_PUBLIC_LOGGING_LEVEL__ \\
  --build-arg NEXT_PUBLIC_SCHOOL_URL=__NEXT_PUBLIC_SCHOOL_URL__ \\
  -t danika-website:latest -f website/Dockerfile website

echo \"\$(date -Is) school build\"
\$DK \\
  --build-arg VITE_API_URL=__VITE_API_URL__ \\
  -t danika-school:latest -f school/Dockerfile school

echo \"\$(date -Is) edge build\"
\$DK -t danika-edge:latest -f docker/edge.Dockerfile docker

echo \"\$(date -Is) prune\"
rm -rf \"\$ROOT/src\"
sudo docker image prune -f >/dev/null
sudo docker builder prune -f --keep-storage 2GB >/dev/null || true

echo \"\$(date -Is) images ready\"
BUILDEOF
sed -i 's|__NEXT_PUBLIC_APP_URL__|${NEXT_PUBLIC_APP_URL}|' '$REMOTE_DIR/build.sh'
sed -i 's|__NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__|${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}|' '$REMOTE_DIR/build.sh'
sed -i 's|__NEXT_PUBLIC_LOGGING_LEVEL__|${NEXT_PUBLIC_LOGGING_LEVEL}|' '$REMOTE_DIR/build.sh'
sed -i 's|__NEXT_PUBLIC_SCHOOL_URL__|${NEXT_PUBLIC_SCHOOL_URL}|' '$REMOTE_DIR/build.sh'
sed -i 's|__VITE_API_URL__|${VITE_API_URL}|' '$REMOTE_DIR/build.sh'
chmod +x '$REMOTE_DIR/build.sh'
rm -f '$REMOTE_DIR/build.done' '$REMOTE_DIR/build.log' '$REMOTE_DIR/build.launch'
setsid nohup bash -c \"
  exec 9>\\\"$REMOTE_DIR/build.lock\\\"
  if ! flock -n 9; then
    echo BUILD_BUSY > \\\"$REMOTE_DIR/build.launch\\\"
    exit 0
  fi
  printf '%s\n' \\\"$BUILD_ID\\\" > \\\"$REMOTE_DIR/build.id\\\"
  rm -f \\\"$REMOTE_DIR/build.done\\\"
  echo started > \\\"$REMOTE_DIR/build.launch\\\"
  \\\"$REMOTE_DIR/build.sh\\\" > \\\"$REMOTE_DIR/build.log\\\" 2>&1
  rc=\\\$?
  if [ \\\"\\\$(cat \\\"$REMOTE_DIR/build.id\\\" 2>/dev/null)\\\" = \\\"$BUILD_ID\\\" ]; then
    printf '%s %s\n' \\\"$BUILD_ID\\\" \\\"\\\$rc\\\" > \\\"$REMOTE_DIR/build.done\\\"
  fi
\" </dev/null >/dev/null 2>&1 &
for _ in 1 2 3 4 5 6 7 8 9 10; do
  [ -f '$REMOTE_DIR/build.launch' ] && break
  sleep 0.2
done
cat '$REMOTE_DIR/build.launch' 2>/dev/null || echo started")" || die "Could not start the remote build."
printf '%s\n' "$LAUNCH_OUT" | grep -q BUILD_BUSY \
  && die "Another deploy is already building on the server — wait for it to finish, then re-run."
echo "started (build id ${BUILD_ID})"

say "Waiting for the remote build (reconnects here are normal)"
build_rc=""
for _ in $(seq 1 180); do
  sleep 10
  build_line="$(rssh "cat '$REMOTE_DIR/build.done' 2>/dev/null" 2>/dev/null | tr -d '\r' | head -n 1 || true)"
  if [ -n "$build_line" ]; then
    build_id_got="${build_line%% *}"
    build_rc_got="${build_line#* }"
    if [ "$build_id_got" = "$BUILD_ID" ] && [[ "$build_rc_got" =~ ^[0-9]+$ ]]; then
      build_rc="$build_rc_got"
      break
    fi
  fi
  printf "."
done
echo
[ -n "$build_rc" ] || die "Remote build did not finish within 30 minutes. Check: ssh $SSH_USER@$SSH_HOST 'tail -50 $REMOTE_DIR/build.log'"
if [ "$build_rc" != "0" ]; then
  FAIL_TAIL="$(rssh "grep -v 'LIBARCHIVE\\|Ignoring unknown' '$REMOTE_DIR/build.log' | tail -40" 2>/dev/null || true)"
  printf '%s\n' "$FAIL_TAIL"
  bash "$NOTIFY_TG" CRITICAL "deploy build failed" "exit $build_rc — old containers still serving.

$FAIL_TAIL" || true
  die "Build failed on the server (exit $build_rc) — nothing was restarted, the old containers are still serving."
fi
say "Build finished on the server"

verify_main
[ "$(git rev-parse HEAD)" = "$DEPLOY_SHA" ] || die "Source changed after build. Rebuild before deployment."
say "(Re)starting the stack on the server"
REMOTE_RUN="
set -e
cd '$REMOTE_DIR'
sudo docker network create danika 2>/dev/null || true
REDIS_PASS=\"\$(grep -E '^REDIS_PASSWORD=' '$REMOTE_DIR/prod.env' | cut -d= -f2-)\"

sudo docker volume create danika-redis-data 2>/dev/null || true
if ! sudo docker inspect -f '{{.State.Running}}' danika-redis 2>/dev/null | grep -q true; then
  sudo docker rm -f danika-redis 2>/dev/null || true
  if [ -n \"\$REDIS_PASS\" ]; then
    sudo docker run -d --name danika-redis --network danika --network-alias redis --restart unless-stopped \\
      --memory 256m --cpus 0.5 --pids-limit 128 \\
      -v danika-redis-data:/data \\
      redis:7-alpine redis-server --appendonly yes --requirepass \"\$REDIS_PASS\"
  else
    sudo docker run -d --name danika-redis --network danika --network-alias redis --restart unless-stopped \\
      --memory 256m --cpus 0.5 --pids-limit 128 \\
      -v danika-redis-data:/data \\
      redis:7-alpine redis-server --appendonly yes
  fi
fi

# Prove the new image can reach Postgres, then migrate, before stopping the live API.
sudo docker run --rm --network danika $DNS_FLAGS \\
  --memory 256m --cpus 0.5 \\
  --env-file '$REMOTE_DIR/prod.env' --entrypoint node danika-api:latest \\
  --input-type=module -e 'import pg from \"pg\"; const c = new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000}); await c.connect(); await c.query(\"SELECT 1\"); await c.end();'

sudo docker run --rm --network danika $DNS_FLAGS \\
  --memory 512m --cpus 1 --pids-limit 256 \\
  --env-file '$REMOTE_DIR/prod.env' danika-api:latest \\
  true

sudo docker stop -t 20 danika-api 2>/dev/null || true
sudo docker rm -f danika-api 2>/dev/null || true
sudo docker run -d --name danika-api --network danika --network-alias api --restart unless-stopped \\
  --memory 768m --cpus 1 --pids-limit 256 \\
  $DNS_FLAGS \\
  --env-file '$REMOTE_DIR/prod.env' \\
  danika-api:latest

sudo docker stop -t 20 danika-website 2>/dev/null || true
sudo docker rm -f danika-website 2>/dev/null || true
sudo docker run -d --name danika-website --network danika --network-alias website --restart unless-stopped \\
  --memory 512m --cpus 1 --pids-limit 256 \\
  $DNS_FLAGS \\
  --env-file '$REMOTE_DIR/prod.env' \\
  -e PORT=3000 -e HOSTNAME=0.0.0.0 \\
  danika-website:latest

sudo docker stop -t 10 danika-school 2>/dev/null || true
sudo docker rm -f danika-school 2>/dev/null || true
sudo docker run -d --name danika-school --network danika --network-alias school --restart unless-stopped \\
  --memory 128m --cpus 0.25 --pids-limit 64 \\
  danika-school:latest

sudo docker rm -f danika-edge 2>/dev/null || true
sudo docker run -d --name danika-edge --network danika --restart unless-stopped \\
  --memory 64m --cpus 0.25 --pids-limit 64 \\
  -p ${EDGE_PORT}:80 danika-edge:latest

api_ok=0
web_ok=0
school_ok=0
for attempt in \$(seq 1 45); do
  if curl -fsS --max-time 3 -H 'Host: ${API_DOMAIN}' http://127.0.0.1:${EDGE_PORT}/health >/dev/null; then api_ok=1; fi
  if curl -fsS --max-time 3 -H 'Host: ${WEB_DOMAIN}' http://127.0.0.1:${EDGE_PORT}/ >/dev/null; then web_ok=1; fi
  if curl -fsS --max-time 3 -H 'Host: ${SCHOOL_DOMAIN}' http://127.0.0.1:${EDGE_PORT}/ >/dev/null; then school_ok=1; fi
  [ \$api_ok = 1 ] && [ \$web_ok = 1 ] && [ \$school_ok = 1 ] && break
  sleep 2
done
[ \$api_ok = 1 ] || { echo 'Production API health check failed' >&2; sudo docker logs --tail 80 danika-api >&2 || true; exit 1; }
[ \$web_ok = 1 ] || { echo 'Production website health check failed' >&2; sudo docker logs --tail 80 danika-website >&2 || true; exit 1; }
[ \$school_ok = 1 ] || { echo 'Production school health check failed' >&2; sudo docker logs --tail 80 danika-school >&2 || true; exit 1; }
sudo docker ps --filter name=danika
"
rssh "$REMOTE_RUN"

[ "$(rssh "sudo docker inspect danika-edge --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}'")" = "$DEPLOY_SHA" ] || die "Deployed edge revision does not match main."
DEPLOY_SHORT="$(git rev-parse --short HEAD 2>/dev/null || echo "$DEPLOY_SHA")"
rssh "printf '%s\n' '$DEPLOY_SHA' > '$REMOTE_DIR/last-deploy.sha'" 2>/dev/null || true
bash "$NOTIFY_TG" INFO "deploy live" "$DEPLOY_SHORT on $WEB_DOMAIN / $SCHOOL_DOMAIN / $API_DOMAIN" || true

rm -f "$BUNDLE"
printf "\n\033[1;32mDONE.\033[0m  web: https://%s   school: https://%s   api: https://%s\n" "$WEB_DOMAIN" "$SCHOOL_DOMAIN" "$API_DOMAIN"
echo   "Re-run this file any time to update. Logs:  ssh ${SSH_USER}@${SSH_HOST} 'sudo docker logs -f danika-api'"
pause "Press Enter to close..."
