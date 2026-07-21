# AI Studio Mirror

This folder is a manually-kept mirror of the pledge campaign project as it
actually exists in GHL AI Studio. It is **not built or deployed from here**
— AI Studio isn't connected to this repo (yet; a future connection has been
mentioned). This is a record of what's live, kept in sync by hand whenever a
change is made in AI Studio.

Only files we've actually authored/changed are mirrored here — the rest of
the AI Studio scaffold (shadcn `components/ui/*`, hooks, base styles, etc.)
is generated boilerplate from the AI Studio project template and isn't
duplicated here.

Files:
- `package.json` — full dependency list, including `@supabase/supabase-js`
  which we added.
- `src/App.tsx` — router setup; `/` maps to the pledge form.
- `src/lib/supabase.ts` — Supabase client, shared by all pages.
- `src/pages/Index.tsx` — the public pledge form (home route).
