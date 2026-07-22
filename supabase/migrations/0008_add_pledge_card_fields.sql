-- Match the physical Breakout pledge card exactly: split address into real
-- components, and capture fulfillment method, non-cash gifts, and the
-- "have questions, no firm number yet" path.

alter table public.pledges drop column if exists address;

alter table public.pledges
  add column if not exists street_address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text,
  add column if not exists fulfillment_method text
    check (fulfillment_method in ('monthly', 'one_time', 'other')),
  add column if not exists fulfillment_date date,
  add column if not exists fulfillment_other_detail text,
  add column if not exists includes_non_cash_gift boolean not null default false,
  add column if not exists non_cash_gift_detail text,
  add column if not exists has_questions boolean not null default false;

-- amount is now optional: someone can register interest via "has questions"
-- without a firm number yet. Still must be positive when present.
alter table public.pledges alter column amount drop not null;
alter table public.pledges drop constraint if exists pledges_amount_check;
alter table public.pledges add constraint pledges_amount_check
  check (amount is null or amount > 0);

-- Can't submit with neither a commitment nor a reason.
alter table public.pledges drop constraint if exists pledges_amount_or_questions_check;
alter table public.pledges add constraint pledges_amount_or_questions_check
  check (amount is not null or has_questions = true);
