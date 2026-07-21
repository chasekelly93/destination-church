-- Allow existing admins to view and add to admin_allowlist from the
-- dashboard itself, instead of requiring SQL/Table Editor for every add.
-- Non-admins get no access: is_admin_email() gates both policies.

drop policy if exists "admins can view admin allowlist" on public.admin_allowlist;
create policy "admins can view admin allowlist"
  on public.admin_allowlist
  for select
  to authenticated
  using (public.is_admin_email(auth.jwt() ->> 'email'));

drop policy if exists "admins can add admins" on public.admin_allowlist;
create policy "admins can add admins"
  on public.admin_allowlist
  for insert
  to authenticated
  with check (public.is_admin_email(auth.jwt() ->> 'email'));
