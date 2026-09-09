-- Atomic message quota consumption for billing gates
create or replace function public.consume_message_quota(
  p_user_id uuid,
  p_month text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_limit is null or p_limit < 0 then
    return false;
  end if;

  insert into public.usage_monthly (user_id, month, messages_count)
  values (p_user_id, p_month, 1)
  on conflict (user_id, month)
  do update
    set messages_count = public.usage_monthly.messages_count + 1
  where public.usage_monthly.messages_count < p_limit
  returning messages_count into updated_count;

  return updated_count is not null;
end;
$$;

revoke all on function public.consume_message_quota(uuid, text, integer) from public;
grant execute on function public.consume_message_quota(uuid, text, integer) to service_role;

-- Tighten match_chunks: service role only (backend uses service key)
revoke all on function public.match_chunks(vector, uuid, int) from public;
revoke all on function public.match_chunks(vector, uuid, int) from anon, authenticated;
grant execute on function public.match_chunks(vector, uuid, int) to service_role;
