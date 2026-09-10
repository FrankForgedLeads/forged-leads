# Beeyond Vault — 30-Day Launch Plan

**Goal: 10 paying customers (trial started, card on file) in 30 days.**

Four channels, in priority order: your own network first (highest close
rate, zero cost, fastest feedback), then the Scope Checker as an always-on
lead source, then Facebook contractor groups, then Craigslist as a
low-effort supplement. Don't wait for the site to be "perfect" — the
Testing checklist in SETUP.md is the bar, not a polished marketing site.

**Guardrails for every piece of outreach** (already baked into the site's
copy — keep it that way in anything you write yourself too):
- Never say: *settle, negotiate, maximize your payout, get your claim
  paid, fight the insurance company*.
- Say instead: *document your scope, cite the code, get paid for the work
  you did, stop leaving money on the table*.
- Never mention public adjusting experience or licensing in any pitch —
  Vault is a contractor's documentation tool, not a PA service, and
  blurring that line is a real legal exposure, not just a marketing
  preference.

---

## Week 1 — Your own network (target: 3–4 trials)

This is the highest-leverage week. People who already know and trust you
convert fastest and give you the most honest feedback on what's confusing
or broken.

**Who to contact**: every roofer, restoration contractor, and adjuster in
your phone, past coworkers, GC relationships, anyone you've done business
with. Aim for a list of 20–30 people minimum.

**How**: text or call first, don't lead with email to people you know —
it reads as impersonal. Use the text template below, and only send the
email version to people you're not close enough to text.

### Text template

> Hey [FIRST NAME] — built something for FL roofers/contractors, figured
> you'd want an early look. It's a searchable list of everything adjusters
> commonly leave off estimates — code citation, typical price, why it's
> owed — plus a letter builder so you can document your scope in a couple
> minutes instead of an hour. Free to try for a week, no strings. Worth
> 5 min? vault.beeyondestimators.com

### Email template (for people you know less well)

**Subject:** Built a tool for stuff adjusters leave off estimates

Hi [FIRST NAME],

Quick one — I built a tool called Beeyond Vault for Florida roofers and
restoration contractors. It's a searchable database of the line items
adjusters commonly leave off estimates (drip edge, secondary water
barrier, steep/high charges, code upgrades, the list goes on) — each one
with the Xactimate code, the Florida Building Code citation, and a
typical South Florida price range, so you can document your scope and
cite the code instead of guessing.

It also builds a scope-clarification letter for you in about two minutes
— fill in the claim, pick the items, export a PDF with your company info
on it.

7-day free trial, $39/mo after (or $99/mo for up to 5 users on your
team). Would take you 5 minutes to look at:
vault.beeyondestimators.com

Let me know what you think — genuinely want feedback since it's brand new.

Frank
(954) 546-0839

### What to do with the responses

Every "yes I'll look" gets a same-day follow-up text once they've had the
site open a few minutes: *"What'd you think? Anything confusing or
missing?"* — this is your best source of bug reports and copy fixes in
week 1. Fix what's actually blocking signups before scaling spend of time
into week 2's colder channels.

---

## Week 2 — Facebook contractor groups (target: 2–3 trials)

**Where**: search Facebook for "Florida Roofing Contractors," "Florida
Roofers," "[Your County] Contractors," "Restoration Contractors Florida,"
and similar. Join 5–8 groups. Some have rules against promotional posts —
read the group rules first; some only allow self-promo on specific
days/threads.

**Approach**: don't post a sales pitch as your first move in a group you
just joined — engage genuinely for a few days first (answer a question,
comment on a thread) so you're not a stranger dropping a link. Then post
value-first, not a pitch.

### Group post template

> Made a free tool for anyone doing FL roofing/restoration claims — 12-item
> checklist of stuff adjusters commonly miss, shows you a running total of
> what you might be leaving on the table. No signup needed to try it:
> vault.beeyondestimators.com/scope-checker
>
> (Built a paid version too with the full searchable database + a letter
> builder, but the checklist above is free forever.)

This routes people through the Scope Checker first — lower friction than
asking for a trial signup cold, and it captures their email even if they
don't convert immediately (see Week 3).

**Don't**: post the same message in 8 groups back to back same day — reads
as spam and some groups' admins will remove it and remember your name for
the wrong reason. Spread it out, vary the wording.

---

## Week 3 — Work the Scope Checker leads + Craigslist (target: 2–3 trials)

### Scope Checker follow-up

By week 3 you'll have leads sitting in Admin → Leads from weeks 1–2's
traffic. Work through the uncontacted ones:

1. Check Admin → Leads for anyone not marked contacted.
2. Text first if you have a phone number, using the template below, then
   email as backup.
3. Mark contacted in the Admin panel once you've reached out, so you
   don't double-message anyone.

**Text/email template:**

> Hey [FIRST NAME] — saw you ran the numbers on the Scope Checker
> ([$X ESTIMATED] on the table). That's just 12 common items — the full
> Vault has [N] and a letter builder to document it all. Want the 7-day
> trial link?

### Craigslist

Post in the "Services" or "Skilled Trade Services" category for major FL
metros (Miami, Fort Lauderdale, Tampa, Orlando, Jacksonville) — check each
city's Craigslist for the right category name, they vary slightly.

**Craigslist post:**

> **Title:** Florida roofers/contractors — free tool for stuff adjusters miss on estimates
>
> Built a searchable database of line items adjusters commonly leave off
> Florida property claims — each with the Xactimate code, FBC citation,
> and typical price range. Also builds a scope-clarification letter for
> you in about 2 minutes.
>
> Free 12-item checklist, no signup: vault.beeyondestimators.com/scope-checker
> Full tool: 7-day free trial, $39/mo solo or $99/mo for up to 5 users.
>
> Text [PHONE] with questions.

Craigslist posts expire / get flagged — expect to repost every few days
if you want ongoing visibility. Low effort, low yield, but nearly free —
worth 15 minutes a week, not more.

---

## Week 4 — Push toward 10, fix what's not converting

By now you have real signal on what's working. Do less of what isn't,
more of what is:

- **Re-engage week-1 "maybe later" contacts** — a second, shorter nudge:
  *"Still meaning to check out that Vault tool? Trial's still free for a
  week if you want to poke around: vault.beeyondestimators.com"*
- **Ask your week-1/2 trial users for a referral** — one line: *"Know
  anyone else this'd help? Happy to comp them an extra week if you send
  them my way."*
- **If Scope Checker traffic is decent but conversion to trial is low**,
  that's a signal to revisit the checklist's copy/amounts (Admin doesn't
  edit the Scope Checker's 12 items directly yet — they're in
  `src/lib/scopeChecklist.js` — but you can adjust the lead-follow-up
  message and CTA copy immediately)
- **If trials aren't converting to paid after day 7**, that's a different
  problem — check whether people are actually attaching items to claims
  and generating letters (the core "aha" moment) or just poking at the
  Vault once and leaving

---

## What to track weekly

Keep it simple — a spreadsheet with one row per week is enough:

| Metric | Where to find it |
|---|---|
| Scope Checker submissions | Admin → Leads count |
| Leads contacted | Admin → Leads, contacted vs. not |
| Trials started | Admin → Subscribers, status = trialing, count new this week |
| Trials converted to paid | Admin → Subscribers, status = active |
| Trials that churned (canceled before converting) | Admin → Subscribers, status = canceled |
| Solo vs. Crew split | Admin → Subscribers, plan column |
| Outreach sent (texts/emails/posts) | Your own count — track what you actually sent, not just results |

**The one number that matters most by day 30**: trials-to-paid conversion
rate. If you got 15 trials and only 2 converted, the problem isn't
top-of-funnel volume — it's something in the product or the trial
experience. If you only got 6 trials total, the problem is
distribution/outreach volume, not the product. Don't optimize the wrong
end.

---

## After day 30

If you're at or near 10 paying customers: keep doing what worked, and
start thinking about Phase 2 features customers are actually asking for
(the codebase's phase-by-phase README notes in each area — Vault, Claims,
Letters — call out what's intentionally deferred, like team invite polish
or a richer admin item editor, as a starting list).

If you're well under 10: don't panic-add features. Talk to the people who
tried it and didn't convert — five real conversations will tell you more
than another week of building.
