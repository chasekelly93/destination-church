-- The church only matches up to $100,000 total, not unlimited. Beyond that,
-- individual pledges count on their own without doubling.

drop view if exists public.pledge_summary;

create view public.pledge_summary
with (security_invoker = true) as
select
  count(*) filter (where cancelled_at is null)::int as pledge_count,
  coalesce(sum(amount) filter (where cancelled_at is null), 0)::numeric(14, 2) as individual_total,
  least(coalesce(sum(amount) filter (where cancelled_at is null), 0), 100000)::numeric(14, 2) as church_match,
  (
    coalesce(sum(amount) filter (where cancelled_at is null), 0)
    + least(coalesce(sum(amount) filter (where cancelled_at is null), 0), 100000)
  )::numeric(14, 2) as total_with_match
from public.pledges;
