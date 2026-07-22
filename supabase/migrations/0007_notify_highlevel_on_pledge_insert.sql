-- The actual automation link: fires the moment a real pledge is inserted,
-- notifying HighLevel automatically. Until now, everything tested was a
-- manual curl command standing in for this trigger.
--
-- The webhook URL below is a placeholder. Unlike the anon key, HighLevel's
-- Inbound Webhook URL has no auth of its own -- anyone holding it can
-- trigger real contact creation in the live HighLevel account, so it's not
-- committed here. See chat history / the applied database for the real
-- value.

create or replace function public.notify_highlevel_on_pledge()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'REPLACE_WITH_HIGHLEVEL_INBOUND_WEBHOOK_URL',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := to_jsonb(NEW)
  );
  return NEW;
end;
$$;

drop trigger if exists pledges_notify_highlevel on public.pledges;
create trigger pledges_notify_highlevel
  after insert on public.pledges
  for each row
  execute function public.notify_highlevel_on_pledge();
