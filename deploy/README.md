# Danika production deploy

Iran VPS origin for `danikahub.ir` (same server as Marymore / Pinara). Source is packed on your Mac, uploaded, and **built on the server**. The VPS only needs Docker.

```
Mac: pack source  ──rsync──►  VPS: docker build (sequential) → migrate → docker run
                                      │
                                      ▼
                            danika-edge host :8081
                                      ▲
Arvan CDN (TLS) → origin :80 (Pinara edge) ──Host: danikahub.ir──┘
```

A failed build does **not** restart containers. The previous stack keeps serving.

## Shared VPS isolation

This box also hosts Pinara and Marymore. Danika must not steal their ports, dirs, or container names.

| Resource | Pinara | Marymore | Danika |
| Host port | `:80` | `:8080` | **`:8081`** |
| Remote dir | `/opt/pinara` | `/opt/marymore` | **`/opt/danika`** |
| Docker names | pinara-* | marymore-* | **danika-*** / `danika` network |

Hard rules:

- Never publish host `:80`. `EDGE_PORT` defaults to 8081. Pinara's nginx is the public multiplexer.
- Never `ufw reset`. Init only **adds** TCP 8081 (Pinara proxies loopback to it).
- Builds run **one image at a time** so Nest + Next do not starve the other sites.
- `docker ps` is filtered to `danika`. Redis is left running unless it is missing.

### Hosts

| Host | Upstream |
|------|----------|
| `danikahub.ir` | marketing website (via Pinara edge `:80` → Danika `:8081` by Host) |
| `www.danikahub.ir` | HTTP redirect → apex at origin (CDN serves public HTTPS) |
| `school.danikahub.ir` | school SPA |
| `api.danikahub.ir` | Nest API |

`pinarapp.ir` / `marymoremade.com` stay on Pinara `:80` and Marymore `:8080`. They never enter `danika-edge`.

## Layout

```
deploy.command                  # Mac entry (npm run deploy)
.deploy.conf                    # gitignored — SSH
deploy/
  README.md
  changelog.sh
  notify-telegram.sh            # no-op unless TELEGRAM_* is in prod.env
  preserve-runtime-env.py
  test_preserve_runtime_env.py
  prod.env.example              # key mirror (committed)
  prod.env                      # gitignored — app secrets
  prod.local.env                # gitignored — optional override
  scripts/init-danika-vps.sh    # one-time: /opt/danika + UFW 8081
docker/
  nginx.conf.template
  nginx.conf                    # filled by deploy.command
  edge.Dockerfile
```

On the VPS after deploy:

```
/opt/danika/
  src/                 # extracted tarball
  prod.env             # merged on the server (runtime overrides kept)
  last-deploy.sha
  build.log
```

## One-time setup

```bash
cp .deploy.conf.sample .deploy.conf
chmod 600 .deploy.conf
cp deploy/prod.env.example deploy/prod.env
chmod 600 deploy/prod.env
```

1. Fill SSH in `.deploy.conf` if the defaults are wrong (`SSH_HOST=95.38.161.61`, `REMOTE_DIR=/opt/danika`, `EDGE_PORT=8081`).
2. Fill `deploy/prod.env` (no quotes around values):
   - `DATABASE_URL` — Arvan `danika_app` / `danika`
   - `AUTH_ACCESS_TOKEN_SECRET` / `AUTH_REFRESH_TOKEN_SECRET`
   - `REDIS_URL` / `REDIS_PASSWORD`
   - `WEB_URL=https://danikahub.ir`, `NEXT_PUBLIC_SCHOOL_URL=https://school.danikahub.ir`, `PUBLIC_URL=https://api.danikahub.ir`
   - Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
   - Optional: `TELEGRAM_BOT_TOKEN` / `TELEGRAM_OPS_CHAT_ID` for deploy notices
3. On the VPS (once): `bash deploy/scripts/init-danika-vps.sh`
4. Redeploy **Pinara** once so `pinara-edge` Host-forwards `danikahub.ir` → `:8081` (same pattern as Marymore → `:8080`).
5. Arvan CDN for `danikahub.ir`, `www`, `school.danikahub.ir`, `api.danikahub.ir`: origin = VPS IP, **HTTP**, **port 80** (Pinara). Direct `:8081` is only the inner origin.

## Deploy

Must be a **clean, pushed `main`**. From the **repo root**:

```bash
npm run deploy
# or
bash deploy.command

DEPLOY_NONINTERACTIVE=1 bash deploy.command
```

Needs on Mac: `rsync`, `ssh` (key login), `python3` (env-merge tests / Telegram JSON). Images build on the server — Docker Desktop is not required.

Watch remote progress:

```bash
ssh -p 22 root@95.38.161.61 'tail -f /opt/danika/build.log'
```

Env merge test (local):

```bash
python3 -m unittest deploy/test_preserve_runtime_env.py
```

## Apps shipped

`server` (Nest API) + `website` (Next on `danikahub.ir`) + `school` (Vite SPA on `school.danikahub.ir`).
