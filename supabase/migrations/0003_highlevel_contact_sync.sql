-- Lets HighLevel write back its contact ID after syncing a pledge, without
-- opening general UPDATE access to pledges (which stays insert-only/immutable).
-- Access is gated by a random secret generated at apply-time and never
-- committed to source control — see chat history / Supabase for the value.

alter table public.pledges add column if not exists hl_contact_id text;

create table if not exists public.system_secrets (
  key text primary key,
  value text not null
);
alter table public.system_secrets enable row level security;
-- Deliberately no policies: nobody can read/write this via the API.
-- Only SECURITY DEFINER functions (and the SQL editor) can see it.

insert into public.system_secrets (key, value)
values (
  'hl_sync_secret',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
)
on conflict (key) do nothing;

create or replace function public.sync_highlevel_contact(
  p_email text,
  p_hl_contact_id text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from public.system_secrets where key = 'hl_sync_secret') then
    raise exception 'invalid secret';
  end if;

  update public.pledges
  set hl_contact_id = p_hl_contact_id,
      highlevel_synced_at = now()
  where email = lower(p_email);
end;
$$;

grant execute on function public.sync_highlevel_contact(text, text, text) to anon;
