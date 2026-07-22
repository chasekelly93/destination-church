-- The blanket unique constraint on email blocked re-submission forever
-- after any cancellation, which wasn't the intent -- "removed" was meant
-- to free someone up, not permanently lock them out. Scope uniqueness to
-- active (non-cancelled) pledges only. Same SQLSTATE (23505) on violation,
-- so the app's existing duplicate-detection code needs no changes.

alter table public.pledges drop constraint if exists pledges_email_key;

create unique index if not exists pledges_email_active_unique
  on public.pledges (email)
  where cancelled_at is null;
