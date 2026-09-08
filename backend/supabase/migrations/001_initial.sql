-- Knowbase initial schema
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);

-- Billing (created early for signup trigger)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  messages_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bots
create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  system_prompt text not null default 'You are a helpful support assistant. Answer only using the provided documentation context.',
  welcome_message text not null default 'Hi! Ask me anything about our product.',
  primary_color text not null default '#0F766E',
  public_key text not null unique,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bots_owner_id_idx on public.bots(owner_id);
create index if not exists bots_public_key_idx on public.bots(public_key);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  bytes integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_bot_id_idx on public.documents(bot_id);

-- Chunks with embeddings
create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  chunk_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chunks_bot_id_idx on public.chunks(bot_id);
create index if not exists chunks_document_id_idx on public.chunks(document_id);

-- Conversations & messages
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  visitor_id text,
  channel text not null check (channel in ('app', 'widget')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_bot_id_idx on public.conversations(bot_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- Vector search RPC
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
language sql
stable
as $$
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
$$;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bots_updated_at on public.bots;
create trigger bots_updated_at before update on public.bots
  for each row execute function public.set_updated_at();

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_monthly enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "bots_owner_all" on public.bots;
create policy "bots_owner_all" on public.bots for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "documents_owner_all" on public.documents;
create policy "documents_owner_all" on public.documents for all
  using (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()));

drop policy if exists "chunks_owner_select" on public.chunks;
create policy "chunks_owner_select" on public.chunks for select
  using (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()));

drop policy if exists "conversations_owner_select" on public.conversations;
create policy "conversations_owner_select" on public.conversations for select
  using (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()));

drop policy if exists "messages_owner_select" on public.messages;
create policy "messages_owner_select" on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      join public.bots b on b.id = c.bot_id
      where c.id = conversation_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "usage_select_own" on public.usage_monthly;
create policy "usage_select_own" on public.usage_monthly for select using (auth.uid() = user_id);

drop policy if exists "documents_storage_owner" on storage.objects;
create policy "documents_storage_owner"
  on storage.objects for all
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Grant RPC (service role bypasses RLS)
grant execute on function public.match_chunks(vector, uuid, int) to service_role;
grant execute on function public.match_chunks(vector, uuid, int) to authenticated;
