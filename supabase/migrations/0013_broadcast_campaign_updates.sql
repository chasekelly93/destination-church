-- Broadcasts a no-PII "something changed" ping whenever a pledge is
-- inserted or updated (insert = new pledge, update = e.g. cancellation).
-- private=false means this is a fully public channel anyone can listen to
-- without auth -- safe because the payload carries no pledge data at all,
-- just a timestamp telling listeners to re-fetch from the safe aggregate
-- functions/RLS-scoped queries they already use.

create or replace function public.notify_campaign_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object('updated_at', now()),
    'pledge_updated',
    'campaign-updates',
    false
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists pledges_notify_campaign_update on public.pledges;
create trigger pledges_notify_campaign_update
  after insert or update on public.pledges
  for each row
  execute function public.notify_campaign_update();
