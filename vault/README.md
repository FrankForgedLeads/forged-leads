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
- [x] Phase 2 — Supabase auth, migration, seed data
- [x] **Phase 3** — Vault library + claims (this commit)
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
    ui/           Button, Card, Logo, Accordion, ScreenshotPlaceholder,
                   Modal, Field (Label/Input/Select/Textarea)
    vault/        CategoryFilter, ItemCard, AddToClaimModal
    PricingTable.jsx
  lib/
    pricing.js        Plan data (Solo/Crew, monthly/annual)
    categories.js      Vault category keys + labels (mirrors the DB check constraint)
    lossTypes.js        Shared loss-type options (claim forms)
    format.js           Currency/date/range formatting helpers
    supabaseClient.js Supabase JS client
    AuthContext.jsx   Session + profile state, magic-link aware
    api/
      items.js        fetchActiveItems()
      claims.js        fetchClaims/fetchClaim/createClaim/updateClaim/deleteClaim
      claimItems.js     fetchClaimItems/addClaimItem/updateClaimItem/deleteClaimItem
  pages/
    Landing.jsx
    Pricing.jsx
    Terms.jsx
    Privacy.jsx
    Login.jsx          Magic-link sign-in
    AuthCallback.jsx   Landing spot for the magic-link redirect
    Dashboard.jsx      Recent claims, quick search, new claim, trial banner
    Vault.jsx           Search + category filter + add-to-claim
    Claims.jsx          Claim list
    NewClaim.jsx        Claim creation form
    ClaimDetail.jsx      Claim info, attached items, running total
    ComingSoon.jsx     Stub for /scope-checker (Phase 5) and /account (Phase 6/7)
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

## Verifying Vault + Claims (Phase 3) without a real Supabase project

Same caveat as Phase 2: no real Supabase credentials were available to test
against. To still verify the actual React/query code (not just that it
builds), Phase 3 was exercised end-to-end in a headless browser against a
mocked PostgREST-shaped backend (Playwright intercepting `/rest/v1/*` and
`/auth/v1/*`, with a fake but schema-accurate in-memory dataset) — search,
category filter, claim creation (both the dashboard form and the "add to
claim" modal's inline create), attaching items from the Vault, editing
quantity/amount and watching the running total recompute, and removing an
item all passed with zero console errors. That test script was scratch
tooling and isn't part of the repo. The full stack still needs a real run
against an actual Supabase project (Phase 8 / SETUP.md) before launch.

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
