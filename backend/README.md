# Backend (API)

Fastify module-monolith for Knowbase. See the [root README](../README.md) for fullstack setup.

```bash
npm run dev -w knowbase-backend
# or from this folder:
npm run dev
```

Modules: `auth`, `bots`, `docs`, `chat`, `widget`, `billing`.  
Migrations: [`supabase/migrations/`](supabase/migrations/).

Ops endpoints: `GET /health`, `GET /ready`, `GET /metrics`.  
Ingest worker: `npm run worker` (or embedded via `INGEST_EMBEDDED_WORKER=true`).  
Tests: `npm test`.  
Load smoke from repo root: `npm run load:smoke`.
