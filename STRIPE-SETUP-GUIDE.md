# Beeyond — Stripe Setup Guide (Take Payments Online)

Goal: let contractors pay for the **Exclusive Lead ($125)** right on the website,
with the money going straight to your **business bank account** and a notification
buzzing your phone the second someone pays. The **$700/mo Growth Plan** stays a
"Check My Area" apply-first flow (to protect your one-contractor-per-area promise),
and you send those buyers a payment link once you confirm their area is open.

Takes about 10–15 minutes. Do it at your own pace.

---

## Does Stripe cost me anything?

- **No monthly fee. No setup fee. No minimums.**
- Stripe only takes a cut **when you get paid** — about **2.9% + 30¢** per charge.
  - $125 lead → you keep about **$121**
  - $700/mo plan → you keep about **$679** (subscriptions may add ~0.5%)
- **Standard payouts to your bank (2 business days) are FREE.** Don't use "instant
  payout" — it costs ~1.5%.
- Stripe never charges your bank. It only deposits money in (minus its fee).
- Confirm current rates at **stripe.com/pricing**.

---

## Step 1 — Create your Stripe account (~5 min)

1. Go to **stripe.com** and click **Start now** (or **Sign up**).
2. Use your business email (beeyondpro@outlook.com or your Gmail).
3. Set a strong password. Save it somewhere safe.
4. Verify your email when Stripe sends the confirmation.

## Step 2 — Activate payments / add your bank (~5 min)

Stripe needs this so it knows the money is really yours and where to send it.
Have these ready:

- Your legal name (and business name if you have an LLC — "Beeyond" / your company)
- Business address
- The last 4 of your SSN or your EIN (for tax/identity — standard, safe)
- Your **business bank account number + routing number** (this is where payouts land)

Follow Stripe's prompts to enter each. When it asks "what does your business do,"
pick something like **Marketing / advertising services** or **Professional services**.

## Step 3 — Create your two products

In the Stripe Dashboard, go to **Product catalog** (left menu) → **Add product**.

**Product 1 — Exclusive Lead**
- Name: `Exclusive Lead`
- Price: `$125.00`
- Billing: **One-time**
- Save.

**Product 2 — Growth Plan**
- Name: `Growth Plan`
- Price: `$700.00`
- Billing: **Recurring → Monthly**
- Save.

## Step 4 — Get the payment link for the $125 lead

1. Left menu → **Payment Links** → **Create payment link**.
2. Choose the **Exclusive Lead** product.
3. Create it. Stripe gives you a link like `https://buy.stripe.com/xxxxxxxx`.
4. **Copy that link and send it to Frank's assistant (paste it in the chat)** —
   it gets embedded as a "Buy Now" button on the pricing section.

(You'll do the same for the Growth Plan later, but only after we set up the
"Check My Area" gate — so you don't oversell a territory.)

## Step 5 — Turn on notifications (so you know instantly)

1. Download the **Stripe Dashboard** app (App Store / Google Play), sign in.
   It buzzes your phone on every sale.
2. In the web dashboard: **Settings → Business → Notifications** (or search
   "notifications") and make sure **email on successful payment** is ON, sent to
   your business email.

That's it. Every sale → money to your bank in ~2 days → phone + email alert →
you start pulling their leads.

---

## What to send back so the site goes live

Just paste this one thing in the chat:

- ✅ The **Exclusive Lead payment link** (`https://buy.stripe.com/...`)

Then the "Buy Now" button gets built into beeyondpro.com, and the Growth Plan
gets wired to the "Check My Area" flow.

---

## Quick safety notes

- Never share your Stripe **password** or **bank details** with anyone by text or
  email — you only ever paste the **public payment link**, which is safe to share.
- Stripe handles all the card security (PCI compliance). You never touch or store
  a customer's card number. That's the whole point of using them.
