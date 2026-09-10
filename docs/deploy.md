# Production deploy (CI/CD)

## One-time GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `45.67.130.32` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | private key for deploy (ed25519) |

Generate a deploy-only key (do not reuse your laptop login key if you prefer):

```bash
ssh-keygen -t ed25519 -f ./knowbase_deploy -N "" -C "knowbase-github-actions"
```

- Public key → server `~/.ssh/authorized_keys`
- Private key → GitHub secret `DEPLOY_SSH_KEY` (full file, including `BEGIN`/`END` lines)

## What runs on push to `main`

1. Checkout
2. `rsync` to `/opt/knowbase` (keeps remote `.env`)
3. `scripts/server-deploy.sh` → `docker compose up -d --build --force-recreate web api`

Manual run: **Actions → Deploy → Run workflow**.

## Supabase (required for auth emails)

**Authentication → URL Configuration**

- Site URL: `https://knowbase.sudohomelab.dpdns.org`
- Redirect URLs: `https://knowbase.sudohomelab.dpdns.org/**` (+ localhost for local)
