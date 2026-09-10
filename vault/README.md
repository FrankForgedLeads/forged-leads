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
- Stripe Checkout / Customer Portal / webhook — Phase 6, direct redirect to
  Checkout's hosted page (no `@stripe/stripe-js` client dependency needed)
- Netlify hosting + Netlify Functions — Phase 5 (lead notification), Phase 6 (Stripe webhook)
- jsPDF for client-side letter export — Phase 4
- Resend — Scope Checker lead notification (Phase 5); transactional + monthly update email land in Phase 7

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
- [x] Phase 3 — Vault library + claims
- [x] Phase 4 — Letters + PDF export
- [x] Phase 5 — Scope Checker + leads
- [x] **Phase 6** — Stripe + paywall + webhook (this commit)
- [ ] Phase 7 — Resend emails + admin panel
- [ ] Phase 8 — SETUP.md + LAUNCH.md

## Project structure

```
src/
  components/
    auth/         RequireAuth (signed-in check), RequireSubscription
                   (subscription_status in trialing/active, else /subscribe)
    layout/       Nav, Footer, PublicLayout, LegalLayout, AppLayout
    ui/           Button, Card, Logo, Accordion, ScreenshotPlaceholder,
                   Modal, Field (Label/Input/Select/Textarea)
    vault/        CategoryFilter, ItemCard, AddToClaimModal
    PricingTable.jsx   Also used by /subscribe in "trigger checkout" mode
  lib/
    pricing.js        Plan data (Solo/Crew, monthly/annual)
    categories.js      Vault category keys + labels (mirrors the DB check constraint)
    lossTypes.js        Shared loss-type options (claim forms)
    format.js           Currency/date/range formatting helpers
    subscription.js      Trial-days-left + status-label helpers
    supabaseClient.js Supabase JS client
    AuthContext.jsx   Session + profile state, magic-link aware
    api/
      items.js        fetchActiveItems()
      claims.js        fetchClaims/fetchClaim/createClaim/updateClaim/deleteClaim
      claimItems.js     fetchClaimItems/addClaimItem/updateClaimItem/deleteClaimItem
      billing.js         createCheckoutSession/createPortalSession (call the
                          Netlify Functions with the user's Supabase JWT)
      profile.js          updateProfile()
  pages/
    Landing.jsx
    Pricing.jsx
    Terms.jsx
    Privacy.jsx
    Login.jsx          Magic-link sign-in
    AuthCallback.jsx   Landing spot for the magic-link redirect
    Subscribe.jsx        Checkout buttons — signed in, not yet gated on a subscription
    Account.jsx           Plan/billing, profile, logout
    Dashboard.jsx      Recent claims, quick search, new claim, trial banner
    Vault.jsx           Search + category filter + add-to-claim
    Claims.jsx          Claim list
    NewClaim.jsx        Claim creation form
    ClaimDetail.jsx      Claim info, attached items, running total
    LetterBuilder.jsx    Choose template → edit/preview → export PDF
    ScopeChecker.jsx     Public lead magnet — 12-item checklist + live total
    ComingSoon.jsx     Now just the public 404 catch-all (both /scope-checker
                       and /account graduated out of stub status this phase)
```

Scope Checker adds: `lib/scopeChecklist.js` (12 hand-picked items with flat
"typical impact" dollar figures — separate draft content from the real
Vault, since `items` is RLS-gated to signed-in users and this page has no
login) and `lib/api/leads.js` (saves to the public `leads` table, then
best-effort calls the `notify-lead` Netlify Function). `netlify/functions/
notify-lead.js` emails LEADS_EMAIL via Resend on every submission — pulled
forward from Phase 7 since the spec calls it out specifically under Scope
Checker. `netlify.toml` (new) configures the build, the functions
directory, and the SPA catch-all redirect needed once this is actually
deployed to Netlify.

Letters add: `lib/disclaimer.js` (the required disclaimer text, shared by the
public footer, the letter page, and every PDF), `lib/claimMath.js` (running
total math, shared by claim detail and the letter builder so they can never
disagree), `lib/letters/templates.js` (the three legally-reviewed letter
bodies — contractor-to-carrier, own scope/pricing only, never "on behalf of
the insured," each ending with a reconcile-by-contact line) and
`lib/letters/pdf.js` (jsPDF layout, dynamically imported so its ~1MB bundle
only loads for someone actually exporting a letter), plus
`components/letters/LetterPreview.jsx` (the on-page preview, sharing the
same template text) and `lib/api/letters.js` (saves a `letters` row per
export).

Stripe + paywall add: `components/auth/RequireSubscription.jsx` (the paywall
— redirects to `/subscribe` unless `subscription_status` is `trialing` or
`active`; also handles the race where Checkout's `success_url` redirect
lands back in the app before the webhook has updated the profile yet, by
polling for a few seconds instead of bouncing a paying customer straight
back to `/subscribe`), `pages/Subscribe.jsx` and `pages/Account.jsx`, and
three Netlify Functions: `create-checkout-session.js` (verifies the
caller's Supabase JWT server-side — never trusts a client-supplied user id
— then creates a Stripe Checkout session with a 7-day trial, reusing the
same Stripe Customer on a resubscribe instead of minting a new one),
`create-portal-session.js` (same auth check, opens the Stripe Customer
Portal), and `stripe-webhook.js` (verifies the Stripe signature against the
raw request body, then handles `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`, and
`invoice.payment_failed` — updating `profiles` with the service-role key,
since Stripe's calls carry no user session to respect RLS with; also
creates the `teams` row and attaches the owner on a Crew checkout, so
team_id-based claim sharing works immediately even though the invite UI is
Phase 7). `netlify/functions/_lib/` holds `auth.js` (JWT verification,
shared by both Checkout-triggering functions) and `http.js` (a JSON
response helper) — the leading underscore keeps Netlify from trying to
deploy them as their own endpoints.

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

## Verifying Letters + PDF export (Phase 4)

Same mocked-backend approach as Phases 2–3, extended to cover PDF output
specifically: chose each of the 3 templates and confirmed their
template-specific fields appear (original-letter-date for the follow-up,
approved-amount for the partial-approval one) and that editing a field
live-updates the preview; exported a PDF, intercepted the real browser
download, verified it starts with the `%PDF-` header and isn't
suspiciously small, and read it back to confirm the company block, item
list, computed total, and disclaimer all render correctly — including a
bug the first pass caught and fixed: the page-number and the (2-line)
wrapped disclaimer were drawing at the same y-position and overlapping.
Also verified an 8-item claim paginates into multiple PDF pages with the
disclaimer footer on every page and the page break landing cleanly
between the item list and the total paragraph. Confirmed a `letters` row
is saved with the correct `template_key` and `claim_id` on export. Zero
console errors throughout. Still no real Supabase project to run this
against end to end — same caveat as every phase so far.

## Verifying Scope Checker + leads (Phase 5)

Same mocked-backend approach again: confirmed the page loads and works
with no auth at all (it's under `PublicLayout`, not gated), that checking
and unchecking items live-updates the running total correctly, and that
submitting the form (a) inserts the right row shape into `leads` — email,
answers.checked array, estimated_total, source: 'scope_checker' — and (b)
calls `notify-lead` with the checked item labels and total, then shows the
"Start your 7-day free trial" CTA linking to `/pricing`. Also specifically
verified the fire-and-forget failure path: with `notify-lead` deliberately
left unmocked (so it 404s, matching what actually happens under plain
`vite dev` without `netlify dev`), the lead still saves and the CTA still
shows — the only console entry is the browser's own network-failure log
for that request, not an app error. `netlify/functions/notify-lead.js`
itself only runs under `netlify dev` or once deployed, so its Resend call
couldn't be exercised end-to-end here; the function was syntax-checked
(`node --check`) and its request/response shape follows Resend's
documented API.

## Verifying Stripe + paywall (Phase 6)

No Stripe or Supabase credentials available, so this is necessarily the
most limited verification of any phase so far — mocked-backend browser
testing covers the client side thoroughly, but the three Netlify
Functions (which need real Stripe keys, and for the webhook, a real
signed request from Stripe) could only be syntax-checked, not run.

What was verified end-to-end in a headless browser: an unsubscribed
signed-in user hitting any paywalled route (`/dashboard`, `/vault`,
`/claims`) redirects to `/subscribe`; the nav correctly hides
Dashboard/Vault/Claims (and shows "Start free trial" instead) until
subscribed; `/account` and `/subscribe` both work pre-subscription;
clicking a plan on `/subscribe` calls `create-checkout-session` with the
right JWT and `{plan, interval}` body. Then, specifically because this is
the trickiest part of the whole phase: simulated Stripe's redirect back
to `/dashboard?checkout=success` while the profile's `subscription_status`
was still `null` (i.e. the webhook hasn't landed yet) — confirmed
`RequireSubscription` shows an "activating" spinner rather than bouncing
back to `/subscribe`, and that it correctly resolves into the dashboard
once the profile updates mid-poll (simulating the webhook landing a
couple seconds late). Also tested the case where it never lands within
the retry window: shows a friendly "try again" message and stays put,
rather than silently redirecting a customer who was just charged. Trial
banner, Account's plan/status display, and Manage Billing's redirect to
the (mocked) portal URL all confirmed correct. Zero console errors.

Not verified here, and needing a real Stripe test-mode account plus
`netlify dev` (or a real deploy) to check: the three functions actually
running, Stripe's real webhook signature verification, the Crew-plan team
row creation, and the full webhook → profile update → UI unlock loop with
real async timing. That's real risk carried into Phase 8 (SETUP.md) —
budget time there to test a full trial signup against Stripe test mode
before going live.

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
