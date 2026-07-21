-- Pledge campaign schema: pledges table (one-time, immutable) + admin allowlist.

create table if not exists public.pledges (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  address text,
  amount numeric(12, 2) not null check (amount > 0),
  highlevel_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.pledges enable row level security;
alter table public.admin_allowlist enable row level security;

-- Security-definer helper so RLS policies can check the allowlist without
-- needing a select policy on admin_allowlist itself.
create or replace function public.is_admin_email(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_allowlist where email = lower(check_email)
  );
$$;

-- Public pledge form can insert. No update/delete policy exists for anyone,
-- which makes pledges immutable once submitted (one-time by design).
drop policy if exists "public can submit a pledge" on public.pledges;
create policy "public can submit a pledge"
  on public.pledges
  for insert
  to anon
  with check (true);

-- Only allowlisted, authenticated admins can read pledge data.
drop policy if exists "admins can view pledges" on public.pledges;
create policy "admins can view pledges"
  on public.pledges
  for select
  to authenticated
  using (public.is_admin_email(auth.jwt() ->> 'email'));

-- Aggregate view for the dashboard: pledge count, individual total, and the
-- total including the church's dollar-for-dollar match.
create or replace view public.pledge_summary
with (security_invoker = true) as
select
  count(*)::int as pledge_count,
  coalesce(sum(amount), 0)::numeric(14, 2) as individual_total,
  (coalesce(sum(amount), 0) * 2)::numeric(14, 2) as total_with_match
from public.pledges;
