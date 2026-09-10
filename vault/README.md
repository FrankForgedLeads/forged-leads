# Beeyond Vault

> "Everything the adjuster left off, in one place."

A subscription reference and document-preparation tool for Florida roofers,
restoration contractors, and public adjusters, built by Beeyond LLC (a
sub-brand of [Beeyond Estimators](https://beeyondestimators.com)).

This is **not** a public adjusting service. It does not adjust claims,
represent policyholders, or negotiate settlements. See `/terms` and
`/privacy` in the app for the full (draft) legal language.

## Stack

- Vite + React + React Router, Tailwind CSS v4 — single-page app, mobile-first
- Supabase (Postgres + RLS + magic-link auth) — Phase 2
- Stripe Checkout / Customer Portal / webhook — Phase 6
- Netlify hosting + Netlify Functions — Phase 6
- jsPDF for client-side letter export — Phase 4
- Resend for transactional + monthly update email — Phase 7

## Local development

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`.

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build locally
```

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from your Supabase project (Project Settings > API)
to enable login. Without them the app still runs — you'll just see a console
warning and auth calls will fail. Stripe/Resend vars aren't needed until
later phases.

To stand up the database: open the Supabase SQL editor and run
`supabase/migration.sql`, then `supabase/seed_items.sql`. Then add yourself
as an admin:

```sql
insert into public.admins (email) values ('you@example.com');
```

(matching the `ADMIN_EMAIL` env var used later for the admin panel and
Netlify Functions). Full click-by-click steps land in `SETUP.md` (Phase 8).

## Build status (phased delivery)

- [x] Phase 1 — Scaffold, landing page, pricing page, legal pages
- [x] **Phase 2** — Supabase auth, migration, seed data (this commit)
- [ ] Phase 3 — Vault library + claims
- [ ] Phase 4 — Letters + PDF export
- [ ] Phase 5 — Scope Checker + leads
- [ ] Phase 6 — Stripe + paywall + webhook
- [ ] Phase 7 — Resend emails + admin panel
- [ ] Phase 8 — SETUP.md + LAUNCH.md

## Project structure

```
src/
  components/
    auth/         RequireAuth (route guard, signed-in check only — no
                   subscription-status paywall gate yet, that's Phase 6)
    layout/       Nav, Footer, PublicLayout, LegalLayout, AppLayout
    ui/           Button, Card, Logo, Accordion, ScreenshotPlaceholder
    PricingTable.jsx
  lib/
    pricing.js        Plan data (Solo/Crew, monthly/annual)
    supabaseClient.js Supabase JS client
    AuthContext.jsx   Session + profile state, magic-link aware
  pages/
    Landing.jsx
    Pricing.jsx
    Terms.jsx
    Privacy.jsx
    Login.jsx          Magic-link sign-in
    AuthCallback.jsx   Landing spot for the magic-link redirect
    Dashboard.jsx      Authenticated stub (real dashboard is Phase 3)
    ComingSoon.jsx     Stub for /scope-checker until Phase 5
```

## Database

Schema lives in `../supabase/migration.sql` at the repo root (one level up
from this folder), with draft reference data in `../supabase/seed_items.sql`.
Both have been run end-to-end against a local Postgres 16 instance (with a
minimal stubbed `auth` schema standing in for Supabase Auth) to confirm they
execute cleanly — RLS policies, the `handle_new_user` trigger, and the
full-text search index all verified. They have **not** been run against a
real Supabase project yet; that first real run happens in Phase 8 (SETUP.md)
or whenever you create the project, whichever comes first.

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
