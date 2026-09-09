-- Scale: ANN index for RAG, conversation list RPC, usage aggregates, supporting indexes

-- Cosine HNSW for match_chunks (<=> / vector_cosine_ops)
create index if not exists chunks_embedding_hnsw_idx
  on public.chunks
  using hnsw (embedding vector_cosine_ops);

-- Speeds listConversations / prepareRag history
create index if not exists conversations_bot_channel_updated_idx
  on public.conversations (bot_id, channel, updated_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Lightweight conversation list (no nested full message payloads)
create or replace function public.list_bot_conversations(
  p_bot_id uuid,
  p_channel text,
  p_limit int default 50
)
returns table (
  id uuid,
  channel text,
  visitor_id text,
  created_at timestamptz,
  updated_at timestamptz,
  preview text,
  message_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.channel,
    c.visitor_id,
    c.created_at,
    c.updated_at,
    coalesce(
      (
        select left(regexp_replace(trim(m.content), '\s+', ' ', 'g'), 72)
        from public.messages m
        where m.conversation_id = c.id
          and m.role = 'user'
        order by m.created_at asc
        limit 1
      ),
      'New chat'
    ) as preview,
    (
      select count(*)::bigint
      from public.messages m
      where m.conversation_id = c.id
    ) as message_count
  from public.conversations c
  where c.bot_id = p_bot_id
    and c.channel = p_channel
  order by c.updated_at desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

revoke all on function public.list_bot_conversations(uuid, text, int) from public;
grant execute on function public.list_bot_conversations(uuid, text, int) to service_role;

-- Document count + bytes without shipping all rows to the API
create or replace function public.bot_document_usage(p_bot_id uuid)
returns table (
  doc_count bigint,
  total_bytes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as doc_count,
    coalesce(sum(d.bytes), 0)::bigint as total_bytes
  from public.documents d
  where d.bot_id = p_bot_id;
$$;

revoke all on function public.bot_document_usage(uuid) from public;
grant execute on function public.bot_document_usage(uuid) to service_role;
