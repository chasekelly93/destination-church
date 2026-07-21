# Destination Church Pledge Campaign

Next.js app with two surfaces:

- `/` — public pledge form (name, email, phone, address, amount). One-time
  only: `email` is unique and the database has no update/delete policy on
  `pledges`, so a submitted pledge can't be changed or duplicated.
- `/admin` → `/admin/dashboard` — passwordless admin login (Supabase magic
  link) showing per-person pledges, the individual total, and the total
  including the church's matching pledge (2x individual total).

## Setup

1. Copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Project Settings > API in the
   `destination-church` Supabase project.
2. Run the migration in `supabase/migrations/0001_init.sql` against that
   project (Supabase Studio SQL Editor, or `supabase db push` if you're
   using the CLI).
3. `npm install`
4. `npm run dev`

## Granting admin dashboard access

The `admin_allowlist` table starts empty on purpose — nobody can view
pledge data until their email is added:

```sql
insert into public.admin_allowlist (email) values ('you@example.com');
```

Login is Supabase's email magic link (no passwords stored). Only emails
present in `admin_allowlist` will see any rows in the dashboard; anyone
else authenticates fine but sees an empty table (RLS filters the rows,
not the login).

## Syncing to HighLevel (n8n)

The Next.js app never talks to HighLevel directly. Instead:

1. In Supabase Studio, go to Database > Webhooks and create a webhook on
   `pledges` for the `INSERT` event, pointing at an n8n webhook URL.
2. The n8n workflow receives the new pledge row (name, email, phone,
   address, amount) and upserts the contact in HighLevel, setting a
   pledge-amount custom field and a tag that fires the reminder sequence.

Exact HighLevel field/tag names to be finalized when that workflow is
built — see project task tracker.
