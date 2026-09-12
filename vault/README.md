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
- Netlify hosting + Netlify Functions — Phase 5 (lead notification), Phase 6
  (Stripe), Phase 7 (monthly update, team invites)
- jsPDF for client-side letter export — Phase 4
- Resend — Scope Checker lead notification (Phase 5); monthly update to
  subscribers and Crew team-invite email (Phase 7). Supabase's own magic-link
  email is separate — see the SETUP.md note in Phase 8 about pointing
  Supabase's SMTP settings at Resend so it isn't stuck on Supabase's very
  low free-tier auth-email rate limit.

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

(matching the `ADMIN_EMAIL` env var used for the admin panel and Netlify
Functions). Full click-by-click steps, from Supabase through DNS, are in
[`SETUP.md`](./SETUP.md) — that's the real path to a live site, this
section is just enough to run it locally. Once it's live, see
[`LAUNCH.md`](./LAUNCH.md) for the 30-day plan to the first 10 customers.

## Build status (phased delivery)

- [x] Phase 1 — Scaffold, landing page, pricing page, legal pages
- [x] Phase 2 — Supabase auth, migration, seed data
- [x] Phase 3 — Vault library + claims
- [x] Phase 4 — Letters + PDF export
- [x] Phase 5 — Scope Checker + leads
- [x] Phase 6 — Stripe + paywall + webhook
- [x] Phase 7 — Resend emails + admin panel
- [x] **Phase 8** — SETUP.md + LAUNCH.md (this commit) — v1 complete

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
      functionClient.js    Shared "POST to a Netlify Function with my JWT" helper
      billing.js           createCheckoutSession/createPortalSession
      profile.js           updateProfile()
      team.js               fetchMyTeam/inviteTeammate/revokeInvite
      adminItems.js         fetchAllItemsForAdmin/createItem/updateItem/deleteItem
      adminLeads.js          fetchLeads/markLeadContacted
      adminSubscribers.js     fetchSubscribers
      monthlyUpdate.js         sendMonthlyUpdate(subject, bodyHtml)
  pages/
    Landing.jsx
    Pricing.jsx
    Terms.jsx
    Privacy.jsx
    Login.jsx          Magic-link sign-in
    AuthCallback.jsx   Landing spot for the magic-link redirect
    Subscribe.jsx        Checkout buttons — signed in, not yet gated on a subscription
    Account.jsx           Plan/billing, team (Crew), profile, logout
    Dashboard.jsx      Recent claims, quick search, new claim, trial banner
    Vault.jsx           Search + category filter + add-to-claim
    Claims.jsx          Claim list
    NewClaim.jsx        Claim creation form
    ClaimDetail.jsx      Claim info, attached items, running total
    LetterBuilder.jsx    Choose template → edit/preview → export PDF
    ScopeChecker.jsx     Public lead magnet — 12-item checklist + live total
    admin/
      AdminHome.jsx        Item/lead/subscriber counts + tabs to the rest
      AdminItems.jsx         List, search, category filter, deactivate/delete
      AdminItemForm.jsx       Create/edit
      AdminLeads.jsx           Mark contacted
      AdminSubscribers.jsx      Read-only table with status badges
      AdminMonthlyUpdate.jsx     Composer, drafted from items changed in 30d
    ComingSoon.jsx     Now just the public 404 catch-all
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
creates the `teams` row and attaches the owner on a Crew checkout).
`netlify/functions/_lib/` holds `auth.js` (JWT verification, shared by
every function that needs to know who's calling) and `http.js` (a JSON
response helper) — the leading underscore keeps Netlify from trying to
deploy them as their own endpoints.

Resend emails + admin panel (Phase 7) add:

- **Admin panel** (`/admin/*`, gated by `RequireAdmin` — checks the same
  `is_admin()` RPC the DB itself uses, not a second ADMIN_EMAIL comparison
  that could drift out of sync): items CRUD (`AdminItems`/`AdminItemForm`,
  with "deactivate" as the primary removal path and "delete" surfacing a
  clear error instead of a raw Postgres failure when an item is attached
  to a claim — `items.claim_items` has `ON DELETE RESTRICT`), the leads
  list with a contacted/not-contacted toggle, and a read-only subscriber
  table with status badges. `AuthContext` now also exposes `isAdmin`
  (from `supabase.rpc('is_admin')` — safe to call as anyone, it only ever
  reveals whether *you* specifically are an admin) and `AppLayout` shows
  an Admin nav link when it's true. Admin routes are deliberately **not**
  wrapped in `RequireSubscription` — the person running the Vault
  shouldn't have to personally pay for a subscription to manage it; the
  real security boundary is Postgres RLS either way.
- **Monthly update**: `AdminMonthlyUpdate.jsx` drafts a subject/HTML body
  from Vault items added or changed in the last 30 days (editable before
  sending — this is an admin-triggered send, not an unattended cron job,
  so a broken auto-generated draft can never go out to subscribers
  unreviewed) and `netlify/functions/send-monthly-update.js` sends it via
  Resend's batch endpoint to every trialing/active subscriber.
- **Crew team invites** — the piece of the Account page's spec ("team
  seats and invites") that was stubbed in Phase 6: `TeamCard` (in
  `Account.jsx`) shows seat usage, current members, and pending invites,
  with an invite form and a revoke button.
  `netlify/functions/invite-teammate.js` verifies the caller owns a team,
  checks seat limits and for existing members/pending invites, inserts
  the `team_invites` row, and emails the invite via Resend — all of that
  runs under the owner's own JWT (no service-role key needed) because RLS
  already grants a team owner exactly this access. Auto-accepting the
  invite on the teammate's first login required two `supabase/
  migration.sql` changes (re-verified against a local Postgres instance,
  same as every schema change so far): `handle_new_user()` now also
  checks for a pending invite matching the new user's email and attaches
  them to that team, and a new `profiles_select_own_admin_or_teammate` RLS
  policy lets a team's members see each other's profiles (needed so the
  owner's Account page can list who's on the team) — replacing the
  Phase 2 `profiles_select_own_or_admin` policy. Known v1 limitation,
  noted in a migration comment: this only fires for a brand-new
  `auth.users` row, so inviting someone who already has a Beeyond Vault
  account needs a manual fix rather than auto-accepting.

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

## Verifying Resend emails + admin panel (Phase 7)

The DB changes got the most rigorous check available without a real
Supabase project: re-ran the full `migration.sql` (with `handle_new_user`'s
new invite-matching logic and the new teammate-visibility policy) against
a local Postgres 16 instance from scratch, then specifically exercised the
invite-then-signup sequence with real SQL — inserted a team, inserted a
`team_invites` row for an email that had never signed in, inserted that
`auth.users` row (firing the trigger for real, not simulated), and
confirmed the new profile got `team_id` set and the invite's `accepted_at`
got stamped, in one transaction-safe trigger. Also evaluated the new RLS
policy's predicate directly against both the owner's and the teammate's
profile rows to confirm each is visible to the other.

Client side, same mocked-backend browser testing as every prior phase:
`RequireAdmin` correctly hides the Admin nav link and redirects a
non-admin away from `/admin`, while an admin sees it and lands on working
stats; the items list shows both active and inactive items, search and
category filtering work, deactivating flips the badge, creating a new
item works, and — specifically — deleting an item that's attached to a
claim surfaces the friendly "attached to one or more claims" message
rather than a raw error (simulated the same Postgres 23503 the real
`ON DELETE RESTRICT` constraint would return); leads list and the
mark-contacted toggle work; the subscriber table renders every status
correctly; the monthly-update composer's recipient count and drafted body
are correct and sending calls the function with the right payload; and
the team card shows correct seat counts, an invite call reaches the
function with the right email, and revoking an invite frees the seat back
up. Zero console errors throughout (one deliberately-triggered 409 in the
delete-with-FK test shows up as Chromium's own network-failure log, not
an app error — confirmed by the same test asserting the friendly message
rendered).

Not verified here, same limitation as every phase touching a Netlify
Function: `send-monthly-update.js` and `invite-teammate.js` were only
syntax-checked (`node --check`), not run — they need real Supabase +
Resend credentials via `netlify dev` or a live deploy. Test both for real
in Phase 8 before relying on them: send a monthly update to a real test
subscriber and confirm delivery, and run through a full Crew invite with
a second real email address to confirm the auto-accept trigger and the
invite email both work end to end outside of the local-Postgres
simulation above.

## Verifying Estimate Review — uploads + storage (Phase 2)

First major step toward the Estimate Review architecture-audit plan:
uploading and securely storing the estimate PDF and supporting
documentation (photos, scope notes, invoices) a claim's review will
eventually run against. No AI/analysis engine yet — that's Phase 3. This
phase is deliberately just upload + storage + the project-info fields the
analysis engine will need later.

**Architecture decision**: rather than a new, parallel `estimate_reviews`
table, this extends the existing `claims` table with the project-info
fields from the product spec (`project_type`, `trade`, `estimate_total`,
`description`, `notes`) and replaces its old insurance-specific status
vocabulary (`open`/`in_progress`/`submitted`/...) with the spec's review
workflow (`new`/`under_review`/`findings_reviewed`/`documentation_complete`/
`completed`). `claims` is the one record the spec's "Projects/Reviews"
concept eventually needs — estimate, documentation, analysis, findings,
and generated letters all together — so extending it now avoids having to
merge two tables together later. The `claims` → "Projects" UI relabel
itself is still a separate, later phase; this is schema and storage only.

New `review_files` table (one row per uploaded file, categorized
`estimate`/`photo`/`document`, RLS following the parent claim exactly like
`claim_items`/`letters`) plus a private Supabase Storage bucket
(`review-files`) with a real, Postgres-enforced 15 MB file-size cap and a
PDF/JPEG/PNG/WEBP/HEIC allow-list — both set directly on the
`storage.buckets` row in the migration, not just checked client-side, so a
direct API call can't bypass the limit and run up the Storage free tier.
Storage access is scoped by the standard Supabase per-user-folder RLS
pattern (`${auth.uid()}/${claim_id}/${file}`). Known v1 limitation,
documented inline in the migration: a Crew teammate can see a shared
claim's file *rows* but can't fetch a teammate's actual file bytes, since
storage access is scoped by uploader, not by team — acceptable for v1,
revisit if that becomes a real ask.

**Verified**: ran the full `migration.sql` end-to-end against a fresh
local Postgres 16 instance with a minimal `auth`/`storage` schema shim
(just enough surface — `auth.users`, `auth.uid()`/`auth.jwt()`,
`storage.buckets`/`storage.objects`/`storage.foldername()` — to exercise
the real, unmodified migration file, not a rewritten test version), then
specifically: confirmed old status values are rejected by the new check
constraint and get remapped by the migration's own `UPDATE` before that
constraint is added; confirmed the new columns and default status
(`new`) work; confirmed the `review-files` bucket lands with `public:
false`, the 15 MB limit, and the exact MIME allow-list; inserted a
`review_files` row and confirmed `storage.foldername()` splits the path
the way the RLS policies expect. Re-ran the whole file a second time to
confirm the new `ALTER ... IF NOT EXISTS`/`ON CONFLICT` statements are
safe to re-run (they are — the failures on the second run are all
`CREATE POLICY` statements, which were never idempotent anywhere in this
file even before this phase, not a regression).

Client side, same mocked-backend Playwright methodology as every prior
phase (`/rest/v1/claims`, `/rest/v1/review_files`,
`/storage/v1/object/review-files/**`, `/storage/v1/object/sign/**`, all
backed by an in-memory fake dataset): creating a review from the expanded
`NewClaim` form persists the new fields correctly; uploading an estimate
PDF and a documentation photo both call Storage then insert the
`review_files` row, with photos auto-categorized `photo` by MIME type and
everything else `document`; an oversized file (16 MB, over the 15 MB cap)
is rejected client-side with zero network calls, not just server-side;
clicking a filename fetches a signed URL and opens it; deleting a file
removes both the Storage object and the row. "Run Vault Review" renders
visibly disabled with a "coming soon" explanation rather than pretending
to do anything — Phase 3 is where that button starts working. Zero
console errors throughout.

**Bug caught and fixed by this testing**: adding the Documents section
pushed the page tall enough that the pre-existing sticky "running total"
bar — `position: sticky; bottom: 0`, which pins to the viewport bottom
whenever the page extends below the fold, regardless of scroll position —
started permanently overlapping the new Estimate/Documentation upload
cards, hiding their upload buttons under the bar. Fixed by wrapping the
Attached Items section and the sticky bar together in their own
containing block, so the bar's sticky range is scoped to that section
instead of the whole page. Confirmed fixed via before/after screenshots.

Not verified here, same limitation as every phase touching real
Supabase/Storage infrastructure: actual file upload against a live
Supabase project (Storage RLS enforcement, the real per-user-folder
policies, actual signed URLs). Test this for real in Phase 8/SETUP.md —
upload a real PDF and a real photo as one account, confirm a second
account (and a teammate on a Crew plan) can't read the first account's
files, and confirm the bucket's 15 MB limit actually rejects an oversized
upload server-side, not just in this client-side check.

## Verifying the structured analysis engine (Phase 3)

The core of Estimate Review: `netlify/functions/analyze-review.js`
orchestrates the whole pass — auth, a per-user daily rate limit (cost
control, `ANALYSIS_DAILY_LIMIT`, default 20/day), downloading uploaded
files server-side, PDF text extraction, and the AI call — while
`netlify/functions/_lib/estimateAnalysisService.js` is the **only** module
in the codebase that talks to an AI provider. Every guardrail from the
product spec (never invent measurements/damage/code citations, never
claim an amount is owed, distinguish "not found in estimate" from
"code required," say so when uncertain, never auto-add anything) is
enforced two ways: the system prompt instructs it, and the service's own
`coerceFinding()` defensively re-validates every field the model returns
before it ever reaches the database — an out-of-list `item_id`, an invalid
`scope_status`/`confidence`, or `requires_human_verification` being
anything but `true` all get corrected or dropped, never trusted blindly.

**Model**: defaults to Claude Haiku 4.5 (`ESTIMATE_ANALYSIS_MODEL` to
override) — the cheapest current Claude model that still handles this
task, chosen because the product's whole economics depend on AI cost per
review staying low against the $39.99/$99.99 subscriptions. This was the
decision explicitly deferred at the end of Phase 2; revisit if Haiku's
findings prove too shallow once there's real usage to judge by.

**Human-in-the-loop, enforced at the database level, not just the UI**:
`review_findings` has no client-writable insert policy — only
`analyze-review.js`, using the service-role key, can create a finding.
The client can only update a finding's own `status` (new → added /
dismissed / needs_info). There is no code path, correct or buggy, by
which the frontend could fabricate or silently auto-confirm a finding.

**Verified**: ran the full `migration.sql` (with the Phase 3 additions)
against local Postgres 16 again — confirmed the forward-reference between
`review_findings` and `analysis_runs` resolves correctly (the FK is added
via `ALTER TABLE` after both tables exist, since the column can't
reference a not-yet-created table inline), confirmed the
`scope_status`/`confidence`/`status` check constraints reject bad values
and accept good ones, confirmed cascade deletes work. Separately — and
this is real, not simulated — used `jsPDF` (already a project dependency)
to generate an actual PDF with known text, ran it through
`pdf-parse` via `_lib/pdfText.js`, and confirmed the extracted text
matches; also confirmed a garbage/invalid PDF throws instead of silently
returning empty text, so the "couldn't read your estimate" path in
`analyze-review.js` is reachable on a real parse failure, not just a
short-text heuristic. All new function files syntax-checked with
`node --check`, same limitation as every phase touching a Netlify
Function — no real Supabase/Anthropic credentials available in-session.

Client side, same mocked-backend Playwright methodology as every prior
phase, this time mocking the `analyze-review` function endpoint itself
(seeding fake findings on success, or a 502 on a simulated failure) since
its own internals were already verified above: ran a review and confirmed
3 findings render with the exact spec'd layout (status label, confidence
badge, why-flagged reason, supporting documentation, Xactimate/Florida
reference/quantity/typical-range grid, the "verify before submission"
line); clicked **Add to Review** on a finding with a matched Vault item —
confirmed it created a real `claim_items` row (carrying the finding's
`suggested_quantity` and a note referencing its evidence — a real gap this
testing caught and fixed, it was defaulting to qty 1 and no note before),
marked the finding `added`, and refreshed the Attached Items total;
clicked **Dismiss** on another and confirmed it moved to "Already
reviewed"; confirmed the third finding (no matched Vault item) renders
with **Add to Review** correctly disabled rather than silently failing;
confirmed the Review Summary's dollar math (`$630–$990` from 180 LF ×
$3.50–$5.50) is correct; confirmed the simulated failure path shows
exactly "We couldn't complete this review. Your files are safe. Please
try again." with a working Try Again button — never fake results. Zero
unexpected console errors (the one 502 that appears in the console during
the failure-path test is Chromium's own network-failure log for the
request the test deliberately made fail, not an app error).

Not verified here, same limitation as every phase touching real
infrastructure: an actual Anthropic API call (prompt quality, whether
Haiku's findings are actually useful on a real Xactimate export, real
token usage/cost, real latency against Netlify's function timeout). This
is the biggest open question in the whole build — budget real time in
Phase 8/SETUP.md to run this against several real estimates and judge the
finding quality yourself before relying on it, and watch
console.anthropic.com's usage page for the first week live to confirm
actual cost per review matches the "low single-digit cents" expectation
this was designed around.

## Verifying knowledge base verification tracking (Phase 5)

The product spec marks this CRITICAL: "Do not present automatically
generated code citations as verified facts. Every code citation should
have: Last Verified and Verify applicability before submission." Adds five
columns to `items` (`jurisdiction_notes`, `required_documentation`,
`common_exclusions`, `last_verified_date`, `source_notes`) and surfaces
`last_verified_date` everywhere a citation reaches a customer: the admin
item list (a green "Verified [date]" or gold "Not yet verified" badge per
row, plus a running unverified count in the page header), the admin edit
form (a dedicated Verification section with a one-click "Mark verified
today" button), the Vault browse page, and every Estimate Review finding's
Florida-reference field.

Deliberately left every existing seeded item's new columns NULL rather
than backfilling a plausible-looking verification date — an honest "not
yet verified" is the whole point here, and it would have directly
contradicted the spec's own warning to fabricate one. `jurisdiction_notes`
also now flows into the analysis engine's prompt (Phase 3's
`estimateAnalysisService.js`), with an explicit instruction not to flag an
item at all when the claim's property location clearly falls outside its
stated jurisdiction (e.g. an HVHZ-only item on a non-HVHZ county address),
and to lower confidence rather than omit when location is ambiguous.

Verified: re-ran `migration.sql` against local Postgres 16 (the five
`ALTER TABLE ADD COLUMN IF NOT EXISTS` statements), then re-ran
`seed_items.sql` on top and confirmed all 77 items land with
`last_verified_date` NULL — the honest state, not a fabricated one.
Mocked-backend Playwright pass: the admin list correctly renders one
verified item (green badge, formatted date) and one unverified item (gold
badge) side by side with a correct "1 not yet verified" count; the edit
form's "Mark verified today" button correctly sets the date input to
today's date. Zero console errors.

Not verified here: real end-to-end (an admin actually clicking through
and re-verifying an item, then confirming a subsequently-run Estimate
Review reflects the updated jurisdiction reasoning) — needs live Supabase
+ Anthropic credentials, same as Phase 3.

## Verifying admin usage/error visibility (Phase 9, partial)

Addresses the product spec's "Admin should be able to: ... View system
errors ... View analysis failures" — before this, a failed analysis run
was recorded in the database (Phase 3's `analysis_runs` table) but nothing
surfaced it anywhere; Frankie would have had no way to know a customer hit
a failure without them reporting it directly. Now:

- **Admin → Analysis runs** (`/admin/analysis`): every run, newest first,
  with a status badge, the failed ones showing their `error_message`
  inline; a **Failed only** filter; and summary stats (total runs, failed
  count + failure rate, runs and estimated cost over the last 30 days).
- **Admin home**: two new stat tiles — Estimate Review run count with
  30-day cost, and a Failed Analyses tile that renders with a red border
  and alert styling whenever the count is above zero, so a problem is
  visible the moment an admin lands on `/admin` without having to click
  into the Analysis runs tab.
- Cost is shown to 4 decimal places here (`$0.0075`), not the 2-decimal
  `formatCurrency` used everywhere customer-facing — most individual runs
  cost a fraction of a cent, and 2-decimal rounding would show `$0.00` for
  nearly every row, hiding the exact signal this page exists to show.

This is Phase 9 "partial" — the spec's full admin list (product
announcements, deeper user/subscription management, customer feedback)
isn't built; this phase specifically targeted the analysis-failure/cost
blind spot because it's the one piece of new infrastructure (Phase 3's AI
calls) that had zero admin visibility, which is a real risk for a
low-maintenance business model that depends on noticing problems without
being told about them.

Note: `analysis_runs.user_id` references `auth.users`, not
`public.profiles` — there's no direct foreign key PostgREST can use to
embed a user's email in one query, so `adminAnalysis.js` fetches
`analysis_runs` and `profiles` separately and merges by id client-side.
`claims`, by contrast, does have a direct FK from `analysis_runs.claim_id`
and embeds normally.

Verified: mocked-backend Playwright pass — three seeded runs (two
succeeded at different cost/token levels, one failed with a real error
message) render correctly on `/admin/analysis`, the Failed Only filter
correctly narrows to exactly the one failed row, and `/admin` shows the
new tiles with the failed-analysis tile in its red alert state. Zero
console errors. An oxlint purity warning this surfaced (computing a
"30 days ago" cutoff with `Date.now()` directly inside a `useMemo` body)
was fixed by computing it once via lazy `useState` initialization instead.

## Verifying the Claims -> Reviews rename (Phase 6)

Finishes the rename the product spec asked for ("Rename or restructure
'Claims' so that the product isn't unnecessarily insurance-specific")
that Phase 2 started (the `claims` table itself already gained the
Estimate Review fields; ClaimDetail/NewClaim already said "review" in
their headings). This phase swept every remaining user-visible "claim"
string across the app: the authenticated nav ("Claims" -> "Reviews"),
the Reviews list page and its empty states, the Dashboard's "+ New
Review" button and "Recent reviews" heading, the Vault page's
add-to-claim banner and "Add to review" button text, the
add-to-review modal (title, claim picker, "Create a new review"), the
Letter Builder's breadcrumb and confirmation text, and the monthly
update email template's Vault plug.

Deliberately NOT renamed, on purpose: the underlying `claims` database
table, its RLS policies, and every internal function/variable name
(`fetchClaims`, `claimId`, `claim_items`, etc.) — this is a copy-only
pass, not a schema migration, exactly matching the same call made in
Phase 2. Also left alone: legitimate uses of the word "claim" that
refer to an actual insurance claim concept rather than the app's own
entity — the "Claim number" field label (it's a real optional field
for an actual carrier claim number), `Claim #${...}` in a generated
letter's recipient block, and "insurance claim outcome" language in
disclaimers, Terms, and the Scope Checker, all of which already used
"claim" correctly and don't need to change.

Verified: mocked-backend Playwright pass on `/dashboard` and `/claims`
confirms the nav reads "Reviews" (not "Claims") and every page heading,
button, and empty-state message uses review language. Zero console
errors. Full build + lint clean, no new warnings beyond the pre-existing
baseline.

## SECURITY FIX — cross-tenant privilege escalation (Phase 10 audit)

A Phase 10 security audit (an independent agent pass focused specifically
on the RLS policies, every Netlify Function, and the multi-tenant Crew
data-sharing paths) found one **High severity, confirmed-exploitable**
vulnerability, since fixed and verified. Recording it here in full,
un-sanitized, on purpose — the point of an audit note is to be a real
record, not to make the finding disappear.

**The bug**: `profiles_update_own_or_admin` and `team_invites_update`
(both defined earlier in `migration.sql`) used `for update using (...)`
with no `with check` clause. Postgres RLS reuses the USING expression as
the check on the new row when none is given — so the *only* thing either
policy actually enforced was "this row belongs to me." Neither restricted
*which columns* a permitted update could change.

**The impact**: since every Crew-sharing RLS policy in this schema
(`teams`, `claims`, `claim_items`, `letters`, `review_files`,
`review_findings`, `analysis_runs`) grants access based on
`team_id = public.my_team_id()`, and `my_team_id()` just reads the
caller's own `profiles.team_id` — any signed-in user could have sent
`PATCH .../profiles?id=eq.<their own id>` with body
`{"team_id": "<any other team's uuid>"}` and it would have succeeded, no
UI involvement needed. That one write would have granted them read *and
write* access to an arbitrary team's claims, uploaded documents, and AI
Estimate Review findings — a complete bypass of the tenant isolation RLS
exists to provide, from an ordinary authenticated session, not a bug
requiring any special access to find or exploit.

**The fix**: column-level privileges rather than a trickier RLS rewrite.
Postgres checks table/column grants *before* it evaluates RLS — an UPDATE
naming a column the role lacks privilege on fails outright regardless of
policy content, which is simpler to reason about correctly than a
self-referential WITH CHECK subquery comparing old vs. new values.
`authenticated` now only has UPDATE on the four `profiles` columns the
Account page actually lets a user edit (`full_name`, `company`, `phone`,
`role`) — `team_id`/`plan`/the Stripe fields/`subscription_status`/
`trial_ends_at` are all written exclusively by the Stripe webhook or the
signup trigger, both running as `service_role`, which bypasses RLS and
column grants alike and is unaffected by this change. `team_invites`
UPDATE is revoked from `authenticated` entirely — grepping the app
confirmed the client never calls `.update()` on it (only `.select()`/
`.delete()`), and invite acceptance happens inside a SECURITY DEFINER
trigger that runs as its owner, not the calling session, so the policy
was dead code providing pure attack surface.

**Known tradeoff, intentional**: `profiles_update_own_or_admin`'s RLS
still nominally says an admin can update any profile, but the new column
grants apply to the `authenticated` role uniformly — there's no separate
Postgres role for "admin," admin status is just a row in the `admins`
table checked via `is_admin()`. So this closes the hole for admins too,
at the client level. Confirmed no current admin feature needs broader
profile writes (`AdminSubscribers.jsx` only reads). If one is ever built,
it must go through a service-role Netlify Function with its own audit
trail — never a loosening of these grants — same reasoning as every other
privileged write in this app (Stripe webhook, admin item CRUD via RLS's
`is_admin()` check on `items`, which is a genuinely different, lower-risk
case since `items` isn't part of the tenant-isolation boundary).

**Verified**: built a more realistic local-Postgres shim than prior
phases' — a real `authenticated` Postgres role plus `ALTER DEFAULT
PRIVILEGES ... GRANT ALL ON TABLES TO authenticated`, matching what a
real Supabase project actually provisions by default (broad table grants,
RLS as the intended primary boundary) — specifically so this test would
exercise the fix's REVOKE/GRANT statements against a realistic starting
privilege set, not an artificially-already-locked-down vanilla Postgres
one that would pass for the wrong reason. Then, as the `authenticated`
role with `auth.uid()` wired to return a real seeded attacker id: (1)
confirmed the attacker updating their own `full_name` still succeeds
(the legitimate case isn't broken), (2) attempted the exact exploit —
setting their own `team_id` to a seeded victim team's id — and confirmed
it fails with `permission denied for table profiles`, with the row's
`team_id` verified still NULL afterward, (3) seeded a `team_invites` row
addressed to the attacker's email and confirmed any update to it now
fails with `permission denied for table team_invites`.

This was never exploited against real data — no live Supabase project
has been running this schema yet (SETUP.md Step 1 is still pending) — but
it would have been live and exploitable from the moment that step was
completed, before this fix. No action needed from Frankie beyond running
the current `migration.sql` (which now includes the fix) rather than an
earlier copy.

**Follow-up sweep**: rather than assume `profiles`/`team_invites` were the
only two instances of this pattern, re-checked every other `for update`
policy in the file. Found the same gap in three more places and fixed all
of them the same way:

- `teams_update_owner_or_admin` — same as `team_invites`: the client never
  calls `.update()` on `teams` at all (confirmed by grep). Dead policy,
  pure attack surface. Revoked outright.
- `claims_update` — a legitimate teammate (real, intended update access to
  a shared claim) could have re-parented that claim into a **different**
  `team_id` they don't belong to, injecting it into a victim team's claim
  list. Now grants only the columns `ClaimInfoForm`/the status dropdown
  actually send (`status`, `project_type`, `trade`, `property_address`,
  `insured_name`, `estimate_total`, `date_of_loss`, `loss_type`,
  `claim_number`, `carrier`, `adjuster_name`, `description`, `notes`) —
  never `user_id` or `team_id`.
- `claim_items_update` — same re-parenting risk via `claim_id`. Now grants
  only `quantity`, `custom_amount`, `note` — matching exactly what
  `persistRow()` in `ClaimDetail.jsx` sends.
- `review_findings_update_status` — the most important of the three: without
  this, a user could have rewritten an AI finding's `reason`, `confidence`,
  `scope_status` after the fact, re-parented it to a claim they don't own
  via `claim_id`, or — worst — flipped `requires_human_verification` to
  `false`, undermining the human-in-the-loop guarantee the whole Estimate
  Review feature's legal/trust framing depends on. Now grants only `status`
  and `claim_item_id`, matching `updateFindingStatus()`'s only two call
  shapes in `ClaimDetail.jsx`.

`items_update_admin` was deliberately left alone — every column on `items`
is meant to be admin-editable (that's the actual admin CRUD feature), so
there's no legitimate/illegitimate column distinction to enforce there the
way there is on tables shared between untrusted-relative-to-each-other
users.

Verified the same way as the first fix: seeded an attacker's own team,
claim, claim_item, and review_finding (their own, legitimately-owned
resources — the exact case a real teammate would be in), then as the
`authenticated` role with `auth.uid()` bound to that attacker: confirmed
every legitimate update still works (claim status, claim_item quantity,
marking a finding added) and every exploit attempt — re-parenting a claim
via `team_id`, re-parenting a claim_item via `claim_id`, flipping
`requires_human_verification`, rewriting `reason`/`confidence`, updating a
`teams` row at all — fails with a clean permission error, with every
targeted row confirmed unchanged afterward.

## Verifying the Review Summary PDF export (Estimate Review Phase 7)

Addresses the product spec's Phase 7, "Build documentation/PDF generation"
— distinct from the original build's own "Phase 7" (Resend emails + admin
panel, see above) and from Letters (Phase 4 of the original build), which
generate a carrier-facing letter. This is the missing piece: a record of
the *review itself*, for the contractor's own file, not addressed to
anyone. It's what the `claims.status` value `documentation_complete`
(already in the status dropdown since Phase 2) was waiting on — nothing
produced that documentation until now.

**What it does**: a new **Export Review Summary** button on the review
page (next to Generate letter) builds a PDF client-side (same jsPDF
approach as Letters) covering:

- Project info (trade, property, insured/client, carrier, claim #,
  adjuster, dates, estimate total, description)
- Documents on file (file name + type — not content, just a manifest)
- Attached items, itemized with code citations, quantities, and the
  running total — identical math to the on-screen total (`claimMath.js`,
  shared, not reimplemented)
- Every Vault Review finding with its human decision (added/dismissed/
  needs more info/still pending), not just the ones added to the claim —
  so the PDF is an honest record of what Vault surfaced and what was done
  about each item, not a cherry-picked summary
- Both disclaimers (`ANALYSIS_DISCLAIMER` + `VAULT_DISCLAIMER`) on every
  page footer, same as Letters

**Storage**: reuses the existing `letters` table (client-side snapshot
record: claim_id, template_key, pdf_meta, generated_at) with a new
`template_key` value, `review_summary`, rather than adding a parallel
table — the shape needed (a claim-scoped record of "a PDF was generated,
here's a snapshot of what went into it") is identical. Only schema change:
widen the `letters_template_key_check` constraint to allow the new value.
No RLS change needed — `letters_select`/`insert`/`delete` already key off
the parent claim generically and don't special-case `template_key`.

**Verified**:
- Ran the full `migration.sql` (with the Phase 7 addition) against a
  fresh local Postgres 16 instance — applies cleanly. As the
  `authenticated` role (not superuser) with a real owned claim: inserting
  a `letters` row with `template_key: 'review_summary'` succeeds; an
  invalid template_key is rejected by the check constraint; the original
  3 carrier-letter template keys still insert successfully (no
  regression).
- Mocked-backend Playwright pass on `/claims/:id`: seeded a claim, an
  attached item, an uploaded estimate file, and an added finding: clicking
  **Export Review Summary** triggers a real file download (captured via
  Playwright's `download` event so headless Chromium doesn't hang waiting
  on a save dialog), confirmed to start with the `%PDF-` header and be a
  non-trivial size (~6.7KB for this seed data, not an empty/broken file),
  named `Review Summary - {claim number}.pdf`; a `POST /rest/v1/letters`
  fires with the new template_key; the "downloaded and saved" confirmation
  renders. Zero console errors. Full build + lint clean, no new warnings
  beyond the pre-existing baseline.

## Verifying usage analytics + customer feedback (Estimate Review Phase 9, completing it)

Finishes Phase 9. The admin analysis-run visibility (see the "Phase 9,
partial" section above) covered two of the ADMIN section's 8 bullet
points ("View system errors", "View analysis failures"); this closes the
remaining two — "View anonymous aggregate usage" and "View customer
feedback" — plus the entire separate ANALYTICS section, which names the
product's single most important metric explicitly: "Percentage of trial
users who successfully complete their first estimate review."

**Usage analytics** (`analytics_events` table, `/admin/usage`): of the
spec's 11 named events, 4 are intentionally *not* separate rows —
`first_review_started`, `analysis_started`, `analysis_completed`, and
`documentation_generated` are all fully reconstructable from existing
tables (`claims`, `analysis_runs`, `letters`) with zero risk of an event
log drifting from its own source of truth. The other 7 (`signup`,
`trial_started`, `subscription_started`, `subscription_canceled`,
`estimate_uploaded`, `photos_uploaded`, `findings_added`) are point-in-time
transitions with no standing record anywhere else, so those get real
rows — written by the `handle_new_user()` trigger (signup) and the Stripe
webhook function (the 3 subscription-lifecycle events, comparing prior vs.
new status so a transition is logged exactly once, not once per unrelated
webhook delivery), or fire-and-forget client-side calls at the 3 remaining
action points (uploading an estimate/photo, adding a finding to a review).
`/admin/usage` computes trial→first-review rate, trial→paid conversion,
and reviews-per-paying-customer from these rows plus `profiles`/`claims`
— simple, honestly-labeled approximations (documented as such on the page
itself) rather than full cohort/event-ordering analysis, appropriate for
a single-operator admin view rather than a growth team's analytics stack.

**Customer feedback** (`feedback` table, `/admin/feedback`, and a
persistent **Feedback** button in the app shell): deliberately just a
free-text box, no rating/NPS/category picker — minimal friction for a
contractor who's mid-job, not a structured survey. Admin can mark an item
reviewed; `AdminHome` gets a matching "Unreviewed feedback" alert tile.

**A real bug this caught**: the first version of `submitFeedback()` did
`.insert(...).select("*").single()` to return the created row. Under RLS,
requesting the row back after an insert (PostgREST's
`Prefer: return=representation`) makes Postgres also check the table's
*SELECT* policies against the new row, not just the INSERT policy —
`feedback_select_admin` only grants that to admin, so every real (non-
admin) customer's feedback submission would have failed with "new row
violates row-level security policy for table feedback", even though the
insert itself was completely legitimate. Caught by testing the exact
client call shape against local Postgres rather than just the schema in
isolation; fixed by dropping `.select()` — the widget never needed the
row back. `analytics_events`' `logEvent()` never had this bug since it
was fire-and-forget from the start (no `.select()` call).

**Verified**: full `migration.sql` re-applied cleanly against a fresh
local Postgres 16 instance. As the `authenticated` role playing a real
non-admin user (not superuser): inserting their own `analytics_events`/
`feedback` row (matching the exact call shape the client code makes, no
`RETURNING`) succeeds; attributing either to someone else's `user_id`
fails RLS; selecting either table back returns zero rows (RLS-filtered,
not an error); updating their own feedback's `status` is blocked
(`feedback_update_admin` requires `is_admin()`); editing their own
feedback's `message` is blocked before RLS even runs (column-level grant
covers only `status`, same least-privilege pattern as the Phase 10
security fixes). As the `authenticated` role playing admin: both tables
fully readable, and marking feedback reviewed — with `RETURNING`, matching
the real `markFeedbackReviewed()` call — succeeds. Also confirmed the
`handle_new_user()` trigger logs a `signup` event automatically for every
new `auth.users` row. Mocked-backend Playwright passes: submitting
feedback from `/dashboard` fires the correct `POST` and shows the
confirmation; `/admin/usage` renders the funnel stats correctly from
seeded events/profiles/claims; `/admin/feedback` lists a seeded item and
"Mark reviewed" fires a `PATCH` touching only the `status` field. A
separate mobile-viewport (375px) pass confirms no horizontal overflow and
that the Feedback button is fully on-screen with a tappable target size,
both before and after opening the modal. Zero console errors throughout.
Full build + lint clean, no new warnings beyond the pre-existing baseline
(one new warning from `AdminUsage.jsx`'s 30-day cutoff — same
`Date.now()`-in-`useMemo` class as `AdminAnalysis.jsx` — fixed the same
way, via lazy `useState` initialization).

**Still not built** (Phase 9's admin scope, deliberately left out):
product-announcement broadcasting beyond the existing monthly-update
email (Phase 7), and deeper subscription management beyond what
Stripe's own Customer Portal already provides — neither is needed to
run the business day-to-day, and adding them now would be scope, not a
gap.

## Mobile/UX audit (Phase 10, completing it)

The product spec's UX section is explicit that "a contractor may be
standing in a truck or job site" and lists concrete mobile requirements
(large buttons, minimal typing, clear progress, sticky primary CTA where
appropriate). The Phase 10 security/RLS audit was done earlier; this pass
covers what was still open — an actual mobile-viewport check, not just
"the CSS uses Tailwind's responsive classes so it's probably fine."

**Method**: every route in the app (21 total — all public pages, the full
authenticated app, every admin page) rendered in a real headless browser
at 375×800 (a standard phone width) against a mocked backend, checking
for horizontal page overflow and console errors, plus a full-page
screenshot of each for visual review.

**A real bug this caught**: the Feedback button (new in Phase 9, just
above) was originally a `fixed bottom-5 right-5` floating pill, the
common "chat bubble" pattern. At 375px it looked fine — but ClaimDetail
has its own `sticky bottom-0` bar (the running total + Export Review
Summary + Generate letter buttons), and at 320px (iPhone SE width) that
bar's buttons wrap to a taller stack, growing to 219px tall and pushing
Generate letter directly into the fixed button's footprint — measured
overlap, not just a visual hunch (`{x: 183–300, y: 634–680}` for
Feedback vs. `{x: 20–207, y: 592–640}` for Generate letter). A global
`fixed` corner element and a page's own `sticky` bottom CTA bar will
always risk this on *some* page at *some* width, since AppLayout (where
Feedback lives) can't know what any given page puts at its own bottom
edge. Fixed by moving Feedback out of the floating corner entirely, into
the header's scrollable nav-pill row (`AppLayout.jsx`) — the same
`overflow-x-auto` row already used for Dashboard/Vault/Reviews/Account,
which never competes with a page's own layout for screen space. Re-ran
the same 320px measurement after the fix: no overlap.

**Verified**: after the fix, all 21 routes re-checked with zero
horizontal overflow and zero console errors at 375px; the specific
overlap measurement re-run at 320px confirmed fixed (`false` where it
was `true`); visually reviewed a sample of the full-page screenshots
(landing, dashboard, claim detail, admin pages) — text legible, buttons
full-width and clearly tappable, cards stack cleanly to one column, no
overlapping elements. Full build + lint clean, no new warnings.

**Not done**: this covers layout/overflow/collision at two viewport
widths against a mocked backend — it is not a substitute for someone
actually testing on a real phone with real network conditions, or a
full accessibility pass (contrast ratios, screen reader labels, focus
order weren't audited here).

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
