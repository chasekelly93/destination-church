-- dev_get_dashboard needs to return the new pledge-card fields too, so dev
-- mode stays at parity with a real admin session.

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
    select
      full_name, email, phone, amount, created_at,
      street_address, city, state, zip,
      fulfillment_method, fulfillment_date, fulfillment_other_detail,
      includes_non_cash_gift, non_cash_gift_detail, has_questions
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
