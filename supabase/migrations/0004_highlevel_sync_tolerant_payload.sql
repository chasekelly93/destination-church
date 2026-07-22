-- PostgREST matches RPC calls by exact parameter names, and HighLevel's
-- webhook body editor kept including extra fields (name, phone, etc.)
-- alongside the ones we need, which broke the 3-named-parameter version.
-- Switching to a single jsonb parameter means extra keys are simply
-- ignored instead of causing a "function not found" error.

drop function if exists public.sync_highlevel_contact(text, text, text);

create or replace function public.sync_highlevel_contact(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text := payload->>'p_secret';
  v_email text := payload->>'p_email';
  v_hl_contact_id text := payload->>'p_hl_contact_id';
begin
  if v_secret is distinct from (select value from public.system_secrets where key = 'hl_sync_secret') then
    raise exception 'invalid secret';
  end if;

  update public.pledges
  set hl_contact_id = v_hl_contact_id,
      highlevel_synced_at = now()
  where email = lower(v_email);
end;
$$;

grant execute on function public.sync_highlevel_contact(jsonb) to anon;
