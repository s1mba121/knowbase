-- Durable ingest jobs, Stripe webhook idempotency, HNSW ef_search tuning

create table if not exists public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ingest_jobs_claim_idx
  on public.ingest_jobs (status, available_at, created_at)
  where status = 'queued';

create index if not exists ingest_jobs_document_id_idx
  on public.ingest_jobs (document_id);

create unique index if not exists ingest_jobs_one_active_per_doc
  on public.ingest_jobs (document_id)
  where status in ('queued', 'running');

drop trigger if exists ingest_jobs_updated_at on public.ingest_jobs;
create trigger ingest_jobs_updated_at before update on public.ingest_jobs
  for each row execute function public.set_updated_at();

alter table public.ingest_jobs enable row level security;

-- Claim jobs with SKIP LOCKED (safe for multiple workers)
create or replace function public.claim_ingest_jobs(
  p_worker_id text,
  p_limit int default 1
)
returns setof public.ingest_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select j.id
    from public.ingest_jobs j
    where j.status = 'queued'
      and j.available_at <= now()
    order by j.created_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 1), 1)
  )
  update public.ingest_jobs j
  set
    status = 'running',
    locked_at = now(),
    locked_by = p_worker_id,
    attempts = j.attempts + 1
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;

revoke all on function public.claim_ingest_jobs(text, int) from public;
grant execute on function public.claim_ingest_jobs(text, int) to service_role;

-- Re-queue jobs stuck in running (crashed worker)
create or replace function public.requeue_stale_ingest_jobs(
  p_stale_seconds int default 600
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.ingest_jobs
  set
    status = 'queued',
    locked_at = null,
    locked_by = null,
    available_at = now(),
    last_error = coalesce(last_error, 'requeued: stale lock')
  where status = 'running'
    and locked_at is not null
    and locked_at < now() - make_interval(secs => greatest(p_stale_seconds, 60));

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.requeue_stale_ingest_jobs(int) from public;
grant execute on function public.requeue_stale_ingest_jobs(int) to service_role;

create or replace function public.count_active_ingest_jobs()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.ingest_jobs
  where status in ('queued', 'running');
$$;

revoke all on function public.count_active_ingest_jobs() from public;
grant execute on function public.count_active_ingest_jobs() to service_role;

-- Stripe webhook idempotency
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- Tune ANN probe depth inside match_chunks
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_bot_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  document_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('hnsw.ef_search', '40', true);
  return query
  select
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.document_id
  from public.chunks c
  where c.bot_id = match_bot_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
end;
$$;

revoke all on function public.match_chunks(vector, uuid, int) from public;
revoke all on function public.match_chunks(vector, uuid, int) from anon, authenticated;
grant execute on function public.match_chunks(vector, uuid, int) to service_role;
