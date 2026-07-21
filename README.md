# Destination Church Pledge Campaign

Two ways to run the same pledge campaign, both against the same Supabase
backend:

- **`ghl/`** — self-contained static HTML files (no build step, no server)
  meant to be pasted directly into GHL AI Studio's custom HTML block, so
  GHL hosts them. This is the active plan.
- **`app/`** — a Next.js version of the same two pages, useful for local
  development/testing or if you ever want to host outside GHL. Not
  currently deployed anywhere.

Both surfaces:

- Public pledge form (name, email, phone, address, amount). One-time
  only: `email` is unique and the database has no update/delete policy on
  `pledges`, so a submitted pledge can't be changed or duplicated.
- Passwordless admin login (Supabase magic link) showing per-person
  pledges, the individual total, and the total including the church's
  matching pledge (2x individual total).

## Hosting in GHL AI Studio (the plan)

1. Get the anon key: Supabase → `destination-church` project → Project
   Settings → API → "anon public" key.
2. In `ghl/admin-dashboard.html`, replace `REPLACE_WITH_ANON_KEY`. Leave
   `SITE_URL` as-is for now — paste the file into an AI Studio custom
   HTML block and publish it once to get its live URL.
3. Edit `ghl/admin-dashboard.html` again, set `SITE_URL` to that live
   URL, and re-paste/republish.
4. In Supabase: Authentication → URL Configuration → Redirect URLs → add
   that same URL. Magic-link sign-in will fail silently if this step is
   skipped.
5. In `ghl/pledge-form.html`, replace `REPLACE_WITH_ANON_KEY`, then paste
   into another AI Studio custom HTML block and publish.
6. Run the migration below if you haven't, add yourself to
   `admin_allowlist`, and test both pages using their real GHL URLs.

## Local Next.js setup (optional)

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

## Syncing to HighLevel

The Next.js app never talks to HighLevel directly, and there's no
middleware service in between — Supabase's Database Webhook feature posts
straight to HighLevel.

1. **In HighLevel:** create a Workflow with an **Inbound Webhook** trigger.
   Send it one test payload (see shape below) so HighLevel detects the
   fields, then add a **Create/Update Contact** action mapping:
   - `record.full_name` → contact name
   - `record.email` → email
   - `record.phone` → phone
   - `record.address` → address
   - `record.amount` → a custom field (e.g. `pledge_amount`)
   Add a tag (e.g. `pledge-campaign`) on that same contact so it fires
   your reminder sequence.
2. **In Supabase Studio:** Database > Webhooks > create a webhook on
   `pledges` for the `INSERT` event, HTTP method POST, URL = the Inbound
   Webhook URL HighLevel gives you in step 1.

Supabase sends this exact JSON body on every insert — use these paths
when mapping fields in HighLevel's webhook trigger:

```json
{
  "type": "INSERT",
  "table": "pledges",
  "schema": "public",
  "record": {
    "id": "…",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-555-5555",
    "address": "123 Main St",
    "amount": 500.00,
    "highlevel_synced_at": null,
    "created_at": "2026-07-21T00:00:00Z"
  },
  "old_record": null
}
```

Note: Supabase's Database Webhook is fire-and-forget — if HighLevel's
endpoint is briefly down, that one sync isn't retried automatically.
For a one-time pledge form this is an acceptable trade-off, but worth
knowing.
