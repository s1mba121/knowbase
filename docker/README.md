# Knowbase Docker notes

## Quick start

```bash
cp .env.docker.example .env
# fill at least: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, OPENAI_API_KEY

docker compose up --build
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:8080 |
| API | http://localhost:3001 |
| Redis | localhost:6379 |
| Health | http://localhost:3001/health |

Stack: **web + api + redis**. Supabase / OpenAI / Stripe stay external SaaS.

API uses Redis for shared rate limits (`REDIS_URL=redis://redis:6379`). Check `/metrics` → `"redis": true`.

## Dynamic domains

Leave these empty so URLs come from the request (`Host` / `X-Forwarded-*` / `Origin`):

```bash
FRONTEND_URL=
BACKEND_URL=
VITE_API_URL=
```

- Browser calls `/v1/...` on the same host (nginx proxies to the API).
- Widget snippet / Stripe redirects use the current public origin.
- CORS allows localhost dev ports + same host as the API (+ optional `APP_ORIGINS`).

Optional overrides only if web and API are on different hosts.

## Production (one domain)

Point the domain at the **web** container (e.g. Cloudflare → `:8080`). Rebuild after changing `VITE_*`:

```bash
docker compose up -d --build web api
```

Also add the domain in Supabase Auth → URL Configuration.

## Profiles

```bash
# Separate ingest worker — set INGEST_EMBEDDED_WORKER=false
docker compose --profile worker up --build
```

## Rebuild after code changes

```bash
docker compose up --build -d
```

Frontend env (`VITE_*`) is baked in at **image build** time. Change `.env` Vite vars → rebuild `web`.

## Widget script

The API serves `backend/public/widget.js`. That file is copied into the API image as-is (no Vite inside the API build).

After changing `frontend/widget/`, regenerate it before `docker compose up --build`:

```bash
npm run build:widget
```
