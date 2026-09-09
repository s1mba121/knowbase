# Knowbase

Fullstack MVP: upload SaaS docs → ChatGPT-style assistant + embeddable website widget.

```
knowbase/
├── frontend/          # React + Vite + Tailwind (app, landing, widget)
├── backend/           # Fastify API (RAG, billing, widget public API)
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

- Node.js 20+
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
3. Auth → Email: for local demo, disable **Confirm email**.

### 3. Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill Supabase URL + publishable/secret (or anon/service_role) keys, and `OPENAI_API_KEY`.

Frontend needs the same Supabase URL + **publishable/anon** key and `VITE_API_URL=http://localhost:3001`.

### 4. Run

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

- App: http://localhost:5173  
- API: http://localhost:3001/health  
- Metrics: http://localhost:3001/metrics  

Build the embed widget (served by the API):

```bash
npm run build:widget
```

## Scale & reliability

Built as a module monolith with explicit backpressure (interview-friendly, production-shaped):

| Concern | Approach |
|---------|----------|
| Sync ingest blocking chat | Upload returns `processing`; extract/embed run on a **bounded queue** (2 concurrent, max 20 queued → HTTP 503) |
| Vector search cost | **HNSW** index on `chunks.embedding` + composite conversation indexes (`003_scale_hardening.sql`) |
| Hot path DB chatter | TTL caches for published bots / plans; history `LIMIT 12` in SQL; conversation list via RPC (no nested message dump) |
| OpenAI storms | Shared **semaphore** (8) around embeddings + chat (held for full SSE lifetime) |
| Abuse | Widget + in-app chat **rate limits**; atomic message quota RPC |
| Ops | `/health`, `/ready`, `/metrics` (p50/p95, ingest + OpenAI gate, RSS); `x-request-id` / `x-response-time`; **graceful SIGTERM drain** |

Smoke concurrency against the API (no auth):

```bash
npm run load:smoke
# or: node scripts/load-smoke.mjs http://localhost:3001 40 200
```

Next steps when traffic grows: Redis rate-limit store across replicas, dedicated ingest worker (BullMQ/Inngest), horizontal API replicas behind a load balancer.

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

## Notes

- Secrets stay in `.env` (gitignored). Only `.env.example` is committed.
- Free plan: watermark on embed, limited bots/docs/messages.
- Custom brand color requires Pro/Business.
- If Stripe is enabled, set `STRIPE_WEBHOOK_SECRET` (required at boot).
