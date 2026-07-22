-- Read-only dev-password bypass for /admin, for testing without waiting on
-- magic-link email. Cannot add admins (that still requires a real session)
-- and only exposes the same read-only dashboard data pledges/pledge_summary
-- already expose to real admins. The actual password is generated at
-- apply-time and never committed to source control.

insert into public.system_secrets (key, value)
values (
  'dev_admin_password',
  substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
)
on conflict (key) do nothing;

create or replace function public.dev_get_dashboard(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pledges jsonb;
  v_summary jsonb;
begin
  if p_password is distinct from (select value from public.system_secrets where key = 'dev_admin_password') then
    raise exception 'invalid password';
  end if;

  select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) into v_pledges
  from (
    select full_name, email, phone, amount, created_at
    from public.pledges
    order by created_at desc
  ) p;

  select to_jsonb(s) into v_summary
  from public.pledge_summary s;

  return jsonb_build_object('pledges', v_pledges, 'summary', v_summary);
end;
$$;

grant execute on function public.dev_get_dashboard(text) to anon;
