# Beeyond Vault — Setup Guide

This is the click-by-click guide to take Beeyond Vault from code to a live
site at **vault.beeyondestimators.com**, taking payments. No coding
required — every step here is clicking around in a dashboard. Budget
**2–3 hours** the first time through, plus another hour or two for the
testing checklist at the end. Do it in order — each section depends on the
one before it.

Free tiers are enough for launch on every service used here.

---

## What you'll need before you start

- A GitHub account with access to this repository
- An email address you'll use as the admin login (this becomes `ADMIN_EMAIL`)
- Access to the Namecheap account that owns `beeyondestimators.com`
- A credit card (Stripe requires one to activate live payments — you won't
  be charged just for setting this up)

Accounts to create (all free to start): **Supabase**, **Stripe**,
**Netlify**, **Resend**.

---

## Step 1 — Supabase (database + login)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **Start your project** →
   sign in with GitHub.
2. **New project**. Name it `beeyond-vault`. Pick a strong database
   password and **save it somewhere** (a password manager) — you won't
   need it often, but you'll need it if you ever connect a SQL client
   directly.
3. Pick the region closest to Florida (e.g. `us-east-1`). Free tier is fine.
4. Wait for the project to finish provisioning (~2 minutes).

### 1.2 Run the database migration

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open `supabase/migration.sql` from this repo, copy the whole file, paste
   it into the query editor.
4. Click **Run**. You should see a series of `CREATE TABLE` / `CREATE
   POLICY` success messages and no red errors. This creates every table,
   the security rules that keep users' data separated, and the admin
   system.

### 1.3 Load the starting Vault content

1. New query again. Open `supabase/seed_items.sql`, copy, paste, **Run**.
2. This loads 74 draft line items into the Vault. **These are drafts** —
   before you tell contractors to trust these prices and code citations,
   go through `supabase/seed_items.sql` (or the Admin → Items screen once
   the app is live) and correct anything that's off for your market. You
   can also do this editing entirely from the Admin panel once the site is
   live, item by item — you don't have to re-run SQL.

### 1.4 Make yourself an admin

New query, run this with **your own email** (the one you'll actually log
into the app with):

```sql
insert into public.admins (email) values ('you@yourdomain.com');
```

This is what makes the **Admin** section of the app appear for your
account and lets you manage items, see leads, and see subscribers. You can
add more admin emails the same way later (e.g. a business partner).

### 1.5 Get your API keys

**Project Settings** (gear icon, bottom of sidebar) → **API**. You'll need
three values, used in Step 4:

- **Project URL** → this is both `VITE_SUPABASE_URL` and `SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_KEY` — this one bypasses all
  security rules. Never put it anywhere with a `VITE_` prefix, never
  commit it, never share it. It only goes into Netlify's server-side
  environment variables (Step 4.3).

### 1.6 Point magic-link auth at Resend (do this after Step 3)

Supabase can send login emails itself, but its **free-tier built-in email
sender is rate-limited to a handful of emails per hour** — fine for
testing, not fine for real signups. Once you've set up Resend (Step 3),
come back here:

1. **Project Settings → Auth → SMTP Settings**.
2. Toggle on **Enable Custom SMTP**.
3. Host: `smtp.resend.com`, Port: `465` (or `587`), Username: `resend`,
   Password: your Resend API key.
4. Sender email: something on your verified domain, e.g.
   `login@beeyondestimators.com`. Sender name: `Beeyond Vault`.
5. Save, then send yourself a test magic link from the live site to
   confirm it arrives.

### 1.7 Set the auth redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://vault.beeyondestimators.com`
- **Redirect URLs**: add `https://vault.beeyondestimators.com/auth/callback`
  (and, while testing, `http://localhost:5173/auth/callback` too)

Without this, magic-link emails will redirect somewhere wrong or get
rejected.

---

## Step 2 — Stripe (billing)

Do this whole section in **Test mode** first (toggle top-right in the
Stripe dashboard). You'll repeat the product/price/webhook parts in
**Live mode** in Step 2.5 once everything works.

### 2.1 Create the products and prices

**Product catalog → Add product**, twice:

**Solo**
- Price 1: $39.99, Recurring, Monthly → copy the price ID (`price_...`)
  → this is `STRIPE_PRICE_SOLO_MONTHLY`
- Add another price on the same product: $390.00, Recurring, Yearly →
  `STRIPE_PRICE_SOLO_YEARLY`

**Crew**
- Price 1: $99.99, Recurring, Monthly → `STRIPE_PRICE_CREW_MONTHLY`
- Price 2: $990.00, Recurring, Yearly → `STRIPE_PRICE_CREW_YEARLY`

Match these exactly to `vault/src/lib/pricing.js`'s `PLANS` — the Pricing
page displays whatever's in that file, but what a customer is actually
*charged* is whichever Stripe Price ID the checkout function points at
(`STRIPE_PRICE_*` env vars, Step 4.3). If the two drift apart, a customer
sees one number and is billed another — always update both together.

Copy all four price IDs somewhere — you'll paste them into Netlify in Step
4.3.

### 2.2 Get your API keys

**Developers → API keys**:
- **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY` (checkout in this
  build redirects to Stripe's hosted page rather than using Stripe.js in
  the browser, so nothing currently reads this key — it's set for parity
  with the spec and in case a future version embeds Stripe Elements
  directly. Not a sign anything's broken if you don't see it referenced.)
- **Secret key** → `STRIPE_SECRET_KEY` (server-only, never in a `VITE_` var)

### 2.3 Create the webhook (do this after Step 4, once you have a live URL)

Once your site is deployed (Step 4) and you know its URL:

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://vault.beeyondestimators.com/.netlify/functions/stripe-webhook`
3. Select these 4 events (only these — the webhook code only handles
   these): `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
4. Save, then click into the new webhook and reveal the **Signing
   secret** → this is `STRIPE_WEBHOOK_SECRET`.
5. Add it to Netlify (Step 4.3) and redeploy.

### 2.4 Test it in test mode

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC,
any ZIP. Run through the full checklist in **Testing Before Going Live**
below using this card before you touch live mode.

### 2.5 Switch to live mode

Once test mode fully works end to end:

1. Toggle Stripe to **Live mode**. Repeat Step 2.1 (products/prices — test
   and live are entirely separate) and Step 2.3 (webhook — same, separate
   endpoint needed) in live mode. You'll get 4 new live price IDs, a new
   live webhook secret, and new live API keys (**Developers → API keys**,
   live versions start with `pk_live_` / `sk_live_`).
2. In Netlify, replace all the Stripe env vars with the live versions
   (Step 4.3) and redeploy.
3. Stripe will also want you to finish **Activate your account** (business
   details, bank account for payouts) before live charges work — do this
   under **Settings → Business settings** if you haven't already.

---

## Step 3 — Resend (email)

1. [resend.com](https://resend.com) → sign up → **Domains → Add Domain**:
   `beeyondestimators.com`.
2. Resend shows you DNS records to add (SPF, DKIM, and usually a
   `send.` subdomain record — exact names shown in Resend's dashboard).
   In **Namecheap → Domain List → Manage → Advanced DNS**, add each record
   Resend shows you exactly as given (type, host, value).
3. Back in Resend, click **Verify** — DNS can take a few minutes to a few
   hours to propagate. Don't move on until it shows verified, or emails
   (leads, monthly updates, team invites, magic-link if you wired Step
   1.6) will silently fail to send from your domain.
4. **API Keys → Create API Key**, full access, name it `beeyond-vault`.
   This is `RESEND_API_KEY`.

The app sends from these addresses — no code change needed, but know
they exist so they don't look like spoofing to anyone checking:
`scope-checker@beeyondestimators.com`, `updates@beeyondestimators.com`,
`invites@beeyondestimators.com`. They don't need individual mailboxes,
just the domain verified.

---

## Step 3B — Anthropic (Estimate Review AI)

This is the one part of the whole stack that isn't free — every "Run Vault
Review" click costs a small amount of real money (fractions of a cent to a
few cents per review with the default model). Everything else in Beeyond
Vault runs on free tiers; this doesn't, so it's worth a quick sanity check
of usage after launch (Anthropic's console shows spend by day).

1. [console.anthropic.com](https://console.anthropic.com) → sign up →
   **Settings → Billing** → add a payment method and set a spending limit
   (start low, e.g. $20/month — you can raise it once you see real usage).
2. **API Keys → Create Key**, name it `beeyond-vault`. This is
   `ANTHROPIC_API_KEY`.
3. Leave `ESTIMATE_ANALYSIS_MODEL` and `ANALYSIS_DAILY_LIMIT` blank in Step
   4.3 unless you want to override their defaults (see `.env.example`) —
   the app runs fine without setting either.

If this key is missing or invalid, "Run Vault Review" fails with a clean
"we couldn't complete this review, your files are safe" message rather
than doing anything silently wrong — nothing else in the app is affected.

---

## Step 4 — Netlify (hosting)

### 4.1 Connect the repo

1. [app.netlify.com](https://app.netlify.com) → sign in with GitHub →
   **Add new site → Import an existing project** → pick this repository.
2. **Important**: this repo's root also hosts the separate
   beeyondpro.com marketing site, so the Vault app lives in a `vault/`
   subfolder. Set:
   - **Base directory**: `vault`
   - **Build command**: `npm run build`
   - **Publish directory**: `vault/dist` (Netlify may auto-fill
     `dist` relative to the base directory — either is fine as long as it
     resolves to `vault/dist`)
   - **Functions directory**: auto-detected from `vault/netlify.toml`
     (`netlify/functions`) — leave as default.
3. Deploy. It'll fail on the first try because env vars aren't set yet —
   that's expected, continue to 4.3.

### 4.2 Set the site name / domain first

**Site configuration → Domain management → Add a custom domain**:
`vault.beeyondestimators.com`. Netlify will show you a DNS target (usually
a CNAME to something like `your-site-name.netlify.app`, or Netlify DNS
records if you delegate DNS to them — this guide assumes you keep DNS at
Namecheap and just add a CNAME, which is simpler and doesn't require
moving your whole domain).

### 4.3 Set every environment variable

**Site configuration → Environment variables → Add a variable**. Add all
of these (values from Steps 1, 2, 3):

| Variable | Value from |
|---|---|
| `VITE_SUPABASE_URL` | Step 1.5 |
| `VITE_SUPABASE_ANON_KEY` | Step 1.5 |
| `SUPABASE_URL` | Step 1.5 (same value as `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_KEY` | Step 1.5 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Step 2.2 |
| `STRIPE_SECRET_KEY` | Step 2.2 |
| `STRIPE_WEBHOOK_SECRET` | Step 2.3 (add once you have it — see note below) |
| `STRIPE_PRICE_SOLO_MONTHLY` | Step 2.1 |
| `STRIPE_PRICE_SOLO_YEARLY` | Step 2.1 |
| `STRIPE_PRICE_CREW_MONTHLY` | Step 2.1 |
| `STRIPE_PRICE_CREW_YEARLY` | Step 2.1 |
| `RESEND_API_KEY` | Step 3 |
| `ANTHROPIC_API_KEY` | Step 3B |
| `ADMIN_EMAIL` | Your email (same one from Step 1.4) |
| `LEADS_EMAIL` | `leads@beeyondestimators.com` (or wherever you want leads sent) |

Note the chicken-and-egg with `STRIPE_WEBHOOK_SECRET`: you need a live
Netlify URL to create the Stripe webhook (Step 2.3), but the webhook
secret is itself an env var. Order that works: deploy once without it →
create the webhook pointing at your live URL → add the secret → redeploy.

### 4.4 Redeploy

**Deploys → Trigger deploy → Deploy site** after adding/changing env vars
— Netlify doesn't pick up new variables into an already-running deploy.

---

## Step 5 — DNS (Namecheap)

1. Namecheap → **Domain List** → `beeyondestimators.com` → **Manage** →
   **Advanced DNS**.
2. **Add New Record**: Type `CNAME Record`, Host `vault`, Value = whatever
   Netlify showed you in Step 4.2 (typically `your-site-name.netlify.app`),
   TTL Automatic.
3. Back in Netlify, the domain should show as verified once DNS
   propagates (minutes to a few hours). Netlify auto-provisions an SSL
   certificate once it sees the domain resolving — no action needed, just
   wait if it shows "awaiting certificate."
4. Confirm `https://vault.beeyondestimators.com` loads the landing page.

---

## Testing before going live

Work through this whole list in **Stripe test mode** before flipping
anything to live. Every item here is something the build could only
verify with mocked data, not real Supabase/Stripe/Resend — this is where
that gets checked for real.

- [ ] **Magic-link login**: sign up with a real email, confirm the link
      arrives (check spam first time) and logging in lands on `/dashboard`
- [ ] **Scope Checker lead**: submit the free tool with a test email,
      confirm a row appears in Admin → Leads, and confirm the
      notification email arrives at `LEADS_EMAIL`
- [ ] **Vault search**: search and filter the items you loaded in Step 1.3
- [ ] **Claim + letter**: create a claim, attach a couple of items, adjust
      quantity/pricing, generate a letter, confirm the PDF downloads and
      looks right (company block, item list, total, disclaimer)
- [ ] **Vault Review**: on a claim, upload a real, text-based estimate PDF
      (not a scanned image — see Step 3B), click Run Vault Review, confirm
      it returns findings within a reasonable time (not an error) and that
      "Add to Review" on a finding actually attaches it to the claim;
      separately, upload a scanned/image-only PDF and confirm you get the
      "couldn't read text from your estimate" message, not fabricated
      findings; check console.anthropic.com's usage page shows the calls
- [ ] **Trial signup (Solo)**: from `/subscribe`, start a Solo trial with
      Stripe's `4242 4242 4242 4242` test card — confirm you land back on
      `/dashboard` unlocked (this is the webhook race the app is built to
      handle gracefully; if it hangs on "Activating your subscription"
      for more than ~10 seconds, check the Stripe webhook is configured
      correctly and check its **Developers → Webhooks → [your endpoint] →
      recent deliveries** for errors)
- [ ] **Trial signup (Crew)**: same, but with the Crew plan — then in
      Account, confirm a Team card appears with 1/5 seats used
- [ ] **Team invite**: invite a second real email address to the Crew
      team, confirm the invite email arrives, then sign in as that email
      and confirm it lands with team access already attached (no manual
      step) — this is the part of Phase 7 that could only be tested
      against a real Postgres trigger + real Resend delivery together
- [ ] **Billing portal**: from Account, click Manage Billing, confirm the
      Stripe portal opens and shows the subscription
- [ ] **Cancel + resubscribe**: cancel in the portal, confirm
      `subscription_status` flips to canceled (Admin → Subscribers) and
      the app paywalls again; resubscribe and confirm it reuses the same
      Stripe customer rather than creating a duplicate
- [ ] **Failed payment**: Stripe test card `4000 0000 0000 0341` (attaches
      but fails on charge) to confirm `invoice.payment_failed` flips
      status to `past_due` and the Account page shows the right message
- [ ] **Admin → Items**: edit a price/citation, confirm it shows correctly
      in the Vault; try deleting an item that's attached to a claim and
      confirm you get the friendly error, not a crash
- [ ] **Monthly update**: send a real one to a test subscriber account,
      confirm delivery and that it renders correctly in an inbox (Gmail
      in particular can be picky about HTML email)

Once every box is checked in test mode, do Step 2.5 (switch Stripe to
live) and re-run the **trial signup** and **billing portal** checks one
more time with a real card in live mode before telling anyone the site is
open for business.

---

## Ongoing maintenance

- **New Vault items / price corrections**: Admin → Items, no deploy needed.
- **Code changes**: push to `main` (or whatever branch Netlify is watching)
  and it redeploys automatically.
- **Checking webhook health**: Stripe → Developers → Webhooks → your
  endpoint shows delivery success/failure history — check this if
  something like "a customer paid but the app didn't unlock" ever comes up.
