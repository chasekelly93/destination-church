-- Public, no-auth-required aggregate totals only. Does not grant any
-- access to the pledges table itself or any per-person data -- only
-- exposes the four numbers already computed by pledge_summary.

create or replace function public.get_public_campaign_totals()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(s) from public.pledge_summary s;
$$;

grant execute on function public.get_public_campaign_totals() to anon;
