-- Dev password set to a fixed value (see chat/Supabase for the value,
-- never committed here).
update public.system_secrets set value = 'REPLACED_AT_APPLY_TIME' where key = 'dev_admin_password';

-- Soft-delete instead of real delete/update, preserving the audit trail.
alter table public.pledges add column if not exists cancelled_at timestamptz;

create or replace view public.pledge_summary
with (security_invoker = true) as
select
  count(*) filter (where cancelled_at is null)::int as pledge_count,
  coalesce(sum(amount) filter (where cancelled_at is null), 0)::numeric(14, 2) as individual_total,
  (coalesce(sum(amount) filter (where cancelled_at is null), 0) * 2)::numeric(14, 2) as total_with_match
from public.pledges;

-- Narrow function: only ever sets cancelled_at, nothing else about a pledge
-- can be changed. Works for a real admin session OR the dev password.
create or replace function public.cancel_pledge(p_email text, p_dev_password text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin_email(coalesce(auth.jwt() ->> 'email', ''));
  v_is_dev boolean := p_dev_password is not null
    and p_dev_password = (select value from public.system_secrets where key = 'dev_admin_password');
begin
  if not (v_is_admin or v_is_dev) then
    raise exception 'not authorized';
  end if;

  update public.pledges
  set cancelled_at = now()
  where email = lower(p_email);
end;
$$;

grant execute on function public.cancel_pledge(text, text) to authenticated, anon;

-- Dev-mode parity: adding admins and seeing the admin list, gated by the
-- same dev password rather than a real session.
create or replace function public.dev_add_admin(p_password text, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password is distinct from (select value from public.system_secrets where key = 'dev_admin_password') then
    raise exception 'invalid password';
  end if;

  insert into public.admin_allowlist (email) values (lower(p_email))
  on conflict (email) do nothing;
end;
$$;

grant execute on function public.dev_add_admin(text, text) to anon;

create or replace function public.dev_get_dashboard(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pledges jsonb;
  v_summary jsonb;
  v_admins jsonb;
begin
  if p_password is distinct from (select value from public.system_secrets where key = 'dev_admin_password') then
    raise exception 'invalid password';
  end if;

  select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) into v_pledges
  from (
    select full_name, email, phone, amount, created_at
    from public.pledges
    where cancelled_at is null
    order by created_at desc
  ) p;

  select to_jsonb(s) into v_summary
  from public.pledge_summary s;

  select coalesce(jsonb_agg(email order by email), '[]'::jsonb) into v_admins
  from public.admin_allowlist;

  return jsonb_build_object('pledges', v_pledges, 'summary', v_summary, 'admins', v_admins);
end;
$$;

grant execute on function public.dev_get_dashboard(text) to anon;
