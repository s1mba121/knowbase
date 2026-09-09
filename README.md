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
2. Run [`backend/supabase/migrations/001_initial.sql`](backend/supabase/migrations/001_initial.sql) in the SQL Editor.
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

Build the embed widget (served by the API):

```bash
npm run build:widget
```

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

## Notes

- Secrets stay in `.env` (gitignored). Only `.env.example` is committed.
- Free plan: watermark on embed, limited bots/docs/messages.
- Custom brand color requires Pro/Business.
- After pull, run `backend/supabase/migrations/002_security_hardening.sql` in the Supabase SQL Editor (atomic message quotas).
- If Stripe is enabled, set `STRIPE_WEBHOOK_SECRET` (required at boot).
