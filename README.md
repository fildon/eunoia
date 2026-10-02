# Eunoia

A personal daily mood tracker. Log a mood + optional tags each day, and see
history and trends over time.

Live at **[eunoia.rupertmckay.com](https://eunoia.rupertmckay.com)**.

## For the user

This app is single-user, restricted to one email address (set via
`ALLOWED_EMAIL`, see below). Nobody else can sign in, even if they find the
URL.

- **Sign in**: enter your email on the login screen and click the link
  Supabase emails you. No password.
- **Today**: pick a mood (1–5, colored red → green) and any tags that
  influenced it. Tags are free text: your existing ones are listed most-used
  first, and "+ Add tag" creates a new one (matching an existing tag
  case-insensitively, so "exercise" reuses "Exercise").
  Saving again the same day updates that day's entry rather than creating a
  new one. "Today" is your device's local date, wherever you are — entries
  are plain calendar dates, like a paper diary.
- **History**: a chronological list of past entries, color-coded by mood.
- **Trends**: mood over time with a 7-day rolling average, plus average mood
  per tag and per weekday, for the last 7/30/90 days or all time. The chart
  is on a calendar time axis, so missed days show as gaps.
- **Sign out**: top-right of the nav bar.

Data is private to your account — stored in Supabase with row-level security
so only you can ever read or write your own entries.

## For the developer

### Stack

- **Next.js 16** (App Router, TypeScript) — deployed on **Vercel**
- **Supabase** — Postgres database + magic-link auth
- **Tailwind CSS v4** — styling, with dark-mode variants throughout
- **Recharts** — trend charts

### Project layout

```
app/
  page.tsx              Today (mood entry form)
  login/page.tsx         Magic-link sign-in
  auth/callback/route.ts OAuth/OTP code exchange
  history/page.tsx       Past entries list
  trends/page.tsx        Charts
  icon.svg               Favicon
components/               UI components (form, nav, history list, chart)
lib/
  supabase/client.ts     Browser Supabase client
  supabase/server.ts     Server Supabase client (Server Components)
  moodEntries.ts         Data access (get/upsert/list mood_entries)
  moodColor.ts            The red→green mood color palette
  date.ts                 YYYY-MM-DD date helpers; day-number arithmetic (DST-safe)
  timeZone.ts             Server-side "today" from the `tz` cookie (the server
                           runs in UTC) — kept in sync by components/TimeZoneSync
proxy.ts                  Session refresh + auth gate (Next.js 16's replacement
                           for middleware.ts) — also enforces the single-user
                           allowlist
supabase/migration.sql    DB schema — run this in the Supabase SQL editor
supabase/rename_legacy_tags.sql
                          One-time rewrite of the old fixed-tag ids to
                           free-text labels, for data from before free-text tags
```

### Local setup

```bash
npm install
# create .env.local with the three values below
npm run dev
```

Env vars (`.env.local`, gitignored):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API Keys (the `anon`/`publishable` one, **not** `service_role`) |
| `ALLOWED_EMAIL` | The one email allowed to sign in — see below |

### The single-user allowlist

Two layers, both required:

1. `app/login/page.tsx` calls `signInWithOtp` with `shouldCreateUser: false`,
   so Supabase refuses to create an account for any email that isn't already
   registered.
2. `proxy.ts` checks the signed-in user's email against `ALLOWED_EMAIL` on
   every request and signs out anyone who doesn't match, as a server-side
   backstop.

To add a second permitted user, you'd need to relax both of these (e.g.
switch `ALLOWED_EMAIL` to a list) — not currently supported.

### Database

Schema, indexes, and row-level security policies all live in
`supabase/migration.sql`. Run it once in the Supabase SQL editor for a new
project; it's idempotent (`create ... if not exists`, `drop policy if
exists`) so it's safe to re-run.

### Deployment

- **Vercel**: connected to `fildon/eunoia` on GitHub, auto-deploys on push to
  `main`. Env vars are set in the Vercel project settings (same three as
  above).
- **Domain**: `eunoia.rupertmckay.com` is a CNAME pointing at Vercel,
  configured in Vercel's Domains settings and at the DNS registrar for
  `rupertmckay.com`.
- **Supabase auth**: the production callback URL
  (`https://eunoia.rupertmckay.com/auth/callback`) must be in Supabase's
  Authentication → URL Configuration → Redirect URLs allow-list, alongside
  `http://localhost:3000/auth/callback` for local dev.

### Customizing colors

Mood colors: edit `MOOD_COLORS` in `lib/moodColor.ts` (keyed by mood value
1–5). Tags need no configuration — they're whatever text you've entered.
Renaming one across past entries means an `array_replace` update in SQL, as
in `supabase/rename_legacy_tags.sql`.
