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
