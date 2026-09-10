# Production deploy (CI/CD)

## One-time GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `45.67.130.32` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | private key for SSH into the VPS |

Generate a deploy-only key:

```bash
ssh-keygen -t ed25519 -f ./knowbase_deploy -N "" -C "knowbase-github-actions"
```

- Public key → VPS `~/.ssh/authorized_keys`
- Private key → GitHub secret `DEPLOY_SSH_KEY`

App path on the server is fixed: `/opt/knowbase`.

## One-time VPS setup

`/opt/knowbase` must be a **git clone** of this repo (not only rsync files), with fetch access to GitHub:

```bash
# on VPS
git clone git@github.com:<org>/<repo>.git /opt/knowbase
# add a read-only deploy key for the repo, or use HTTPS + token
cp /path/to/production.env /opt/knowbase/.env
```

`.env` stays on the server and is never overwritten by CI.

## What runs

**Every PR / push to `main`:** install → `npm test` → `npm run build`

**Push to `main` only:** SSH → `git fetch` + `reset --hard origin/main` → `scripts/server-deploy.sh` (Docker rebuild + health check)

```bash
npm test
npm run build
```

Manual: **Actions → CI → Run workflow**.

## Host nginx (VPS)

Public TLS terminates on Ubuntu nginx → `127.0.0.1:4001` (Docker `web`).  
Upload limit must allow the API multipart cap (20MB):

```nginx
# in server { server_name knowbase.sudohomelab.dpdns.org; ... }
client_max_body_size 25m;
```

Also set in `docker/nginx.conf` inside the web container.

## Supabase (required for auth emails)

**Authentication → URL Configuration**

- Site URL: `https://knowbase.sudohomelab.dpdns.org`
- Redirect URLs: `https://knowbase.sudohomelab.dpdns.org/**` (+ localhost for local)
