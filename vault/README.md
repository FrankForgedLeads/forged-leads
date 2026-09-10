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

Copy `.env.example` to `.env` and fill in values as later phases wire up
Supabase, Stripe, and Resend. Nothing in Phase 1 requires env vars.

## Build status (phased delivery)

- [x] **Phase 1** — Scaffold, landing page, pricing page, legal pages (this commit)
- [ ] Phase 2 — Supabase auth, migration, seed data
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
    layout/      Nav, Footer, PublicLayout, LegalLayout
    ui/           Button, Card, Logo, Accordion, ScreenshotPlaceholder
    PricingTable.jsx
  lib/
    pricing.js    Plan data (Solo/Crew, monthly/annual)
  pages/
    Landing.jsx
    Pricing.jsx
    Terms.jsx
    Privacy.jsx
    ComingSoon.jsx   Stub for /login and /scope-checker until their phases land
```

## Brand

Dark navy (`#0b1220` background, `#10192e`/`#16223e` cards) with a bee-yellow
accent (`#f5c518`). Defined as Tailwind v4 theme tokens in `src/index.css`.
