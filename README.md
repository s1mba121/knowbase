# Knowbase

Fullstack MVP: upload SaaS docs → ChatGPT-style assistant + embeddable website widget.

```
knowbase/
├── frontend/          # React + Vite + Tailwind (app, landing, widget)
├── backend/           # Fastify API (RAG, billing, widget public API)
├── docker/            # Nginx config for the web image
├── Dockerfile.api
├── Dockerfile.web
├── docker-compose.yml
├── package.json       # npm workspaces
└── README.md
```

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, Vite, Tailwind, React Router |
| Backend | Node.js, Fastify (module monolith) |
| Data / Auth | Supabase (Auth, Postgres, Storage, pgvector) |
| AI | OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) |
| Billing | Stripe Checkout (test) |

## Prerequisites

- Node.js 20+ **or** Docker / Docker Compose
- Supabase project
- OpenAI API key
- (Optional) Stripe test keys

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Enable the **vector** extension (Database → Extensions).
2. Run migrations in order in the SQL Editor:
   - [`backend/supabase/migrations/001_initial.sql`](backend/supabase/migrations/001_initial.sql)
   - [`backend/supabase/migrations/002_security_hardening.sql`](backend/supabase/migrations/002_security_hardening.sql)
   - [`backend/supabase/migrations/003_scale_hardening.sql`](backend/supabase/migrations/003_scale_hardening.sql)
   - [`backend/supabase/migrations/004_ops_hardening.sql`](backend/supabase/migrations/004_ops_hardening.sql)
3. Auth → Email: for local demo, disable **Confirm email**.

### 3. Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill Supabase URL + **Publishable** / **Secret** keys (dashboard names; legacy anon/service_role aliases still work), and `OPENAI_API_KEY`.

Frontend needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. For local Vite, API defaults to `http://localhost:3001`; in Docker leave `VITE_API_URL` empty (same-origin via nginx).

### 4. Run (local Node)

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

- App: http://localhost:5173  
- API: http://localhost:3001/health  
- Metrics: http://localhost:3001/metrics  

### 4b. Run with Docker

Builds and starts API + web (Nginx) from one compose file. Supabase / OpenAI / Stripe stay external (SaaS).

```bash
cp .env.docker.example .env
# fill SUPABASE_*, VITE_SUPABASE_*, OPENAI_API_KEY (and optional Stripe)

docker compose up --build
# or: npm run docker:up
```

- App: http://localhost:8080  
- API: http://localhost:3001  
- Redis: localhost:6379 (shared rate-limit store; API connects via `REDIS_URL=redis://redis:6379`)  
- Health: http://localhost:3001/health  

Optional dedicated ingest worker:

```bash
# set INGEST_EMBEDDED_WORKER=false in .env
docker compose --profile worker up --build
```

Stop: `docker compose down` / `npm run docker:down`.

Build the embed widget (served by the API) when developing locally without Docker:

```bash
npm run build:widget
```

## Scale & reliability

Built as a module monolith with explicit backpressure (interview-friendly, production-shaped):

| Concern | Approach |
|---------|----------|
| Sync ingest blocking chat | Upload stores file + enqueues **Postgres `ingest_jobs`** (SKIP LOCKED); extract/embed in embedded or dedicated worker |
| Vector search cost | **HNSW** index + `hnsw.ef_search` inside `match_chunks`; conversation/message indexes |
| Hot path DB chatter | TTL caches for published bots / plans; history `LIMIT` in SQL; conversation list via RPC; narrow bot selects |
| OpenAI storms | Shared **semaphore** (`OPENAI_MAX_INFLIGHT`) + **retry/backoff** on 429/5xx |
| Abuse / multi-instance | Widget + app chat rate limits; **Redis** shared store in Docker; atomic message quota RPC |
| Billing safety | Stripe webhook **idempotency** via `stripe_events` |
| Ops | `/health`, `/ready`, `/metrics`; `x-request-id` in logs + responses; graceful SIGTERM drain |

Env knobs: `INGEST_CONCURRENCY`, `INGEST_MAX_QUEUED`, `OPENAI_MAX_INFLIGHT`, `INGEST_EMBEDDED_WORKER`, `REDIS_URL`.

Dedicated worker (optional):

```bash
# API without embedded poller
INGEST_EMBEDDED_WORKER=false npm run dev:api

# separate terminal
npm run worker -w knowbase-backend
```

Smoke concurrency against the API (no auth):

```bash
npm run load:smoke
# or: node scripts/load-smoke.mjs http://localhost:3001 40 200
```

Next steps when traffic grows: always-on Redis + multiple API replicas, horizontal worker replicas, object-storage CDN for uploads.

## Demo flow

1. Sign up → create a bot.
2. Upload [`frontend/sample-docs/getting-started.md`](frontend/sample-docs/getting-started.md).
3. Playground → ask a question (answers include source citations + Markdown).
4. Settings → publish → copy embed snippet.
5. Billing → Stripe test Checkout (`4242…`).

Embed smoke test: open http://localhost:5173/embed-demo.html with your `pk_…` key.

## Scripts

| Command | What |
|---------|------|
| `npm run dev:api` | Backend on :3001 |
| `npm run dev:web` | Frontend on :5173 |
| `npm run build:widget` | Write `backend/public/widget.js` |
| `npm run build` | Production builds |
| `npm run load:smoke` | Concurrent `/health` `/ready` `/metrics` latency sample |
| `npm run test -w knowbase-backend` | Backend unit + ops inject tests |
| `npm run worker -w knowbase-backend` | Dedicated Postgres ingest worker |
| `npm run docker:up` | Build & run API + web via Docker Compose |
| `npm run docker:down` | Stop Compose stack |

## Notes

- Secrets stay in `.env` (gitignored). Only `.env.example` is committed.
- Free plan: watermark on embed, limited bots/docs/messages.
- Custom brand color requires Pro/Business.
- If Stripe is enabled, set `STRIPE_WEBHOOK_SECRET` (required at boot).
