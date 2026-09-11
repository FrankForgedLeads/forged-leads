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
review staying low against the $39/$99 subscriptions. This was the
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

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
